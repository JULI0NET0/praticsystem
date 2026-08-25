"use client";

import { Building2, Lock } from "lucide-react";
import { tint } from "@/lib/tint";
import { clientLabel, PRIORITY_COLORS, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { AssigneeStack } from "./AssigneePicker";
import DemandStatusPill from "./DemandStatusPill";
import DueChip from "./DueChip";

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
}

export default function DemandRow({ demand, onOpen }: Props) {
  const { getStatus, getClient, toggleComplete } = useDemandas();

  const status = getStatus(demand.status);
  const client = getClient(demand.client_id);
  const done = demand.status_category === "fechado";
  const priorityColor = PRIORITY_COLORS[demand.priority];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(demand.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(demand.id);
        }
      }}
      className="demanda-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: "var(--row-h, 40px)",
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Checkbox redondo — cor segue a prioridade, como no Todoist */}
      <button
        type="button"
        aria-label={done ? "Reabrir demanda" : "Concluir demanda"}
        onClick={(event) => {
          event.stopPropagation();
          toggleComplete(demand.id);
        }}
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: "50%",
          border: `2px solid ${priorityColor}`,
          background: done ? priorityColor : tint(priorityColor, 8),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "background 0.15s",
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2 6.5L4.5 9L10 3"
              fill="none"
              stroke="var(--color-surface-raised)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Título */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "0.88rem",
          fontWeight: 600,
          color: done ? "var(--text-tertiary)" : "var(--text-primary)",
          textDecoration: done ? "line-through" : "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {demand.title}
      </span>

      {/* Meta — some progressivamente em telas estreitas via CSS */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span className="demanda-row-client">
          {client ? (
            <ClientChip label={clientLabel(client)} />
          ) : (
            <InternalChip />
          )}
        </span>

        <span className="demanda-row-due">
          <DueChip dueDate={demand.due_date} dueTime={demand.due_time} />
        </span>

        <span className="demanda-row-status">
          <DemandStatusPill status={status} size="sm" />
        </span>

        <AssigneeStack
          assigneeIds={demand.assignee_ids ?? []}
          allTeam={demand.assign_all_team}
          size={22}
          max={3}
        />
      </div>
    </div>
  );
}

export function ClientChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "var(--text-secondary)",
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <Building2 size={11} />
      {label}
    </span>
  );
}

export function InternalChip() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "var(--text-tertiary)",
        background: "var(--color-surface-inset)",
        border: "1px solid var(--border)",
        whiteSpace: "nowrap",
      }}
    >
      <Lock size={11} />
      Interna
    </span>
  );
}
