"use client";

import { KanbanSquare, ListChecks } from "lucide-react";
import type { DemandView } from "@/types/demandas";

const META: Record<DemandView, { label: string; icon: typeof ListChecks }> = {
  list: { label: "Lista", icon: ListChecks },
  board: { label: "Kanban", icon: KanbanSquare },
};

const VIEWS: DemandView[] = ["list", "board"];

interface Props {
  active: DemandView;
  onChange: (view: DemandView) => void;
}

export default function DemandViewSwitcher({ active, onChange }: Props) {
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
      {VIEWS.map((view) => {
        const { label, icon: Icon } = META[view];
        const isActive = view === active;
        return (
          <button
            key={view}
            onClick={() => onChange(view)}
            aria-pressed={isActive}
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
              color: isActive ? "var(--color-text-on-accent)" : "var(--text-secondary)",
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
