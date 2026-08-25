"use client";

import { Calendar, SlidersHorizontal } from "lucide-react";
import type { DemandListGroupBy } from "@/types/demandas";

const META: Record<DemandListGroupBy, { label: string; icon: typeof Calendar }> = {
  due: { label: "Data", icon: Calendar },
  status: { label: "Status", icon: SlidersHorizontal },
};

const MODES: DemandListGroupBy[] = ["due", "status"];

interface Props {
  active: DemandListGroupBy;
  onChange: (groupBy: DemandListGroupBy) => void;
}

export default function DemandGroupBySwitcher({ active, onChange }: Props) {
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
      {MODES.map((mode) => {
        const { label, icon: Icon } = META[mode];
        const isActive = mode === active;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
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
