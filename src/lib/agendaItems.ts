// ============================================================================
// Modelo e utilitários de data da Agenda.
//
// Tudo em horário LOCAL (ver o cabeçalho de dueDate.ts): nunca
// new Date('YYYY-MM-DD'), que o JS lê como UTC e volta um dia nos fusos
// negativos. Sem date-fns — só Date nativo, como no resto do projeto.
// ============================================================================

import { fromISODate, toISODate } from "@/lib/dueDate";

/** Compromisso já normalizado, independente de FullCalendar ou da tela. */
export interface AgendaItem {
  id: string;
  title: string;
  start: Date;
  allDay: boolean;
  type: string;
  status: string;
  visibility: string;
  description: string;
  clientId: string | null;
  googleEventId: string | null;
  googleAccount: string | null;
  /** Compromisso-espelho de uma demanda: só se edita pela demanda. */
  demandId: string | null;
  assignedTo: string | null;
  assigneeIds: string[];
  assignAllTeam: boolean;
  /** Vencimento de fatura exibido como compromisso (somente leitura). */
  isInvoice: boolean;
  invoiceStatus: string | null;
}

export interface AgendaDayGroup {
  day: Date;
  items: AgendaItem[];
}

export const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const WEEKDAYS_LONG = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
export const MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** O que a lista mobile mostra a partir do dia selecionado. */
export type AgendaListScope = "day" | "week" | "nextWeek" | "month";

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  next.setHours(date.getHours(), date.getMinutes(), 0, 0);
  return next;
}

/** Soma meses preservando o dia quando possível (31/01 + 1 mês = 28/02). */
export function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Segunda-feira da semana de `date` (a semana da Agenda começa na segunda). */
export function startOfWeekMonday(date: Date): Date {
  const day = startOfDayLocal(date);
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

export function weekDays(date: Date): Date[] {
  const monday = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Grade de um mês em semanas de segunda a domingo (35 ou 42 células). */
export function monthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeekMonday(first);
  const end = addDays(startOfWeekMonday(last), 6);
  const total = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Array.from({ length: total }, (_, i) => addDays(start, i));
}

export function monthLabel(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function weekdayLong(date: Date): string {
  return WEEKDAYS_LONG[date.getDay()];
}

/** "Hoje", "Amanhã" ou o dia da semana — o "olho" do painel do dia. */
export function relativeDayLabel(day: Date, today: Date = new Date()): string {
  const diff = Math.round(
    (startOfDayLocal(day).getTime() - startOfDayLocal(today).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return weekdayLong(day);
}

export function fullDayLabel(day: Date): string {
  return `${weekdayLong(day)}, ${day.getDate()} de ${MONTHS_LONG[day.getMonth()].toLowerCase()}`;
}

/** Cabeçalho de grupo: "Hoje, 28 de setembro" ou "Sexta, 2 de outubro" (sem repetir o dia da semana). */
export function dayHeading(day: Date, today: Date = new Date()): string {
  const relative = relativeDayLabel(day, today);
  if (relative === "Hoje" || relative === "Amanhã" || relative === "Ontem") {
    return `${relative}, ${day.getDate()} de ${MONTHS_LONG[day.getMonth()].toLowerCase()}`;
  }
  return fullDayLabel(day);
}

export function timeLabel(item: Pick<AgendaItem, "start" | "allDay">): string {
  if (item.allDay) return "dia todo";
  const h = String(item.start.getHours()).padStart(2, "0");
  const m = String(item.start.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Ordena o dia: "dia todo" primeiro, depois por horário. */
export function compareItems(a: AgendaItem, b: AgendaItem): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.start.getTime() - b.start.getTime();
}

export function itemsOnDay(items: AgendaItem[], day: Date): AgendaItem[] {
  return items.filter((item) => isSameDay(item.start, day)).sort(compareItems);
}

/**
 * Intervalo meio-aberto [start, end) do filtro da lista.
 * Semana começa na segunda. "Próxima" é a semana seguinte à do dia.
 */
export function scopeRange(day: Date, scope: AgendaListScope): DateRange {
  if (scope === "week" || scope === "nextWeek") {
    const monday = startOfWeekMonday(day);
    const start = scope === "nextWeek" ? addDays(monday, 7) : monday;
    return { start, end: addDays(start, 7) };
  }
  if (scope === "month") {
    const start = new Date(day.getFullYear(), day.getMonth(), 1);
    return { start, end: new Date(day.getFullYear(), day.getMonth() + 1, 1) };
  }
  const start = startOfDayLocal(day);
  return { start, end: addDays(start, 1) };
}

/** Compromissos com início em [start, end), em ordem cronológica. */
export function itemsBetween(items: AgendaItem[], start: Date, end: Date): AgendaItem[] {
  const from = start.getTime();
  const until = end.getTime();
  return items
    .filter((item) => item.start.getTime() >= from && item.start.getTime() < until)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || compareItems(a, b));
}

/** Agrupa por dia, do mais próximo ao mais distante, só dias com compromissos. */
export function groupByDay(items: AgendaItem[]): AgendaDayGroup[] {
  const groups = new Map<string, AgendaDayGroup>();
  for (const item of [...items].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const key = toISODate(item.start);
    const group = groups.get(key) ?? { day: startOfDayLocal(item.start), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    day: group.day,
    items: group.items.sort(compareItems),
  }));
}

/** Próximos compromissos a partir do dia seguinte a `day`. */
export function upcomingAfter(items: AgendaItem[], day: Date, limit: number): AgendaItem[] {
  const from = addDays(startOfDayLocal(day), 1).getTime();
  return items
    .filter((item) => item.status !== "completed" && item.start.getTime() >= from)
    .sort(
      (a, b) =>
        startOfDayLocal(a.start).getTime() - startOfDayLocal(b.start).getTime() ||
        compareItems(a, b),
    )
    .slice(0, limit);
}

/** Valor do <input type="datetime-local"> em horário local. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Vencimento de fatura: 'YYYY-MM-DD' vira meia-noite LOCAL, não UTC. */
export function parseItemStart(value: string, allDay: boolean): Date {
  if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) return fromISODate(value) ?? new Date(value);
  return new Date(value);
}

export interface RawAgendaEvent {
  id: string;
  title?: string | null;
  date: string;
  type?: string | null;
  status?: string | null;
  visibility?: string | null;
  description?: string | null;
  client_id?: string | null;
  google_event_id?: string | null;
  google_account?: string | null;
  demand_id?: string | null;
  assigned_to?: string | null;
  demands?: { assignee_ids?: string[] | null; assign_all_team?: boolean | null } | null;
}

export function itemFromAgendaEvent(event: RawAgendaEvent): AgendaItem {
  return {
    id: event.id,
    title: event.title ?? "",
    start: parseItemStart(event.date, false),
    allDay: false,
    type: event.type ?? "meeting",
    status: event.status ?? "scheduled",
    visibility: event.visibility ?? "public",
    description: event.description ?? "",
    clientId: event.client_id ?? null,
    googleEventId: event.google_event_id ?? null,
    googleAccount: event.google_account ?? null,
    demandId: event.demand_id ?? null,
    assignedTo: event.assigned_to ?? null,
    assigneeIds: Array.isArray(event.demands?.assignee_ids) ? event.demands.assignee_ids : [],
    assignAllTeam: Boolean(event.demands?.assign_all_team),
    isInvoice: false,
    invoiceStatus: null,
  };
}

export interface RawInvoice {
  id: string;
  due_date: string;
  status?: string | null;
  client_id?: string | null;
}

export function itemFromInvoice(invoice: RawInvoice, clientName: string): AgendaItem {
  return {
    id: `inv-${invoice.id}`,
    title: `Pagamento: ${clientName}`,
    start: parseItemStart(invoice.due_date, true),
    allDay: true,
    type: "payment",
    status: "scheduled",
    visibility: "public",
    description: "",
    clientId: invoice.client_id ?? null,
    googleEventId: null,
    googleAccount: null,
    demandId: null,
    assignedTo: null,
    assigneeIds: [],
    assignAllTeam: false,
    isInvoice: true,
    invoiceStatus: invoice.status ?? null,
  };
}

/** Regra de filtro por responsável — a mesma que a página já usava. */
export function matchesResponsible(item: AgendaItem, userId: string | null): boolean {
  if (!userId) return true;
  return (
    item.assignedTo === userId ||
    item.assigneeIds.includes(userId) ||
    item.assignAllTeam
  );
}
