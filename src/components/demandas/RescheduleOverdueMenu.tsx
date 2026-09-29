"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock } from "lucide-react";
import { formatDueDateLabel, toISODate } from "@/lib/dueDate";
import type { Demand } from "@/types/demandas";
import { useConfirm } from "@/components/ConfirmProvider";
import { CalendarPopover } from "@/components/ui/DatePicker";
import { useDemandas } from "./DemandasProvider";

type Preset = "hoje" | "amanha" | "proxima_semana";

const PRESET_LABEL: Record<Preset, string> = {
  hoje: "hoje",
  amanha: "amanhã",
  proxima_semana: "próxima semana",
};

/** Demandas abertas com prazo anterior a hoje (data local). */
export function openOverdueDemands(demands: Demand[], now: Date = new Date()): Demand[] {
  const today = toISODate(now);
  return demands.filter(
    (demand) =>
      demand.status_category !== "fechado" &&
      !!demand.due_date &&
      demand.due_date < today,
  );
}

/**
 * Próxima segunda-feira. Se hoje já é segunda, cai na segunda seguinte.
 * Mesmo cálculo de `nextMondayDate` na barra de ações em lote.
 */
export function nextMondayISO(now: Date = new Date()): string {
  const date = new Date(now);
  const day = date.getDay();
  const diff = date.getDate() + ((day === 0 ? 1 : 8) - day);
  date.setDate(diff);
  return toISODate(date);
}

export function reschedulePresetDate(preset: Preset, now: Date = new Date()): string {
  if (preset === "hoje") return toISODate(now);
  if (preset === "amanha") {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return toISODate(date);
  }
  return nextMondayISO(now);
}

function confirmMessage(count: number, when: string): string {
  const noun = count === 1 ? "demanda atrasada" : "demandas atrasadas";
  return `Reagendar ${count} ${noun} para ${when}?`;
}

interface Props {
  demands: Demand[];
  /** `button` no grupo Atrasadas; `count` no contador do título. */
  variant: "button" | "count";
}

export default function RescheduleOverdueMenu({ demands, variant }: Props) {
  const { batchUpdateDemands } = useDemandas();
  const { confirm } = useConfirm();
  const targets = openOverdueDemands(demands);

  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const triggerBox = trigger.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const x = Math.max(12, Math.min(triggerBox.left, window.innerWidth - menuBox.width - 12));
    let y = triggerBox.bottom + 6;
    if (y + menuBox.height > window.innerHeight - 12) {
      y = Math.max(12, triggerBox.top - menuBox.height - 6);
    }
    setCoords({ x, y });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setDateOpen(false);
      setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || dateOpen) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, dateOpen]);

  if (targets.length === 0) return null;

  const apply = async (date: string, when: string) => {
    const ids = targets.map((demand) => demand.id);
    setOpen(false);
    setDateOpen(false);
    const ok = await confirm({
      title: "Reagendar atrasadas",
      message: confirmMessage(ids.length, when),
      confirmText: "Reagendar",
    });
    if (!ok) return;
    await batchUpdateDemands(ids, { due_date: date });
  };

  const countLabel = `${targets.length} atrasada${targets.length > 1 ? "s" : ""}`;

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="context-menu"
            role="menu"
            style={{
              top: coords?.y ?? 0,
              left: coords?.x ?? 0,
              visibility: coords ? "visible" : "hidden",
              minWidth: 200,
            }}
          >
            {(["hoje", "amanha", "proxima_semana"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                role="menuitem"
                className="context-menu-item"
                onClick={() => apply(reschedulePresetDate(preset), PRESET_LABEL[preset])}
              >
                <CalendarClock size={16} />
                <span>
                  {preset === "hoje" ? "Hoje" : preset === "amanha" ? "Amanhã" : "Próxima semana"}
                </span>
              </button>
            ))}
            <div className="context-menu-separator" />
            <button
              ref={dateBtnRef}
              type="button"
              role="menuitem"
              className="context-menu-item"
              onClick={() => setDateOpen((current) => !current)}
            >
              <CalendarClock size={16} />
              <span>Escolher data...</span>
            </button>
            <CalendarPopover
              open={dateOpen}
              onClose={() => setDateOpen(false)}
              anchorEl={dateBtnRef.current}
              value={null}
              onSelect={(date) => {
                if (!date) return;
                void apply(date, formatDueDateLabel(date).label.toLowerCase());
              }}
              title="Reagendar atrasadas"
              withTime={false}
              clearable={false}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {variant === "count" && (
        <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>{" · "}</span>
      )}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Reagendar demandas atrasadas"
        onClick={(event) => {
          event.stopPropagation();
          setDateOpen(false);
          setOpen((current) => !current);
        }}
        style={
          variant === "count"
            ? {
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontSize: "inherit",
                fontWeight: 600,
                color: "var(--color-danger)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }
            : {
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 22,
                padding: "0 8px",
                borderRadius: 6,
                border: "1px solid color-mix(in oklab, var(--color-danger) 35%, transparent)",
                background: open
                  ? "color-mix(in oklab, var(--color-danger) 16%, transparent)"
                  : "color-mix(in oklab, var(--color-danger) 8%, transparent)",
                color: "var(--color-danger)",
                fontSize: "0.68rem",
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
              }
        }
      >
        {variant === "count" ? (
          countLabel
        ) : (
          <>
            <CalendarClock size={12} />
            Reagendar
          </>
        )}
      </button>
      {menu}
    </>
  );
}
