"use client";

import { useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AGENDA_CATEGORIES, getAgendaCategory } from "@/lib/agendaCategories";
import {
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  dayHeading,
  fullDayLabel,
  groupByDay,
  isSameDay,
  itemsOnDay,
  monthGrid,
  monthLabel,
  relativeDayLabel,
  startOfDayLocal,
  timeLabel,
  weekDays,
  type AgendaItem,
} from "@/lib/agendaItems";
import { tint } from "@/lib/tint";
import BottomSheet from "./BottomSheet";
import CategoryFilterList from "./CategoryFilterList";
import DayEventList, { type OpenPoint } from "./DayEventList";
import GoogleSyncButton, { type GoogleAccountState } from "./GoogleSyncButton";
import SwipeArea from "./SwipeArea";

export type MobileView = "day" | "month" | "list";

const VIEW_LABELS: { id: MobileView; label: string }[] = [
  { id: "day", label: "Dia" },
  { id: "month", label: "Mês" },
  { id: "list", label: "Lista" },
];

/** Quanto o usuário precisa puxar para baixo para disparar a sincronização. */
const PULL_TRIGGER_PX = 70;
const PULL_MAX_PX = 110;
const LIST_HORIZON_DAYS = 60;

interface MobileAgendaProps {
  items: AgendaItem[];
  clientNames: Map<string, string>;
  now: Date;
  day: Date;
  onDayChange: (day: Date) => void;
  view: MobileView;
  onView: (view: MobileView) => void;
  activeCategories: string[];
  categoryCounts: Record<string, number>;
  onToggleCategory: (id: string) => void;
  onResetCategories: () => void;
  /** Responsável e "Minhas", montados pela página, dentro da gaveta de filtros. */
  filtersExtra: ReactNode;
  filtersActiveCount: number;
  searchQuery: string;
  onSearch: (value: string) => void;
  google: { state: GoogleAccountState; syncing: boolean; lastSyncedAt: number | null; onClick: () => void };
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onMoveTomorrow: (item: AgendaItem) => void;
  onEdit: (item: AgendaItem) => void;
  onNew: (day: Date) => void;
  onRefresh: () => Promise<void>;
}

export default function MobileAgenda(props: MobileAgendaProps) {
  const {
    items,
    clientNames,
    now,
    day,
    onDayChange,
    view,
    onView,
    activeCategories,
    categoryCounts,
    onToggleCategory,
    onResetCategories,
    filtersExtra,
    filtersActiveCount,
    searchQuery,
    onSearch,
    google,
    onOpen,
    onToggleComplete,
    onMoveTomorrow,
    onEdit,
    onNew,
    onRefresh,
  } = props;

  const [searchOpen, setSearchOpen] = useState(searchQuery.length > 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickItem, setQuickItem] = useState<AgendaItem | null>(null);

  const dayItems = useMemo(() => itemsOnDay(items, day), [items, day]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <h1 style={{ margin: 0, flexGrow: 1, fontSize: "var(--text-h2)", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Agenda
        </h1>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label={searchOpen ? "Fechar busca" : "Buscar compromisso"}
          aria-expanded={searchOpen}
          style={{ width: 44, height: 44 }}
        >
          {searchOpen ? <X size={20} /> : <Search size={20} />}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => setFiltersOpen(true)}
          aria-label={filtersActiveCount > 0 ? `Filtros (${filtersActiveCount} ativos)` : "Filtros"}
          style={{ position: "relative", width: 44, height: 44 }}
        >
          <SlidersHorizontal size={20} />
          {filtersActiveCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 10,
                right: 9,
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--color-terracotta)",
                border: "2px solid var(--color-surface-canvas)",
              }}
            />
          )}
        </button>
        <GoogleSyncButton compact {...google} />
      </div>

      {searchOpen && (
        <input
          type="search"
          className="input-dark"
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar título ou cliente"
          aria-label="Buscar compromisso"
          autoFocus
        />
      )}

      <div
        role="group"
        aria-label="Visão da agenda"
        style={{
          display: "flex",
          padding: 3,
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface-sunken)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {VIEW_LABELS.map((option) => {
          const active = view === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onView(option.id)}
              style={{
                flexGrow: 1,
                minHeight: 40,
                border: 0,
                borderRadius: 7,
                background: active ? "var(--color-terracotta-100)" : "transparent",
                color: active ? "var(--color-terracotta-ink)" : "var(--color-text-secondary)",
                fontSize: "var(--text-ui)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {view === "day" && (
        <DayView
          items={items}
          dayItems={dayItems}
          day={day}
          now={now}
          clientNames={clientNames}
          onDayChange={onDayChange}
          onOpen={onOpen}
          onToggleComplete={onToggleComplete}
          onLongPress={setQuickItem}
          onNew={onNew}
          onRefresh={onRefresh}
          syncing={google.syncing}
        />
      )}
      {view === "month" && (
        <MonthView
          items={items}
          dayItems={dayItems}
          day={day}
          now={now}
          activeCategories={activeCategories}
          onDayChange={onDayChange}
          onToggleCategory={onToggleCategory}
          onResetCategories={onResetCategories}
          onOpen={onOpen}
          onNew={onNew}
        />
      )}
      {view === "list" && (
        <ListView
          items={items}
          now={now}
          clientNames={clientNames}
          onOpen={onOpen}
          onToggleComplete={onToggleComplete}
          onLongPress={setQuickItem}
        />
      )}

      <button
        type="button"
        onClick={() => onNew(day)}
        aria-label="Novo compromisso"
        style={{
          position: "fixed",
          right: 16,
          bottom: "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
          zIndex: 90,
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          borderRadius: 999,
          background: "var(--color-terracotta)",
          color: "var(--color-text-on-accent)",
          boxShadow: "var(--shadow-lg)",
          cursor: "pointer",
        }}
      >
        <Plus size={24} />
      </button>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} label="Filtros da agenda">
        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-h3)", fontWeight: 700 }}>Filtros</h2>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros" style={{ width: 44, height: 44 }}>
              <X size={20} />
            </button>
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "var(--text-micro)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>
              Assuntos
            </h3>
            <CategoryFilterList touch active={activeCategories} counts={categoryCounts} onToggle={onToggleCategory} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{filtersExtra}</div>
          <button type="button" className="btn btn-accent" onClick={() => setFiltersOpen(false)} style={{ minHeight: 48 }}>
            Ver compromissos
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={quickItem !== null} onClose={() => setQuickItem(null)} label="Ações rápidas do compromisso">
        {quickItem && (
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ margin: "0 0 8px", fontSize: "var(--text-data)", fontWeight: 600, color: "var(--color-text-secondary)", overflowWrap: "anywhere" }}>
              {quickItem.title}
            </p>
            <QuickAction
              icon={<Check size={18} />}
              label={quickItem.status === "completed" ? "Reabrir" : "Concluir"}
              onClick={() => {
                onToggleComplete(quickItem);
                setQuickItem(null);
              }}
            />
            <QuickAction
              icon={<CalendarClock size={18} />}
              label="Mover para amanhã"
              onClick={() => {
                onMoveTomorrow(quickItem);
                setQuickItem(null);
              }}
            />
            <QuickAction
              icon={<Pencil size={18} />}
              label="Editar"
              onClick={() => {
                onEdit(quickItem);
                setQuickItem(null);
              }}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 12px",
        border: 0,
        borderRadius: "var(--radius-input)",
        background: "transparent",
        color: "var(--color-text-primary)",
        fontSize: "var(--text-body)",
        fontWeight: 500,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span aria-hidden="true" style={{ display: "flex", color: "var(--color-text-tertiary)" }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/** Até 3 pontinhos, um por assunto distinto do dia. */
function dotColors(items: AgendaItem[], day: Date): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const item of items) {
    if (!isSameDay(item.start, day) || seen.has(item.type)) continue;
    seen.add(item.type);
    const color = getAgendaCategory(item.type)?.color;
    if (color) colors.push(color);
    if (colors.length === 3) break;
  }
  return colors;
}

function Dots({ colors }: { colors: string[] }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", gap: 2, height: 4 }}>
      {colors.map((color, index) => (
        <span key={index} style={{ width: 4, height: 4, borderRadius: 999, background: color }} />
      ))}
    </span>
  );
}

function PeriodHeader({ label, onPrev, onNext, onToday, prevLabel, nextLabel }: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      <span style={{ flexGrow: 1, fontSize: "var(--text-body)", fontWeight: 600, textTransform: "capitalize" }}>{label}</span>
      <button type="button" className="btn btn-ghost btn-icon" onClick={onPrev} aria-label={prevLabel} style={{ width: 44, height: 40 }}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="btn btn-secondary" onClick={onToday} style={{ minHeight: 36 }}>
        Hoje
      </button>
      <button type="button" className="btn btn-ghost btn-icon" onClick={onNext} aria-label={nextLabel} style={{ width: 44, height: 40 }}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Dia */

interface DayViewProps {
  items: AgendaItem[];
  dayItems: AgendaItem[];
  day: Date;
  now: Date;
  clientNames: Map<string, string>;
  onDayChange: (day: Date) => void;
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onLongPress: (item: AgendaItem) => void;
  onNew: (day: Date) => void;
  onRefresh: () => Promise<void>;
  syncing: boolean;
}

function DayView({ items, dayItems, day, now, clientNames, onDayChange, onOpen, onToggleComplete, onLongPress, onNew, onRefresh, syncing }: DayViewProps) {
  const strip = weekDays(day);
  const today = startOfDayLocal(now);
  const done = dayItems.filter((item) => item.status === "completed").length;
  const pull = usePullToRefresh(onRefresh);

  return (
    <>
      <PeriodHeader
        label={monthLabel(day)}
        onPrev={() => onDayChange(addDays(day, -7))}
        onNext={() => onDayChange(addDays(day, 7))}
        onToday={() => onDayChange(today)}
        prevLabel="Semana anterior"
        nextLabel="Próxima semana"
      />

      <SwipeArea onPrev={() => onDayChange(addDays(day, -7))} onNext={() => onDayChange(addDays(day, 7))}>
        <div role="group" aria-label="Dias da semana" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2 }}>
          {strip.map((date) => {
            const selected = isSameDay(date, day);
            const isToday = isSameDay(date, today);
            return (
              <button
                key={date.toISOString()}
                type="button"
                aria-pressed={selected}
                aria-label={`${fullDayLabel(date)}${isToday ? ", hoje" : ""}`}
                onClick={() => onDayChange(date)}
                style={{
                  height: 64,
                  padding: 0,
                  border: 0,
                  borderRadius: "var(--radius-card)",
                  background: selected ? "var(--color-terracotta-100)" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  cursor: "pointer",
                  color: "var(--color-text-primary)",
                }}
              >
                <span style={{ fontSize: "var(--text-micro)", fontWeight: 600, color: "var(--color-text-tertiary)" }}>
                  {WEEKDAYS_SHORT[date.getDay()]}
                </span>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isToday ? "var(--color-terracotta)" : "transparent",
                    color: isToday ? "var(--color-text-on-accent)" : "var(--color-text-primary)",
                    fontSize: "var(--text-body)",
                    fontWeight: isToday || selected ? 700 : 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {date.getDate()}
                </span>
                <Dots colors={dotColors(items, date)} />
              </button>
            );
          })}
        </div>
      </SwipeArea>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>
          {relativeDayLabel(day, now)}, {day.getDate()}
        </span>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>
          {dayItems.length === 0
            ? "Sem compromissos"
            : `${dayItems.length} ${dayItems.length === 1 ? "compromisso" : "compromissos"}${done ? ` · ${done} concluído${done > 1 ? "s" : ""}` : ""}`}
        </span>
      </div>

      <div {...pull.handlers}>
        <PullIndicator distance={pull.distance} refreshing={pull.refreshing || syncing} />
        <SwipeArea onPrev={() => onDayChange(addDays(day, -1))} onNext={() => onDayChange(addDays(day, 1))}>
          <DayEventList
            items={dayItems}
            day={day}
            now={now}
            clientNames={clientNames}
            size="mobile"
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            onLongPress={onLongPress}
            emptyAction={
              <button type="button" className="btn btn-accent" onClick={() => onNew(day)} style={{ minHeight: 44 }}>
                <Plus size={15} /> Novo compromisso
              </button>
            }
          />
        </SwipeArea>
      </div>
    </>
  );
}

function PullIndicator({ distance, refreshing }: { distance: number; refreshing: boolean }) {
  if (distance <= 0 && !refreshing) return null;
  const ready = distance >= PULL_TRIGGER_PX;
  return (
    <div
      role="status"
      style={{
        height: refreshing ? 36 : Math.min(distance, 44),
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: "var(--text-caption)",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
      }}
    >
      <Loader2 size={14} style={{ animation: refreshing ? "agenda-spin 1s linear infinite" : "none" }} aria-hidden="true" />
      {refreshing ? "Sincronizando com o Google…" : ready ? "Solte para sincronizar" : "Puxe para sincronizar"}
    </div>
  );
}

/**
 * Puxar para baixo no topo da página sincroniza com o Google. A página rola
 * dentro de `.admin-content-area`, não na janela — por isso o scrollTop vem de lá.
 */
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const scrollTopOf = (target: EventTarget) => {
    const scroller = (target as HTMLElement).closest?.(".admin-content-area");
    return scroller ? scroller.scrollTop : window.scrollY;
  };

  const handlers = {
    onTouchStart: (event: TouchEvent) => {
      startY.current = scrollTopOf(event.target) <= 0 ? event.touches[0].clientY : null;
    },
    onTouchMove: (event: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = event.touches[0].clientY - startY.current;
      setDistance(dy > 0 ? Math.min(dy * 0.5, PULL_MAX_PX) : 0);
    },
    onTouchEnd: async () => {
      const shouldRefresh = distance >= PULL_TRIGGER_PX;
      startY.current = null;
      setDistance(0);
      if (!shouldRefresh || refreshing) return;
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    },
  };

  return { handlers, distance, refreshing };
}

/* ------------------------------------------------------------------ Mês */

interface MonthViewProps {
  items: AgendaItem[];
  dayItems: AgendaItem[];
  day: Date;
  now: Date;
  activeCategories: string[];
  onDayChange: (day: Date) => void;
  onToggleCategory: (id: string) => void;
  onResetCategories: () => void;
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onNew: (day: Date) => void;
}

function MonthView({ items, dayItems, day, now, activeCategories, onDayChange, onToggleCategory, onResetCategories, onOpen, onNew }: MonthViewProps) {
  const grid = useMemo(() => monthGrid(day), [day]);
  const today = startOfDayLocal(now);
  const allActive = activeCategories.length === AGENDA_CATEGORIES.length;

  return (
    <>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", margin: "0 -16px", padding: "0 16px" }}>
        <button
          type="button"
          aria-pressed={allActive}
          onClick={onResetCategories}
          style={chipStyle(allActive, "var(--color-terracotta-200)", "var(--color-terracotta-100)")}
        >
          <span style={{ color: allActive ? "var(--color-terracotta-ink)" : undefined }}>Todos</span>
        </button>
        {AGENDA_CATEGORIES.map((category) => {
          const active = activeCategories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleCategory(category.id)}
              style={chipStyle(active && !allActive, category.color, tint(category.color, 12))}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: category.color, opacity: active ? 1 : 0.35 }} />
              {category.label}
            </button>
          );
        })}
      </div>

      <PeriodHeader
        label={monthLabel(day)}
        onPrev={() => onDayChange(addMonths(day, -1))}
        onNext={() => onDayChange(addMonths(day, 1))}
        onToday={() => onDayChange(today)}
        prevLabel="Mês anterior"
        nextLabel="Próximo mês"
      />

      <SwipeArea onPrev={() => onDayChange(addMonths(day, -1))} onNext={() => onDayChange(addMonths(day, 1))}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} aria-hidden="true">
          {[1, 2, 3, 4, 5, 6, 0].map((index) => (
            <span key={index} style={{ textAlign: "center", paddingBottom: 4, fontSize: "var(--text-micro)", fontWeight: 600, color: "var(--color-text-tertiary)" }}>
              {WEEKDAYS_SHORT[index].slice(0, 1)}
            </span>
          ))}
        </div>
        <div role="grid" aria-label={monthLabel(day)} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {grid.map((date) => {
            const inMonth = date.getMonth() === day.getMonth();
            const selected = isSameDay(date, day);
            const isToday = isSameDay(date, today);
            return (
              <button
                key={date.toISOString()}
                type="button"
                role="gridcell"
                aria-selected={selected}
                aria-label={fullDayLabel(date)}
                onClick={() => onDayChange(date)}
                style={{
                  height: 46,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    boxSizing: "border-box",
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isToday ? "var(--color-terracotta)" : selected ? "var(--color-terracotta-100)" : "transparent",
                    border: selected && !isToday ? "1.5px solid var(--color-terracotta)" : "1.5px solid transparent",
                    color: isToday ? "var(--color-text-on-accent)" : inMonth ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    fontSize: "var(--text-ui)",
                    fontWeight: isToday || selected ? 700 : 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {date.getDate()}
                </span>
                <Dots colors={dotColors(items, date)} />
              </button>
            );
          })}
        </div>
      </SwipeArea>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>{fullDayLabel(day)}</span>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>
          {dayItems.length} {dayItems.length === 1 ? "compromisso" : "compromissos"}
        </span>
      </div>

      {dayItems.length === 0 ? (
        <button type="button" className="btn btn-secondary" onClick={() => onNew(day)} style={{ minHeight: 44 }}>
          <Plus size={15} /> Novo compromisso neste dia
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {dayItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => onOpen(item, { x: event.clientX, y: event.clientY })}
              style={{
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 0,
                border: 0,
                borderBottom: "1px solid var(--color-border-subtle)",
                background: "transparent",
                textAlign: "left",
                color: "var(--color-text-primary)",
                cursor: "pointer",
                opacity: item.status === "completed" ? 0.6 : 1,
              }}
            >
              <span style={{ width: 44, flexShrink: 0, fontSize: "var(--text-data)", fontWeight: 600, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                {item.allDay ? "dia todo" : timeLabel(item)}
              </span>
              <span aria-hidden="true" style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 999, background: getAgendaCategory(item.type)?.color }} />
              <span
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontSize: "var(--text-body)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textDecoration: item.status === "completed" ? "line-through" : "none",
                }}
              >
                {item.title}
              </span>
              <ChevronRight size={16} aria-hidden="true" color="var(--color-text-muted)" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function chipStyle(active: boolean, borderColor: string, background: string) {
  return {
    flexShrink: 0,
    minHeight: 36,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0 12px",
    borderRadius: 999,
    border: `1px solid ${active ? borderColor : "var(--color-border-subtle)"}`,
    background: active ? background : "var(--color-surface-raised)",
    color: "var(--color-text-primary)",
    fontSize: "var(--text-ui)",
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
  } as const;
}

/* ---------------------------------------------------------------- Lista */

interface ListViewProps {
  items: AgendaItem[];
  now: Date;
  clientNames: Map<string, string>;
  onOpen: (item: AgendaItem, point: OpenPoint) => void;
  onToggleComplete: (item: AgendaItem) => void;
  onLongPress: (item: AgendaItem) => void;
}

function ListView({ items, now, clientNames, onOpen, onToggleComplete, onLongPress }: ListViewProps) {
  const groups = useMemo(() => {
    const from = startOfDayLocal(now).getTime();
    const until = addDays(startOfDayLocal(now), LIST_HORIZON_DAYS).getTime();
    return groupByDay(items.filter((item) => item.start.getTime() >= from && item.start.getTime() < until));
  }, [items, now]);

  if (groups.length === 0) {
    return (
      <p style={{ margin: "24px 0", textAlign: "center", fontSize: "var(--text-ui)", color: "var(--color-text-secondary)" }}>
        Nenhum compromisso nos próximos {LIST_HORIZON_DAYS} dias.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {groups.map((group) => (
        <section key={group.day.toISOString()} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-micro)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>
            {dayHeading(group.day, now)}
          </h2>
          <DayEventList
            items={group.items}
            day={group.day}
            now={now}
            clientNames={clientNames}
            size="mobile"
            onOpen={onOpen}
            onToggleComplete={onToggleComplete}
            onLongPress={onLongPress}
          />
        </section>
      ))}
    </div>
  );
}
