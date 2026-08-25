"use client";

import { Flag } from "lucide-react";
import { tint } from "@/lib/tint";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_SHORT,
  type DemandPriority,
} from "@/types/demandas";

/** Bandeira sólida. Em "none" fica só o contorno, como no Todoist. */
export function PriorityFlag({
  priority,
  size = 14,
}: {
  priority: DemandPriority;
  size?: number;
}) {
  const color = PRIORITY_COLORS[priority];
  return (
    <Flag
      size={size}
      color={color}
      fill={priority === "none" ? "none" : color}
      aria-label={PRIORITY_LABELS[priority]}
    />
  );
}

/**
 * Pílula com rótulo. `urgent` vai sólida — é o único nível que deve
 * saltar da tela; os demais usam wash reforçado sobre o pergaminho.
 */
export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: DemandPriority;
  compact?: boolean;
}) {
  if (priority === "none") return null;

  const color = PRIORITY_COLORS[priority];
  const solid = priority === "urgent";
  const label = compact ? PRIORITY_SHORT[priority] : PRIORITY_LABELS[priority];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.64rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        color: solid ? "#fff" : color,
        background: solid ? color : tint(color, 18),
        border: `1px solid ${solid ? color : tint(color, 38)}`,
        whiteSpace: "nowrap",
      }}
    >
      <Flag size={10} color={solid ? "#fff" : color} fill={solid ? "#fff" : color} />
      {label}
    </span>
  );
}

export default PriorityFlag;
