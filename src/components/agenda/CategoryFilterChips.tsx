"use client";

import { AGENDA_CATEGORIES } from "@/lib/agendaCategories";
import { tint } from "@/lib/tint";

interface CategoryFilterChipsProps {
  active: string[];
  counts: Record<string, number>;
  onToggle: (id: string) => void;
  onReset: () => void;
}

/**
 * Filtro por assunto no topo da agenda. Chip ligado = aparece no calendário;
 * a contagem é do período que está na tela.
 */
export default function CategoryFilterChips({ active, counts, onToggle, onReset }: CategoryFilterChipsProps) {
  const allActive = active.length === AGENDA_CATEGORIES.length;

  return (
    <div
      role="group"
      aria-label="Filtrar por assunto"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "8px 16px",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <span
        style={{
          marginRight: 2,
          fontSize: "var(--text-micro)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary)",
        }}
      >
        Assuntos
      </span>
      {AGENDA_CATEGORIES.map((category) => {
        const on = active.includes(category.id);
        const count = counts[category.id] ?? 0;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={on}
            title={`${on ? "Ocultar" : "Mostrar"} ${category.label}`}
            onClick={() => onToggle(category.id)}
            style={{
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 10px",
              borderRadius: 999,
              border: `1px solid ${on ? category.color : "var(--color-border-subtle)"}`,
              background: on ? tint(category.color, 12) : "var(--color-surface-raised)",
              color: on ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              fontSize: "var(--text-caption)",
              fontWeight: on ? 600 : 500,
              cursor: "pointer",
              transition: "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: 999, background: category.color, opacity: on ? 1 : 0.4 }}
            />
            {category.label}
            <span
              style={{
                fontSize: "var(--text-micro)",
                fontWeight: 600,
                color: "var(--color-text-tertiary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
      {!allActive && (
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: "2px 6px",
            border: 0,
            background: "transparent",
            fontSize: "var(--text-caption)",
            fontWeight: 600,
            color: "var(--color-terracotta-ink)",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Mostrar todos
        </button>
      )}
    </div>
  );
}
