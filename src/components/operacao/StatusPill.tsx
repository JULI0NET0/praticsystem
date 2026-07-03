"use client";

import { StatusDef } from "@/types/operacao";

export default function StatusPill({ status, size = "md" }: { status?: StatusDef; size?: "sm" | "md" }) {
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
        background: `${status.color}1A`,
        border: `1px solid ${status.color}33`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
      {status.label}
    </span>
  );
}
