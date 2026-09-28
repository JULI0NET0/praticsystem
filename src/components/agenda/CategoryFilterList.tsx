"use client";

import { AGENDA_CATEGORIES } from "@/lib/agendaCategories";

interface CategoryFilterListProps {
  active: string[];
  counts: Record<string, number>;
  onToggle: (id: string) => void;
  /** Linhas de 44px no toque, 28px no desktop. */
  touch?: boolean;
}

/** Legenda de assuntos que também filtra: marcado = aparece na agenda. */
export default function CategoryFilterList({ active, counts, onToggle, touch }: CategoryFilterListProps) {
  return (
    <div role="group" aria-label="Filtrar por assunto" style={{ display: "flex", flexDirection: "column" }}>
      {AGENDA_CATEGORIES.map((category) => (
        <label
          key={category.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minHeight: touch ? 44 : 28,
            fontSize: touch ? "var(--text-body)" : "var(--text-data)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={active.includes(category.id)}
            onChange={() => onToggle(category.id)}
            style={{ accentColor: "var(--color-terracotta)", margin: 0, width: touch ? 20 : 16, height: touch ? 20 : 16 }}
          />
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: category.color }} />
          <span style={{ flexGrow: 1 }}>{category.label}</span>
          <span
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: 600,
              color: "var(--color-text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {counts[category.id] ?? 0}
          </span>
        </label>
      ))}
    </div>
  );
}
