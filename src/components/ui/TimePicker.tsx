"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, X, Zap, Sun, Sunset, Sunrise } from "lucide-react";

export interface TimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  title?: string;
  renderTrigger?: (props: { value: string | null; open: boolean; label: string }) => ReactNode;
}

export interface TimePickerPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  value: string | null;
  onChange: (value: string | null) => void;
  title?: string;
  clearable?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function TimePickerPopover({
  open,
  onClose,
  anchorEl,
  value,
  onChange,
  title = "Selecionar Horário",
  clearable = true,
}: TimePickerPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const hoursListRef = useRef<HTMLDivElement>(null);
  const minutesListRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Parse current hour and minute
  const currentHour = useMemo(() => {
    if (!value) return null;
    const [h] = value.split(":");
    return h ? h.padStart(2, "0") : null;
  }, [value]);

  const currentMinute = useMemo(() => {
    if (!value) return null;
    const [, m] = value.split(":");
    return m ? m.padStart(2, "0") : null;
  }, [value]);

  const [selectedH, setSelectedH] = useState<string>(currentHour ?? "09");
  const [selectedM, setSelectedM] = useState<string>(currentMinute ?? "00");

  useEffect(() => {
    if (open) {
      if (value) {
        const [h, m] = value.split(":");
        setSelectedH(h ? h.padStart(2, "0") : "09");
        setSelectedM(m ? m.padStart(2, "0") : "00");
      } else {
        const now = new Date();
        setSelectedH(String(now.getHours()).padStart(2, "0"));
        setSelectedM(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0"));
      }
    }
  }, [open, value]);

  // Scroll active items into view when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (hoursListRef.current) {
          const activeH = hoursListRef.current.querySelector('[data-active="true"]');
          activeH?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        if (minutesListRef.current) {
          const activeM = minutesListRef.current.querySelector('[data-active="true"]');
          activeM?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Floating UI positioning
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

  // Close on outside click or Escape
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

  const handleSelectTime = (h: string, m: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedH(h);
    setSelectedM(m);
    onChange(`${h}:${m}`);
  };

  const handleQuickPreset = (preset: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (preset) {
      const [h, m] = preset.split(":");
      setSelectedH(h);
      setSelectedM(m);
      onChange(preset);
    } else {
      onChange(null);
    }
    onClose();
  };

  const handleNow = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0");
    handleSelectTime(h, m, e);
    onClose();
  };

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
            width: 260,
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
          {/* Header */}
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
              <Clock size={15} color="var(--accent)" />
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

          {/* Quick Presets */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              type="button"
              onClick={handleNow}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--color-surface-sunken)",
                color: "var(--text-primary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "color-mix(in oklab, var(--accent) 40%, var(--border))";
                e.currentTarget.style.background = "color-mix(in oklab, var(--accent) 8%, var(--color-surface-sunken))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--color-surface-sunken)";
              }}
            >
              <Zap size={12} color="var(--accent)" />
              <span>Agora</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleQuickPreset("09:00", e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === "09:00" ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === "09:00"
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === "09:00" ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Sunrise size={12} color="var(--color-warning)" />
              <span>09:00</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleQuickPreset("14:00", e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === "14:00" ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === "14:00"
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === "14:00" ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Sun size={12} color="var(--color-info)" />
              <span>14:00</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleQuickPreset("18:00", e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 8,
                border: value === "18:00" ? "1px solid var(--accent)" : "1px solid var(--border)",
                background:
                  value === "18:00"
                    ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
                    : "var(--color-surface-sunken)",
                color: value === "18:00" ? "var(--accent)" : "var(--text-primary)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Sunset size={12} color="var(--color-terracotta, var(--accent))" />
              <span>18:00</span>
            </button>
          </div>

          {/* Time Picker Columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              background: "var(--color-surface-sunken)",
              borderRadius: 12,
              padding: 8,
              border: "1px solid var(--border)",
            }}
          >
            {/* Hours */}
            <div>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--border)",
                  marginBottom: 4,
                }}
              >
                Hora
              </div>
              <div
                ref={hoursListRef}
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  paddingRight: 2,
                }}
              >
                {HOURS.map((h) => {
                  const isSelected = selectedH === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-active={isSelected}
                      onClick={(e) => handleSelectTime(h, selectedM, e)}
                      style={{
                        padding: "4px 0",
                        borderRadius: 6,
                        border: "none",
                        background: isSelected ? "var(--accent)" : "transparent",
                        color: isSelected ? "var(--color-text-on-accent, #ffffff)" : "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "color-mix(in oklab, var(--accent) 15%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--border)",
                  marginBottom: 4,
                }}
              >
                Minuto
              </div>
              <div
                ref={minutesListRef}
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  paddingRight: 2,
                }}
              >
                {MINUTES.map((m) => {
                  const isSelected = selectedM === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-active={isSelected}
                      onClick={(e) => handleSelectTime(selectedH, m, e)}
                      style={{
                        padding: "4px 0",
                        borderRadius: 6,
                        border: "none",
                        background: isSelected ? "var(--accent)" : "transparent",
                        color: isSelected ? "var(--color-text-on-accent, #ffffff)" : "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontWeight: isSelected ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "color-mix(in oklab, var(--accent) 15%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 4,
              borderTop: "1px solid var(--border)",
            }}
          >
            {clearable && value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                  onClose();
                }}
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-tertiary)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-danger, #ef4444)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
              >
                Limpar
              </button>
            )}

            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(`${selectedH}:${selectedM}`);
                  onClose();
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--color-text-on-accent, #ffffff)",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Confirmar ({selectedH}:{selectedM})
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "--:--",
  disabled = false,
  clearable = true,
  title,
  renderTrigger,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const formattedLabel = useMemo(() => {
    if (!value) return placeholder;
    return value.slice(0, 5);
  }, [value, placeholder]);

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
          <Clock size={14} color="var(--accent)" />
          <span>{formattedLabel}</span>
        </button>
      )}

      <TimePickerPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={triggerRef.current}
        value={value}
        onChange={onChange}
        title={title}
        clearable={clearable}
      />
    </>
  );
}
