"use client";

import { useState } from "react";
import { Check, ListChecks, Maximize2, PenLine, Video } from "lucide-react";
import { tint } from "@/lib/tint";
import { getContentType } from "@/lib/contentTypes";
import type { QuickParseResult } from "@/lib/quickParse";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import DemandStatusPill from "@/components/demandas/DemandStatusPill";
import DueChip from "@/components/demandas/DueChip";
import QuickAddInput from "@/components/demandas/QuickAddInput";
import { AssigneeStack } from "@/components/demandas/AssigneePicker";
import { PRIORITY_COLORS, type Demand } from "@/types/demandas";

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, event: React.MouseEvent) => void;
}

/**
 * Linha do cronograma. Componente próprio, e não mais uma prop no DemandRow:
 * aquele arquivo já carrega drag & drop, menu de contexto, animação de
 * conclusão e o vínculo com a Agenda — aqui é preciso menos, não mais.
 *
 * O título é editável no lugar, com os mesmos atalhos das Demandas; abrir o
 * detalhe continua disponível no botão.
 */
export default function PlanItemRow({ demand, onOpen, selected = false, onSelect }: Props) {
  const { getStatus, updateDemand, toggleComplete } = useDemandas();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(demand.title);

  const status = getStatus(demand.status);
  const done = demand.status_category === "fechado";
  const priorityColor = PRIORITY_COLORS[demand.priority];
  const contentType = getContentType(demand.content_type);

  const RoleIcon = demand.plan_role === "roteiro" ? PenLine : Video;
  const isProduction = demand.plan_role === "roteiro" || demand.plan_role === "captacao";

  const startEditing = () => {
    setDraft(demand.title);
    setEditing(true);
  };

  /**
   * Os atalhos do título valem aqui porque mapeiam em campos reais da
   * demanda: `@responsável`, `P1` e a data. O que sobra vira o nome.
   */
  const commit = (parsed: QuickParseResult) => {
    setEditing(false);
    const title = parsed.title.trim();
    if (!title) return; // nome vazio não salva — melhor manter o que estava

    const patch: Partial<Demand> = {};
    if (title !== demand.title) patch.title = title;
    if (parsed.assigneeIds.length) patch.assignee_ids = parsed.assigneeIds;
    if (parsed.priority) patch.priority = parsed.priority;
    if (parsed.dueDate) patch.due_date = parsed.dueDate;
    if (parsed.dueTime) patch.due_time = parsed.dueTime;

    if (Object.keys(patch).length > 0) updateDemand(demand.id, patch);
  };

  return (
    <div
      className={`plan-item-row ${selected ? "plan-item-row-selected" : ""}`}
      onClick={(event) => {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          event.preventDefault();
          onSelect?.(demand.id, event);
        }
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        borderBottom: selected
          ? "1px solid color-mix(in oklab, var(--accent) 50%, transparent)"
          : "1px solid var(--border)",
        background: selected
          ? "color-mix(in oklab, var(--accent) 12%, transparent)"
          : "transparent",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <button
        type="button"
        aria-label={done ? "Reabrir" : "Concluir"}
        aria-pressed={done}
        onClick={(event) => {
          event.stopPropagation();
          toggleComplete(demand.id);
        }}
        style={{
          width: 17,
          height: 17,
          marginTop: 3,
          flexShrink: 0,
          borderRadius: "50%",
          border: `2px solid ${priorityColor}`,
          background: done ? priorityColor : tint(priorityColor, 10),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        {done && <Check size={10} color="var(--color-surface-raised)" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Linha 1: título */}
        {editing ? (
          <QuickAddInput
            value={draft}
            onChange={setDraft}
            onSubmit={commit}
            autoFocus
            showHint={false}
            placeholder="Nome da demanda…"
          />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              if (event.shiftKey || event.metaKey || event.ctrlKey) return;
              startEditing();
            }}
            title="Clique para renomear"
            style={{
              padding: "2px 5px",
              marginLeft: -5,
              border: "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              cursor: "text",
              textAlign: "left",
              fontSize: "0.86rem",
              fontWeight: 600,
              fontFamily: "inherit",
              color: done ? "var(--text-tertiary)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {demand.title}
          </button>
        )}

        {/* Linha 2: os detalhes, à esquerda sob o título */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isProduction && (
            <span
              title={demand.plan_role === "roteiro" ? "Roteiro" : "Captação"}
              style={{ display: "inline-flex", color: "var(--text-tertiary)" }}
            >
              <RoleIcon size={12} />
            </span>
          )}

          <DueChip demandId={demand.id} dueDate={demand.due_date} dueTime={demand.due_time} />
          <DemandStatusPill status={status} size="sm" />

          {contentType && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: "var(--radius-badge)",
                fontSize: "0.66rem",
                fontWeight: 700,
                color: contentType.color,
                background: tint(contentType.color, 14),
                border: `1px solid ${tint(contentType.color, 32)}`,
                whiteSpace: "nowrap",
              }}
            >
              <contentType.icon size={10} />
              {contentType.label}
            </span>
          )}

          <AssigneeStack
            assigneeIds={demand.assignee_ids ?? []}
            allTeam={demand.assign_all_team}
            size={20}
            max={3}
          />

          {demand.checklist_total ? (
            <span
              title={`${demand.checklist_done} de ${demand.checklist_total} etapas`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: "0.7rem",
                fontWeight: 700,
                color:
                  demand.checklist_done === demand.checklist_total
                    ? "var(--color-success)"
                    : "var(--text-tertiary)",
              }}
            >
              <ListChecks size={12} />
              {demand.checklist_done}/{demand.checklist_total}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen(demand.id);
        }}
        aria-label={`Abrir ${demand.title}`}
        title="Abrir detalhes"
        className="plan-item-open"
        style={{
          display: "flex",
          marginTop: 2,
          flexShrink: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 3,
          color: "var(--text-tertiary)",
        }}
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
}
