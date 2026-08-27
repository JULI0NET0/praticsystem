"use client";

import { useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { formatDueDateLabel, formatDueTime, type DueTone } from "@/lib/dueDate";
import { useOptionalDemandas } from "./DemandasProvider";
import DueDatePickerPopover from "./DueDatePickerPopover";

const TONE_COLOR: Record<DueTone, string> = {
  overdue: "var(--color-danger)",
  today: "var(--accent)",
  soon: "var(--color-warning)",
  normal: "var(--text-secondary)",
  muted: "var(--text-tertiary)",
};

interface Props {
  dueDate?: string | null;
  dueTime?: string | null;
  /** Quando true, não renderiza nada se não houver prazo. */
  hideWhenEmpty?: boolean;
  showIcon?: boolean;
  demandId?: string;
  onDateChange?: (newDate: string | null, newTime?: string | null) => void;
  readOnly?: boolean;
}

export default function DueChip({
  dueDate,
  dueTime,
  hideWhenEmpty = true,
  showIcon = true,
  demandId,
  onDateChange,
  readOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const demandas = useOptionalDemandas();

  if (!dueDate && hideWhenEmpty) return null;

  const { label, tone } = formatDueDateLabel(dueDate);
  const time = formatDueTime(dueTime);
  const color = TONE_COLOR[tone];
  const isInteractive = !readOnly && Boolean(demandId || onDateChange);

  const handleSelectDate = (newDate: string | null, newTime?: string | null) => {
    if (onDateChange) {
      onDateChange(newDate, newTime);
    } else if (demandId && demandas) {
      demandas.updateDemand(demandId, {
        due_date: newDate,
        due_time: newTime ?? null,
      });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={!isInteractive}
        onClick={(e) => {
          if (!isInteractive) return;
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title={isInteractive ? "Clique para remarcar prazo" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.72rem",
          fontWeight: 700,
          color,
          whiteSpace: "nowrap",
          background: isInteractive && open
            ? "color-mix(in oklab, var(--accent) 15%, var(--color-surface-sunken))"
            : "transparent",
          border: isInteractive && open
            ? "1px solid color-mix(in oklab, var(--accent) 35%, transparent)"
            : "1px solid transparent",
          borderRadius: 6,
          padding: isInteractive ? "2px 6px" : 0,
          cursor: isInteractive ? "pointer" : "default",
          transition: "background 0.15s, border-color 0.15s, color 0.15s",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (isInteractive && !open) {
            e.currentTarget.style.background = "var(--color-surface-sunken)";
            e.currentTarget.style.borderColor = "var(--border)";
          }
        }}
        onMouseLeave={(e) => {
          if (isInteractive && !open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
      >
        {showIcon && <CalendarClock size={12} />}
        <span>{label}</span>
        {time && <span style={{ opacity: 0.85 }}>{` · ${time}`}</span>}
      </button>

      {isInteractive && (
        <DueDatePickerPopover
          open={open}
          onClose={() => setOpen(false)}
          anchorEl={triggerRef.current}
          dueDate={dueDate ?? null}
          dueTime={dueTime ?? null}
          onSelect={handleSelectDate}
        />
      )}
    </>
  );
}
