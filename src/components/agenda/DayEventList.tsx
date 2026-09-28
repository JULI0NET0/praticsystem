"use client";

import { Fragment, type ReactNode } from "react";
import { Check } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { getAgendaCategory } from "@/lib/agendaCategories";
import { isSameDay, timeLabel, type AgendaItem } from "@/lib/agendaItems";
import { tint } from "@/lib/tint";
import { useLongPress } from "./useLongPress";

export interface OpenPoint {
  x: number;
  y: number;
}

interface DayEventListProps {
  items: AgendaItem[];
  day: Date;
  now: Date;
  clientNames: Map<string, string>;
  /** `mobile` = alvos de toque de 44px e tipografia maior. */
  size: "panel" | "mobile";
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onLongPress?: (item: AgendaItem) => void;
  emptyAction?: ReactNode;
}

/** Lista de compromissos de um dia, com a linha de "agora" quando o dia é hoje. */
export default function DayEventList({
  items,
  day,
  now,
  clientNames,
  size,
  onOpen,
  onToggleComplete,
  onLongPress,
  emptyAction,
}: DayEventListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        title="Nada marcado para este dia."
        description="Aproveite para agendar algo."
        action={emptyAction}
      />
    );
  }

  const showNow = isSameDay(day, now) && items.some((item) => !item.allDay);
  const nowIndex = showNow
    ? (() => {
        const next = items.findIndex((item) => !item.allDay && item.start.getTime() > now.getTime());
        return next === -1 ? items.length : next;
      })()
    : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, index) => (
        <Fragment key={item.id}>
          {nowIndex === index && <NowLine now={now} />}
          <EventCard
            item={item}
            meta={metaFor(item, clientNames)}
            size={size}
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            onLongPress={onLongPress}
          />
        </Fragment>
      ))}
      {nowIndex === items.length && <NowLine now={now} />}
    </div>
  );
}

function metaFor(item: AgendaItem, clientNames: Map<string, string>): string {
  const parts: string[] = [];
  if (item.clientId) parts.push(clientNames.get(item.clientId) ?? "Cliente");
  else if (item.assignAllTeam || item.visibility === "public") parts.push("Equipe");
  if (item.googleEventId) parts.push("Google");
  return parts.join(" · ");
}

function NowLine({ now }: { now: Date }) {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div role="separator" aria-label={`Agora, ${hh}:${mm}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 44,
          flexShrink: 0,
          fontSize: "var(--text-micro)",
          fontWeight: 700,
          color: "var(--color-terracotta-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {hh}:{mm}
      </span>
      <span style={{ flexGrow: 1, height: 2, borderRadius: 2, background: "var(--color-terracotta)" }} />
    </div>
  );
}

interface EventCardProps {
  item: AgendaItem;
  meta: string;
  size: "panel" | "mobile";
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onLongPress?: (item: AgendaItem) => void;
}

function EventCard({ item, meta, size, onOpen, onToggleComplete, onLongPress }: EventCardProps) {
  const mobile = size === "mobile";
  const category = getAgendaCategory(item.type);
  const completed = item.status === "completed";
  const canComplete = !item.isInvoice && !item.demandId;
  const longPress = useLongPress(onLongPress && canComplete ? () => onLongPress(item) : undefined);

  return (
    <div style={{ display: "flex", gap: 8, opacity: completed ? 0.6 : 1 }}>
      <span
        style={{
          width: 44,
          flexShrink: 0,
          paddingTop: mobile ? 14 : 11,
          fontSize: mobile ? "var(--text-data)" : "var(--text-caption)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.allDay ? "dia todo" : timeLabel(item)}
      </span>
      <div
        {...longPress}
        style={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: mobile ? "12px 6px 12px 12px" : "10px 6px 10px 12px",
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: mobile ? "var(--radius-card)" : "var(--radius-md)",
          WebkitTouchCallout: "none",
          userSelect: "none",
        }}
      >
        <button
          type="button"
          onClick={(event) => onOpen(item, { x: event.clientX, y: event.clientY })}
          aria-label={`Abrir ${item.title}`}
          style={{
            flexGrow: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 0,
            border: 0,
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
            color: "var(--color-text-primary)",
          }}
        >
          <span
            style={{
              fontSize: mobile ? "var(--text-body)" : "var(--text-ui)",
              fontWeight: 600,
              textDecoration: completed ? "line-through" : "none",
              overflowWrap: "anywhere",
            }}
          >
            {item.title}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: "var(--radius-badge)",
                background: tint(category?.color, 12),
                fontSize: "var(--text-micro)",
                fontWeight: 600,
              }}
            >
              <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: category?.color }} />
              {category?.label ?? "Compromisso"}
            </span>
            {meta && (
              <span
                style={{
                  fontSize: "var(--text-caption)",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {meta}
              </span>
            )}
          </span>
        </button>
        {canComplete && (
          <button
            type="button"
            onClick={() => onToggleComplete(item)}
            aria-label={completed ? `Reabrir ${item.title}` : `Concluir ${item.title}`}
            aria-pressed={completed}
            style={{
              width: mobile ? 44 : 32,
              height: mobile ? 44 : 32,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: 0,
              borderRadius: "var(--radius-md)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: mobile ? 22 : 18,
                height: mobile ? 22 : 18,
                boxSizing: "border-box",
                borderRadius: 999,
                border: `2px solid ${completed ? "var(--color-success)" : "var(--color-text-muted)"}`,
                background: completed ? "var(--color-success)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {completed && <Check size={mobile ? 13 : 11} color="#ffffff" strokeWidth={3} />}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
