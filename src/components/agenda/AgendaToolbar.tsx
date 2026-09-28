"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, UserCircle2, X } from "lucide-react";

export type CalendarViewId = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";

const VIEWS: { id: CalendarViewId; label: string }[] = [
  { id: "dayGridMonth", label: "Mês" },
  { id: "timeGridWeek", label: "Semana" },
  { id: "timeGridDay", label: "Dia" },
  { id: "listWeek", label: "Lista" },
];

interface AgendaToolbarProps {
  title: string;
  view: CalendarViewId;
  onView: (view: CalendarViewId) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  searchQuery: string;
  onSearch: (value: string) => void;
  /** Combobox de responsável, já montado pela página. */
  responsibleControl: ReactNode;
  mineActive: boolean;
  onToggleMine: (() => void) | null;
}

/**
 * Uma única faixa de controles (56px): período, visões, busca e filtros.
 * Substitui as três faixas antigas (cabeçalho, filtros e barra do FullCalendar).
 */
export default function AgendaToolbar({
  title,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  searchQuery,
  onSearch,
  responsibleControl,
  mineActive,
  onToggleMine,
}: AgendaToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Navegação e filtros da agenda"
      style={{
        minHeight: 56,
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "8px 16px",
        borderBottom: "1px solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <button type="button" className="btn btn-secondary" onClick={onToday}>
        Hoje
      </button>
      <div style={{ display: "flex", gap: 2 }}>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onPrev} aria-label="Período anterior">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onNext} aria-label="Próximo período">
          <ChevronRight size={16} />
        </button>
      </div>
      <h2
        aria-live="polite"
        style={{
          margin: 0,
          minWidth: 140,
          fontSize: "var(--text-h2)",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>

      <div
        role="group"
        aria-label="Visão do calendário"
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          marginLeft: 4,
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-sunken)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {VIEWS.map((option) => {
          const active = view === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onView(option.id)}
              style={{
                height: 26,
                padding: "0 12px",
                border: 0,
                borderRadius: 7,
                background: active ? "var(--color-terracotta-100)" : "transparent",
                color: active ? "var(--color-terracotta-ink)" : "var(--color-text-secondary)",
                fontSize: "var(--text-caption)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ flexGrow: 1 }} />

      <label
        style={{
          width: 220,
          height: 34,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-input)",
          background: "var(--color-surface-raised)",
          color: "var(--color-text-tertiary)",
        }}
      >
        <Search size={14} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar compromisso"
          aria-label="Buscar compromisso"
          style={{
            width: "100%",
            border: 0,
            outline: "none",
            background: "transparent",
            font: "inherit",
            fontSize: "var(--text-ui)",
            color: "var(--color-text-primary)",
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Limpar busca"
            style={{ display: "flex", border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}
          >
            <X size={14} />
          </button>
        )}
      </label>

      {responsibleControl}
      {onToggleMine && (
        <button
          type="button"
          className="btn btn-secondary"
          aria-pressed={mineActive}
          onClick={onToggleMine}
          title="Mostrar só os meus compromissos"
          style={mineActive ? { background: "var(--color-terracotta-100)", color: "var(--color-terracotta-ink)", borderColor: "var(--color-terracotta-200)" } : undefined}
        >
          <UserCircle2 size={14} /> Minhas
        </button>
      )}
    </div>
  );
}
