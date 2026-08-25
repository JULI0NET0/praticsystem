"use client";

import { CalendarClock } from "lucide-react";
import { formatDueDateLabel, formatDueTime, type DueTone } from "@/lib/dueDate";

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
}

export default function DueChip({
  dueDate,
  dueTime,
  hideWhenEmpty = true,
  showIcon = true,
}: Props) {
  if (!dueDate && hideWhenEmpty) return null;

  const { label, tone } = formatDueDateLabel(dueDate);
  const time = formatDueTime(dueTime);
  const color = TONE_COLOR[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "0.72rem",
        fontWeight: 700,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {showIcon && <CalendarClock size={12} />}
      {label}
      {time && ` · ${time}`}
    </span>
  );
}
