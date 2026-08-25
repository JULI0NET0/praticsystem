"use client";

import { Flag } from "lucide-react";
import { tint } from "@/lib/tint";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
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

/** Pílula com rótulo, usada no card do Kanban e no drawer. */
export function PriorityBadge({ priority }: { priority: DemandPriority }) {
  if (priority === "none") return null;
  const color = PRIORITY_COLORS[priority];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.62rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        color,
        background: tint(color, 10),
        border: `1px solid ${tint(color, 20)}`,
        whiteSpace: "nowrap",
      }}
    >
      <Flag size={10} color={color} fill={color} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export default PriorityFlag;
