"use client";

import { LayoutGrid, Table2, CalendarDays } from "lucide-react";
import { ViewType } from "@/types/operacao";

const META: Record<ViewType, { label: string; icon: typeof LayoutGrid }> = {
  board: { label: "Kanban", icon: LayoutGrid },
  table: { label: "Tabela", icon: Table2 },
  calendar: { label: "Calendário", icon: CalendarDays },
};

interface Props {
  views: ViewType[];
  active: ViewType;
  onChange: (v: ViewType) => void;
}

export default function ViewSwitcher({ views, active, onChange }: Props) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        borderRadius: 12,
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
      }}
    >
      {views.map((v) => {
        const { label, icon: Icon } = META[v];
        const isActive = v === active;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 700,
              background: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
