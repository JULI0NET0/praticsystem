"use client";

import { CustomValue, FieldDef } from "@/types/operacao";

/** Renderiza o valor de um campo personalizado como chip/badge (Mídia, Funil, ...). */
export default function FieldChip({ field, value }: { field: FieldDef; value: CustomValue }) {
  if (value === null || value === undefined || value === "") return null;

  if (field.type === "label" || field.type === "dropdown") {
    const opt = field.options?.find((o) => o.value === value);
    const color = opt?.color ?? "#71717A";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 6,
          fontSize: "0.66rem",
          fontWeight: 700,
          color,
          background: `${color}1A`,
          border: `1px solid ${color}33`,
          whiteSpace: "nowrap",
        }}
      >
        {opt?.label ?? String(value)}
      </span>
    );
  }

  if (field.type === "date") {
    const d = new Date(String(value) + "T00:00:00");
    const txt = isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
    return <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{txt}</span>;
  }

  return <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{String(value)}</span>;
}

/** Progresso de checklist (ações concluídas / total) de uma tarefa. */
export function checklistProgress(subtasks: { actions: { done: boolean }[] }[]): {
  done: number;
  total: number;
  pct: number;
} {
  let done = 0;
  let total = 0;
  for (const st of subtasks) {
    for (const a of st.actions) {
      total += 1;
      if (a.done) done += 1;
    }
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
