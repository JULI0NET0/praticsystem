"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  Flag,
  Hash,
  Link as LinkIcon,
  Maximize2,
  Trash2,
} from "lucide-react";
import { toISODate } from "@/lib/dueDate";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_SHORT,
  type Demand,
  type DemandPriority,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/CustomToast";
import { CalendarPopover, TimePickerPopover } from "@/components/ui/DatePicker";

const PRIORITIES: DemandPriority[] = ["urgent", "high", "medium", "low", "none"];

type Panel = "root" | "reagendar" | "prioridade" | "status";

export interface ContextMenuAnchor {
  demandId: string;
  x: number;
  y: number;
  selectedText?: string;
}

/** Estado do menu + handler pronto para o onContextMenu da linha/card. */
export function useDemandContextMenu() {
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null);

  const openFor = (demandId: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    // Impede que o ContextMenu global da aplicação (tema, recarregar)
    // abra junto — ele escuta 'contextmenu' no document.
    event.stopPropagation();
    const selectedText = window.getSelection()?.toString().trim() || "";
    setAnchor({ demandId, x: event.clientX, y: event.clientY, selectedText });
  };

  return { anchor, openFor, close: () => setAnchor(null) };
}

interface Props {
  anchor: ContextMenuAnchor;
  onClose: () => void;
  onOpenDetails: (demandId: string) => void;
  /** Avisa a lista para segurar a linha durante a animação de conclusão. */
  onToggleStart?: (demandId: string) => void;
}

export default function DemandContextMenu({
  anchor,
  onClose,
  onOpenDetails,
  onToggleStart,
}: Props) {
  const { getDemand, statuses, updateDemand, deleteDemand, toggleComplete } = useDemandas();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [panel, setPanel] = useState<Panel>("root");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: anchor.x, y: anchor.y });

  const demand: Demand | undefined = getDemand(anchor.demandId);

  const copyToClipboard = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(msg, "success");
      onClose();
    } catch {
      showToast("Erro ao copiar para a área de transferência.", "error");
    }
  };

  // Mantém o menu dentro da viewport
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    setPosition({
      x: Math.min(anchor.x, window.innerWidth - width - 12),
      y: Math.min(anchor.y, window.innerHeight - height - 12),
    });
  }, [anchor.x, anchor.y, panel]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  if (!demand || typeof document === "undefined") return null;

  const done = demand.status_category === "fechado";

  const apply = (patch: Partial<Demand>) => {
    updateDemand(demand.id, patch);
    onClose();
  };

  const shiftDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    apply({ due_date: toISODate(date) });
  };

  const back = (
    <button className="context-menu-item" onClick={() => setPanel("root")}>
      <ChevronLeft size={16} />
      <span>Voltar</span>
    </button>
  );

  return createPortal(
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      className="context-menu"
      style={{ top: position.y, left: position.x, transformOrigin: "top left", minWidth: 232 }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {panel === "root" && (
        <>
          {anchor.selectedText && (
            <>
              <button
                className="context-menu-item"
                onClick={() => copyToClipboard(anchor.selectedText!, "Texto copiado!")}
              >
                <Copy size={16} />
                <span>Copiar texto</span>
              </button>
              <div className="context-menu-separator" />
            </>
          )}

          <button className="context-menu-item" onClick={() => { onOpenDetails(demand.id); onClose(); }}>
            <Maximize2 size={16} />
            <span>Abrir detalhes</span>
          </button>

          <button
            className="context-menu-item"
            onClick={() => {
              onToggleStart?.(demand.id);
              toggleComplete(demand.id);
              onClose();
            }}
          >
            <Check size={16} />
            <span>{done ? "Reabrir" : "Concluir"}</span>
          </button>

          <div className="context-menu-separator" />

          <button className="context-menu-item" onClick={() => setPanel("reagendar")}>
            <CalendarClock size={16} />
            <span>Reagendar</span>
            <ChevronRight size={14} className="context-menu-more" />
          </button>

          <button className="context-menu-item" onClick={() => setPanel("prioridade")}>
            <Flag size={16} />
            <span>Prioridade</span>
            <span className="context-menu-shortcut">{PRIORITY_SHORT[demand.priority]}</span>
            <ChevronRight size={14} className="context-menu-more" />
          </button>

          <button className="context-menu-item" onClick={() => setPanel("status")}>
            <CircleDot size={16} />
            <span>Status</span>
            <ChevronRight size={14} className="context-menu-more" />
          </button>

          <div className="context-menu-separator" />

          <button
            className="context-menu-item"
            onClick={() => copyToClipboard(demand.id, "ID da demanda copiado!")}
          >
            <Hash size={16} />
            <span>Copiar ID</span>
            <span className="context-menu-shortcut">#{demand.id.slice(0, 6)}</span>
          </button>

          <button
            className="context-menu-item"
            onClick={() => copyToClipboard(demand.title, "Título copiado!")}
          >
            <Copy size={16} />
            <span>Copiar título</span>
          </button>

          <button
            className="context-menu-item"
            onClick={() => {
              const url = `${window.location.origin}/demandas?id=${demand.id}`;
              copyToClipboard(url, "Link da demanda copiado!");
            }}
          >
            <LinkIcon size={16} />
            <span>Copiar link</span>
          </button>

          <div className="context-menu-separator" />

          <button
            className="context-menu-item context-menu-item-danger"
            onClick={async () => {
              onClose();
              const ok = await confirm({
                title: "Excluir demanda",
                message: `Excluir a demanda "${demand.title}"?`,
                variant: "danger",
                confirmText: "Excluir",
              });
              if (ok) {
                deleteDemand(demand.id);
              }
            }}
          >
            <Trash2 size={16} />
            <span>Excluir</span>
          </button>
        </>
      )}

      {panel === "reagendar" && (
        <>
          {back}
          <div className="context-menu-separator" />
          <button className="context-menu-item" onClick={() => shiftDays(0)}>
            <CalendarClock size={16} />
            <span>Hoje</span>
          </button>
          <button className="context-menu-item" onClick={() => shiftDays(1)}>
            <CalendarClock size={16} />
            <span>Amanhã</span>
          </button>
          <button className="context-menu-item" onClick={() => shiftDays(7)}>
            <CalendarClock size={16} />
            <span>Próxima semana</span>
          </button>
          <div className="context-menu-separator" />
          <button
            ref={dateBtnRef}
            type="button"
            className="context-menu-item"
            onClick={() => setDatePopoverOpen((prev) => !prev)}
          >
            <CalendarClock size={16} />
            <span>{demand.due_date ? `Data: ${demand.due_date.split("-").reverse().join("/")}` : "Escolher data..."}</span>
          </button>
          <CalendarPopover
            open={datePopoverOpen}
            onClose={() => setDatePopoverOpen(false)}
            anchorEl={dateBtnRef.current}
            value={demand.due_date ?? null}
            onSelect={(d) => {
              apply({ due_date: d });
              setDatePopoverOpen(false);
            }}
            title="Escolher Data"
            withTime={false}
          />

          <button
            ref={timeBtnRef}
            type="button"
            className="context-menu-item"
            onClick={() => setTimePopoverOpen((prev) => !prev)}
          >
            <CalendarClock size={16} />
            <span>{demand.due_time ? `Hora: ${demand.due_time.slice(0, 5)}` : "Definir horário..."}</span>
          </button>
          <TimePickerPopover
            open={timePopoverOpen}
            onClose={() => setTimePopoverOpen(false)}
            anchorEl={timeBtnRef.current}
            value={demand.due_time?.slice(0, 5) ?? null}
            onChange={(t) => {
              apply({ due_time: t });
              setTimePopoverOpen(false);
            }}
            title="Definir Horário"
          />

          <div className="context-menu-separator" />
          <button
            className="context-menu-item"
            onClick={() => apply({ due_date: null, due_time: null })}
          >
            <CalendarX size={16} />
            <span>Sem prazo</span>
          </button>
        </>
      )}

      {panel === "prioridade" && (
        <>
          {back}
          <div className="context-menu-separator" />
          {PRIORITIES.map((priority) => (
            <button
              key={priority}
              className="context-menu-item"
              onClick={() => apply({ priority })}
            >
              <Flag
                size={16}
                color={PRIORITY_COLORS[priority]}
                fill={priority === "none" ? "none" : PRIORITY_COLORS[priority]}
              />
              <span>{PRIORITY_LABELS[priority]}</span>
              <span className="context-menu-shortcut">{PRIORITY_SHORT[priority]}</span>
              {demand.priority === priority && <Check size={14} className="context-menu-more" />}
            </button>
          ))}
        </>
      )}

      {panel === "status" && (
        <>
          {back}
          <div className="context-menu-separator" />
          {statuses.map((status) => (
            <button
              key={status.id}
              className="context-menu-item"
              onClick={() => apply({ status: status.id })}
            >
              <span
                className="combobox-dot"
                style={{ background: status.color, width: 9, height: 9 }}
              />
              <span>{status.label}</span>
              {demand.status === status.id && <Check size={14} className="context-menu-more" />}
            </button>
          ))}
        </>
      )}
    </motion.div>,
    document.body,
  );
}
