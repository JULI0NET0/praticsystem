"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getAgendaCategory } from "@/lib/agendaCategories";
import {
  fullDayLabel,
  itemsOnDay,
  relativeDayLabel,
  timeLabel,
  upcomingAfter,
  type AgendaItem,
} from "@/lib/agendaItems";
import CategoryFilterList from "./CategoryFilterList";
import DayEventList, { type OpenPoint } from "./DayEventList";

interface AgendaSidePanelProps {
  day: Date;
  now: Date;
  /** Compromissos já filtrados (assunto, responsável, busca). */
  items: AgendaItem[];
  clientNames: Map<string, string>;
  activeCategories: string[];
  /** Contagem por assunto dentro do período visível. */
  categoryCounts: Record<string, number>;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDay: (day: Date) => void;
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onNewOnDay: (point: OpenPoint) => void;
  onToggleCategory: (id: string) => void;
}

/** "Amanhã" por extenso; depois disso, "Sex 2" — cabe na coluna de 60px. */
function upcomingDayLabel(day: Date, now: Date): string {
  const relative = relativeDayLabel(day, now);
  if (relative === "Amanhã" || relative === "Hoje") return relative;
  return `${relative.slice(0, 3)} ${day.getDate()}`;
}

const sectionTitle = {
  margin: 0,
  fontSize: "var(--text-micro)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-text-tertiary)",
} as const;

export default function AgendaSidePanel({
  day,
  now,
  items,
  clientNames,
  activeCategories,
  categoryCounts,
  onPrevDay,
  onNextDay,
  onSelectDay,
  onOpen,
  onToggleComplete,
  onNewOnDay,
  onToggleCategory,
}: AgendaSidePanelProps) {
  const dayItems = itemsOnDay(items, day);
  const done = dayItems.filter((item) => item.status === "completed").length;
  const upcoming = upcomingAfter(items, day, 3);
  const summary =
    dayItems.length === 0
      ? "Sem compromissos"
      : `${dayItems.length} ${dayItems.length === 1 ? "compromisso" : "compromissos"}${done ? ` · ${done} ${done === 1 ? "concluído" : "concluídos"}` : ""}`;

  return (
    <aside
      aria-label="Compromissos do dia"
      style={{
        width: 340,
        flexShrink: 0,
        boxSizing: "border-box",
        borderLeft: "1px solid var(--color-border-subtle)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-terracotta-700)",
            }}
          >
            {relativeDayLabel(day, now)}
          </div>
          <h2 style={{ margin: "2px 0 0", fontSize: "var(--text-h3)", fontWeight: 600 }}>{fullDayLabel(day)}</h2>
          <div style={{ marginTop: 2, fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>{summary}</div>
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onPrevDay} aria-label="Dia anterior">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onNextDay} aria-label="Próximo dia">
            <ChevronRight size={16} />
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={(event) => onNewOnDay({ x: event.clientX, y: event.clientY })} aria-label="Novo compromisso neste dia">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <DayEventList
        items={dayItems}
        day={day}
        now={now}
        clientNames={clientNames}
        size="panel"
        onOpen={onOpen}
        onToggleComplete={onToggleComplete}
        emptyAction={
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={(event) => onNewOnDay({ x: event.clientX, y: event.clientY })}
          >
            <Plus size={13} /> Novo compromisso
          </button>
        }
      />

      {upcoming.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 14, borderTop: "1px solid var(--color-border-subtle)" }}>
          <h3 style={{ ...sectionTitle, marginBottom: 4 }}>Próximos dias</h3>
          {upcoming.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDay(item.start)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 32,
                padding: 0,
                border: 0,
                background: "transparent",
                textAlign: "left",
                fontSize: "var(--text-data)",
                color: "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 60,
                  flexShrink: 0,
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {upcomingDayLabel(item.start, now)}
              </span>
              <span
                aria-hidden="true"
                style={{ width: 6, height: 6, flexShrink: 0, borderRadius: 999, background: getAgendaCategory(item.type)?.color }}
              />
              <span style={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</span>
              <span style={{ flexShrink: 0, fontSize: "var(--text-micro)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                {timeLabel(item)}
              </span>
            </button>
          ))}
        </section>
      )}

      <section style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, paddingTop: 14, borderTop: "1px solid var(--color-border-subtle)" }}>
        <h3 style={{ ...sectionTitle, marginBottom: 4 }}>Assuntos no período</h3>
        <CategoryFilterList active={activeCategories} counts={categoryCounts} onToggle={onToggleCategory} />
      </section>
    </aside>
  );
}
