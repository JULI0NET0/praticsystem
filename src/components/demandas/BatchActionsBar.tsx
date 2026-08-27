"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, RotateCcw, Calendar, Flag, Trash2,
  ChevronDown, SlidersHorizontal, CheckSquare, Tag, Users,
  MapPin, ClipboardList
} from "lucide-react";
import { toISODate } from "@/lib/dueDate";
import { PRIORITY_COLORS, type DemandPriority, type AgendaSubject } from "@/types/demandas";
import { DEMAND_AGENDA_SUBJECTS } from "@/lib/agendaCategories";
import { useDemandas } from "./DemandasProvider";
import { CalendarPopover } from "@/components/ui/DatePicker";
import { WhatsAppIcon } from "@/components/SocialIcons";

interface Props {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onSelectAll: () => void;
  totalVisible: number;
  onOpenWhatsApp?: () => void;
}

export default function BatchActionsBar({
  selectedIds,
  onClearSelection,
  onSelectAll,
  totalVisible,
  onOpenWhatsApp,
}: Props) {
  const { statuses, batchMoveDemands, batchUpdateDemands, batchDeleteDemands, batchToggleComplete } = useDemandas();
  
  const [openMenu, setOpenMenu] = useState<"status" | "due" | "priority" | "subject" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dueButtonRef = useRef<HTMLButtonElement>(null);

  const selectedCount = selectedIds.size;
  const isAllSelected = selectedCount === totalVisible && totalVisible > 0;
  const idsArray = Array.from(selectedIds);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  const handleSetStatus = async (statusId: string) => {
    setOpenMenu(null);
    await batchMoveDemands(idsArray, statusId);
  };

  const handleSetDue = async (date: string | null) => {
    setOpenMenu(null);
    await batchUpdateDemands(idsArray, { due_date: date, due_time: date ? undefined : null });
  };

  const handleSetPriority = async (priority: DemandPriority) => {
    setOpenMenu(null);
    await batchUpdateDemands(idsArray, { priority });
  };

  const handleSetSubject = async (subject: AgendaSubject | null) => {
    setOpenMenu(null);
    await batchUpdateDemands(idsArray, { agenda_subject: subject });
  };

  const handleToggleDone = async (done: boolean) => {
    await batchToggleComplete(idsArray, done);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await batchDeleteDemands(idsArray);
    onClearSelection();
    setConfirmDelete(false);
  };

  const nextMondayDate = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + ((day === 0 ? 1 : 8) - day);
    d.setDate(diff);
    return toISODate(d);
  };

  const tomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  };

  return (
    <AnimatePresence>
      <div
        className="batch-actions-floating-wrap"
        style={{
          position: "fixed",
          bottom: 24,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <motion.div
          ref={containerRef}
          className="batch-actions-inner"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "18px",
            background: "var(--color-surface-raised)",
            border: "1px solid var(--border)",
            boxShadow: "0 18px 45px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.2)",
            backdropFilter: "blur(16px)",
            maxWidth: "calc(100vw - 32px)",
            flexWrap: "wrap",
          }}
        >
          {/* Contador e Selecionar Tudo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 6, borderRight: "1px solid var(--border)" }}>
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--color-text-on-accent)",
              backgroundColor: "var(--accent)",
              padding: "3px 9px",
              borderRadius: "10px",
            }}
          >
            {selectedCount}
          </span>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {selectedCount === 1 ? "selecionada" : "selecionadas"}
          </span>

          {!isAllSelected && (
            <button
              type="button"
              onClick={onSelectAll}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Atalho: ⌘+A"
            >
              <CheckSquare size={13} /> Todas ({totalVisible})
            </button>
          )}
        </div>

        {/* Botão Status */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
            style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32 }}
          >
            <SlidersHorizontal size={13} /> Status <ChevronDown size={11} />
          </button>

          {openMenu === "status" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                width: 190,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: 6,
                boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", padding: "4px 8px", textTransform: "uppercase" }}>
                Mover para status
              </span>
              {statuses.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSetStatus(st.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-sunken)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botão Reagendar Prazo */}
        <div style={{ position: "relative" }}>
          <button
            ref={dueButtonRef}
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpenMenu(openMenu === "due" ? null : "due")}
            style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32 }}
          >
            <Calendar size={13} /> Reagendar <ChevronDown size={11} />
          </button>

          <CalendarPopover
            open={openMenu === "due"}
            onClose={() => setOpenMenu(null)}
            anchorEl={dueButtonRef.current}
            value={null}
            onSelect={(d) => {
              handleSetDue(d);
            }}
            title="Reagendar em Lote"
            withTime={false}
          />
        </div>

        {/* Botão Prioridade */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
            style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32 }}
          >
            <Flag size={13} /> Prioridade <ChevronDown size={11} />
          </button>

          {openMenu === "priority" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                width: 170,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: 6,
                boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                zIndex: 10,
              }}
            >
              {(["urgent", "high", "medium", "low", "none"] as DemandPriority[]).map((p) => {
                const label = p === "urgent" ? "P1 • Urgente" : p === "high" ? "P2 • Alta" : p === "medium" ? "P3 • Média" : p === "low" ? "P4 • Baixa" : "Sem prioridade";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSetPriority(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "8px",
                      background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textAlign: "left"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-sunken)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Flag size={13} color={PRIORITY_COLORS[p]} fill={p === "none" ? "transparent" : PRIORITY_COLORS[p]} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão Assunto na Agenda */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpenMenu(openMenu === "subject" ? null : "subject")}
            style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32 }}
          >
            <Tag size={13} /> Assunto <ChevronDown size={11} />
          </button>

          {openMenu === "subject" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                width: 210,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: 6,
                boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", padding: "4px 8px", textTransform: "uppercase" }}>
                Assunto na Agenda
              </span>
              <button
                type="button"
                onClick={() => handleSetSubject(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "8px",
                  background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textAlign: "left"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-sunken)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Calendar size={13} />
                <span>Não aparece na agenda</span>
              </button>

              {DEMAND_AGENDA_SUBJECTS.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSetSubject(cat.id as AgendaSubject)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "8px",
                      background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textAlign: "left"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-sunken)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Icon size={13} color={cat.color} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* WhatsApp Export */}
        {onOpenWhatsApp && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenWhatsApp}
            style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32, color: "#25D366", borderColor: "rgba(37, 211, 102, 0.3)" }}
            title="Copiar resumo formatado para WhatsApp"
          >
            <WhatsAppIcon size={14} style={{ color: "#25D366" }} /> WhatsApp
          </button>
        )}

        {/* Concluir / Reabrir */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleToggleDone(true)}
          style={{ padding: "6px 10px", fontSize: "0.78rem", height: 32 }}
          title="Concluir selecionadas"
        >
          <CheckCircle2 size={14} color="var(--accent)" /> Concluir
        </button>

        {/* Excluir em Lote */}
        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            fontSize: "0.78rem",
            height: 32,
            borderRadius: "9px",
            border: confirmDelete ? "1px solid var(--color-danger)" : "1px solid transparent",
            backgroundColor: confirmDelete ? "var(--color-danger)" : "transparent",
            color: confirmDelete ? "white" : "var(--color-danger)",
            cursor: "pointer",
            fontWeight: 600,
            transition: "all 0.15s",
          }}
          title={confirmDelete ? "Clique novamente para confirmar a exclusão" : "Excluir demandas selecionadas"}
        >
          <Trash2 size={13} />
          {confirmDelete ? "Confirmar exclusão?" : "Excluir"}
        </button>

        {/* Desmarcar / Fechar */}
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--border)",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            marginLeft: 4,
          }}
          title="Desmarcar tudo (Esc)"
        >
          <X size={14} />
        </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
