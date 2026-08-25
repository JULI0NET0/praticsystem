"use client";

import { tint } from "@/lib/tint";
import type { DemandStatus } from "@/types/demandas";

interface Props {
  status?: DemandStatus;
  size?: "sm" | "md";
}

export default function DemandStatusPill({ status, size = "md" }: Props) {
  if (!status) return null;
  const pad = size === "sm" ? "2px 8px" : "4px 10px";
  const font = size === "sm" ? "0.62rem" : "0.68rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: "var(--radius-badge)",
        fontSize: font,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        color: status.color,
        // Wash e borda reforçados: a 10%/20% as colunas do Kanban ficavam
        // praticamente monocromáticas sobre o pergaminho.
        background: tint(status.color, 18),
        border: `1px solid ${tint(status.color, 38)}`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
      {status.label}
    </span>
  );
}
