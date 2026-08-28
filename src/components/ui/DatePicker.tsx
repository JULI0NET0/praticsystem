"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { fromISODate, startOfDay, toISODate } from "@/lib/dueDate";
export { TimePickerPopover, default as TimePicker, type TimePickerProps, type TimePickerPopoverProps } from "./TimePicker";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null, time?: string | null) => void;
  timeValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  withTime?: boolean;
  title?: string;
  renderTrigger?: (props: { value: string | null; open: boolean; label: string }) => ReactNode;
}

export interface CalendarPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  value: string | null;
  timeValue?: string | null;
  onSelect: (newDate: string | null, newTime?: string | null) => void;
  title?: string;
  withTime?: boolean;
  clearable?: boolean;
}

export function CalendarPopover({
  open,
  onClose,
  anchorEl,
  value,
  timeValue,
  onSelect,
  title = "Selecionar Data",
  withTime = true,
  clearable = true,
}: CalendarPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayISO = useMemo(() => toISODate(today), [today]);

  const tomorrowISO = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, [today]);

  const nextWeekISO = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return toISODate(d);
  }, [today]);

  const initialDate = useMemo(() => {
    if (value) {
      const parsed = fromISODate(value);
      if (parsed) return parsed;
    }
    return today;
  }, [value, today]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());
  const [selectedTime, setSelectedTime] = useState<string>(timeValue?.slice(0, 5) ?? "");
  const [showTimePicker, setShowTimePicker] = useState<boolean>(!!timeValue);

  useEffect(() => {
    if (open) {
      const base = value ? fromISODate(value) || today : today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setSelectedTime(timeValue?.slice(0, 5) ?? "");
      setShowTimePicker(!!timeValue);
    }
  }, [open, value, timeValue, today]);

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const panel = panelRef.current;
    if (!panel) return;

    let active = true;
    const place = () => {
      computePosition(anchorEl, panel, {
        placement: "bottom-start",
        middleware: [
          offset(8),
          flip({ fallbackPlacements: ["top-start", "bottom-end", "top-end", "right-start", "left-start"] }),
          shift({ padding: 12 }),
        ],
      }).then(({ x, y }) => {
        if (!active) return;
        Object.assign(panel.style, {
          left: `${Math.round(x)}px`,
          top: `${Math.round(y)}px`,
        });
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      active = false;
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorEl?.contains(target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, anchorEl, onClose]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: {
      dateISO: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNumber = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNumber);
      const iso = toISODate(prevDate);
      days.push({
        dateISO: iso,
        dayNumber,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === value,
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      const iso = toISODate(curDate);
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isSelected: iso === value,
      });
    }

    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingDays = totalCells - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const iso = toISODate(nextDate);
      days.push({
        dateISO: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === value,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayISO, value]);

  const handleSelectDate = (dateISO: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelect(dateISO, dateISO ? (selectedTime || null) : null);
    onClose();
  };

  const handleApplyTime = (time: string, e?: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    e?.stopPropagation();
    setSelectedTime(time);
    if (value) {
      onSelect(value, time || null);
    }
  };

  const isViewingCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id={popoverId}
          initial={{ opacity: 0, scale: 0.94, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            zIndex: 9999,
            width: 296,
            background: "var(--color-surface-raised)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow:
              "0 20px 48px -6px rgba(0, 0, 0, 0.35), 0 0 0 1px color-mix(in oklab, var(--border) 60%, transparent)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            userSelect: "none",
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 8,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarIcon size={15} color="var(--accent)" />
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: 0,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-sunken)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Atalhos Rápidos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              type="button"
              onClick={(e) => handleSelectDate(todayISO, e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === todayISO ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === todayISO
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === todayISO ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Zap size={13} color="var(--accent)" />
              <span>Hoje</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectDate(tomorrowISO, e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === tomorrowISO ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === tomorrowISO
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === tomorrowISO ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Sun size={13} color="var(--color-warning)" />
              <span>Amanhã</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectDate(nextWeekISO, e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === nextWeekISO ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === nextWeekISO
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === nextWeekISO ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <CalendarIcon size={13} color="var(--color-info)" />
              <span>Próx. semana</span>
            </button>

            {clearable && (
              <button
                type="button"
                onClick={(e) => handleSelectDate(null, e)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: !value ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: !value
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                  color: !value ? "var(--accent)" : "var(--text-tertiary)",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <X size={13} color="var(--text-tertiary)" />
                <span>Sem data</span>
              </button>
            )}
          </div>

          {/* Navegador de Mês */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 2px 2px 2px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  onClick={goToToday}
                  style={{
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    background: "var(--color-surface-sunken)",
                    color: "var(--accent)",
                    cursor: "pointer",
                  }}
                  title="Voltar para o mês atual"
                >
                  Hoje
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--color-surface-sunken)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--color-surface-sunken)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
              textAlign: "center",
            }}
          >
            {WEEKDAY_NAMES.map((name, i) => (
              <div
                key={name + i}
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: i === 0 || i === 6 ? "var(--text-tertiary)" : "var(--text-secondary)",
                  padding: "4px 0",
                }}
              >
                {name}
              </div>
            ))}

            {calendarDays.map((cell) => {
              const isSelected = cell.isSelected;
              const isToday = cell.isToday;
              const isCurrent = cell.isCurrentMonth;

              return (
                <button
                  key={cell.dateISO + cell.dayNumber}
                  type="button"
                  onClick={(e) => handleSelectDate(cell.dateISO, e)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    height: 32,
                    borderRadius: 8,
                    border: isSelected
                      ? "1px solid var(--accent)"
                      : isToday
                      ? "1px solid color-mix(in oklab, var(--accent) 50%, transparent)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "var(--accent)"
                      : isToday
                      ? "color-mix(in oklab, var(--accent) 12%, transparent)"
                      : "transparent",
                    color: isSelected
                      ? "var(--color-text-on-accent, #ffffff)"
                      : isCurrent
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    fontSize: "0.76rem",
                    fontWeight: isSelected || isToday ? 700 : isCurrent ? 500 : 400,
                    opacity: isCurrent ? 1 : 0.4,
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {cell.dayNumber}
                  {isToday && !isSelected && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 3,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "var(--accent)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Horário */}
          {withTime && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTimePicker((prev) => !prev);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: selectedTime ? "var(--accent)" : "var(--text-secondary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Clock size={13} />
                  <span>{selectedTime ? `Horário: ${selectedTime}` : "Definir horário (opcional)"}</span>
                </button>

                {selectedTime && (
                  <button
                    type="button"
                    onClick={(e) => handleApplyTime("", e)}
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-tertiary)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Limpar hora
                  </button>
                )}
              </div>

              {showTimePicker && (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, paddingTop: 2 }}>
                  {["08:00", "09:00", "10:00", "14:00", "16:00", "18:00", "20:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={(e) => handleApplyTime(t, e)}
                      style={{
                        flex: "1 0 auto",
                        padding: "5px 6px",
                        borderRadius: 6,
                        border: selectedTime === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: selectedTime === t ? "color-mix(in oklab, var(--accent) 15%, transparent)" : "var(--color-surface-sunken)",
                        color: selectedTime === t ? "var(--accent)" : "var(--text-primary)",
                        fontSize: "0.72rem",
                        fontWeight: selectedTime === t ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function DatePicker({
  value,
  onChange,
  timeValue,
  placeholder = "Selecionar data",
  disabled = false,
  clearable = true,
  withTime = true,
  title,
  renderTrigger,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const formattedLabel = useMemo(() => {
    if (!value) return placeholder;
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}${timeValue ? ` às ${timeValue.slice(0, 5)}` : ""}`;
    }
    return value;
  }, [value, timeValue, placeholder]);

  return (
    <>
      {renderTrigger ? (
        <div
          ref={triggerRef as any}
          onClick={(e) => {
            if (disabled) return;
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          {renderTrigger({ value, open, label: formattedLabel })}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            border: open ? "1px solid var(--accent)" : "1px solid var(--border)",
            background: "var(--color-surface-sunken)",
            color: value ? "var(--text-primary)" : "var(--text-tertiary)",
            fontSize: "0.78rem",
            fontWeight: 500,
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
            transition: "all 0.15s",
          }}
        >
          <CalendarIcon size={14} color="var(--accent)" />
          <span>{formattedLabel}</span>
        </button>
      )}

      <CalendarPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={triggerRef.current}
        value={value}
        timeValue={timeValue}
        onSelect={(newDate, newTime) => onChange(newDate, newTime)}
        title={title}
        withTime={withTime}
        clearable={clearable}
      />
    </>
  );
}
