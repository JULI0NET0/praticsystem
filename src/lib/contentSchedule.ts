// ============================================================================
// Datas de um cronograma de conteúdo.
//
// Funções PURAS e determinísticas — mesma entrada, mesma saída, sem Date.now().
// É a peça que, errada, gera o mês inteiro torto sem avisar ninguém, então
// tudo aqui é testável isoladamente.
//
// Origem: `selectEditorialDates` de src/mocks/operacao/editorialCalendar.ts,
// generalizada para aceitar também "N semanas a partir de uma data" — o
// protótipo só sabia fatiar um mês fechado a partir do dia 1.
// ============================================================================

/** 0 = domingo … 6 = sábado, igual a Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PeriodKind = 'month' | 'weeks';

export interface SchedulePeriod {
  kind: PeriodKind;
  /** 'YYYY-MM' ou 'Set/2026' — usado quando kind = 'month'. */
  monthRef?: string;
  /** 'YYYY-MM-DD' — usado quando kind = 'weeks'. */
  startDate?: string;
  /** Quantas semanas contar. Ignorado em 'month', que cobre o mês inteiro. */
  weeks?: number;
}

export interface ScheduleInput {
  period: SchedulePeriod;
  postsPerWeek: number;
  weekdays: Weekday[];
  /**
   * 'YYYY-MM-DD'. Nada antes desta data é gerado — é o "começar na 2ª
   * terça", para programar um ciclo que só sai daqui a 15 dias. O corte
   * acontece ANTES de contar quantos cabem na semana, senão a primeira
   * janela gastaria a cota em datas descartadas.
   */
  notBefore?: string | null;
}

const MONTH_ABBR: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

/** Aceita "Jul/2026", "2026-07" ou "2026-07-01" → { year, month0 }. */
export function parseMonthRef(
  monthRef: string,
  fallback: Date = new Date(),
): { year: number; month0: number } {
  const iso = monthRef.match(/^(\d{4})-(\d{2})/);
  if (iso) return { year: Number(iso[1]), month0: Number(iso[2]) - 1 };

  const br = monthRef.match(/^([A-Za-zç]{3})\w*\/?(\d{4})$/);
  if (br) {
    const month0 = MONTH_ABBR[br[1].toLowerCase().slice(0, 3)];
    if (month0 !== undefined) return { year: Number(br[2]), month0 };
  }

  return { year: fallback.getFullYear(), month0: fallback.getMonth() };
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Date -> 'YYYY-MM-DD' no fuso local. */
export function toISODateLocal(date: Date): string {
  return toISODate(date);
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Quebra o período em janelas de 7 dias. A distribuição "N por semana" é
 * feita dentro de cada janela, e não no período todo — senão 3 posts/semana
 * numa segunda-feira poderiam cair todos na primeira semana.
 */
function weekWindows(period: SchedulePeriod): Date[][] {
  if (period.kind === 'weeks') {
    const start = period.startDate ? fromISODate(period.startDate) : null;
    if (!start) return [];
    const weeks = Math.max(1, period.weeks ?? 4);

    return Array.from({ length: weeks }, (_, index) => {
      const windowStart = addDays(start, index * 7);
      return Array.from({ length: 7 }, (_, day) => addDays(windowStart, day));
    });
  }

  // Mês fechado: janelas a partir do dia 1, sem transbordar para o mês seguinte
  const { year, month0 } = parseMonthRef(period.monthRef ?? '');
  const total = daysInMonth(year, month0);
  const windows: Date[][] = [];

  for (let firstDay = 1; firstDay <= total; firstDay += 7) {
    const lastDay = Math.min(firstDay + 6, total);
    const days: Date[] = [];
    for (let day = firstDay; day <= lastDay; day++) days.push(new Date(year, month0, day));
    windows.push(days);
  }
  return windows;
}

/**
 * Datas de publicação do cronograma, em ordem crescente.
 * Em cada janela de 7 dias escolhe até `postsPerWeek` dias que caiam nos
 * `weekdays` pedidos.
 */
export function selectScheduleDates(input: ScheduleInput): string[] {
  const wanted = new Set<number>(input.weekdays);
  if (wanted.size === 0 || input.postsPerWeek <= 0) return [];

  const floor = input.notBefore ?? null;
  const dates: string[] = [];

  for (const window of weekWindows(input.period)) {
    let picked = 0;
    for (const day of window) {
      if (picked >= input.postsPerWeek) break;
      if (!wanted.has(day.getDay())) continue;
      const iso = toISODate(day);
      // Descartado sem consumir a cota da semana
      if (floor && iso < floor) continue;
      dates.push(iso);
      picked += 1;
    }
  }
  return dates;
}

/** Rótulo legível da competência: '2026-09' → 'Setembro/2026'. */
export function formatMonthRef(monthRef: string): string {
  const { year, month0 } = parseMonthRef(monthRef);
  const name = new Date(year, month0, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${year}`;
}

/**
 * Datas das captações no período, distribuídas de forma espaçada.
 * `capture_frequency` no contrato é texto livre ("1x meia-diária", "1 meia
 * diária"), então o número é extraído do texto e o resto é ignorado.
 */
export function selectCaptureDates(
  period: SchedulePeriod,
  frequencyText: string | null | undefined,
  notBefore?: string | null,
): string[] {
  const perMonth = capturesPerPeriod(frequencyText);
  if (perMonth <= 0) return [];

  const windows = weekWindows(period);
  if (windows.length === 0) return [];

  // Espalha as captações pelas semanas: 1 por mês cai na 1ª semana,
  // 2 caem na 1ª e na 3ª, e assim por diante.
  const step = windows.length / perMonth;
  const dates: string[] = [];

  for (let index = 0; index < perMonth; index++) {
    const window = windows[Math.min(Math.floor(index * step), windows.length - 1)];
    // Dia útil no meio da semana, para não cair em fim de semana
    const candidates = window.filter((day) => !notBefore || toISODate(day) >= notBefore);
    if (candidates.length === 0) continue;
    const target = candidates.find((day) => day.getDay() >= 2 && day.getDay() <= 4) ?? candidates[0];
    const iso = toISODate(target);
    if (!dates.includes(iso)) dates.push(iso);
  }
  return dates;
}

/** "1x meia-diária" → 1 · "2 diárias" → 2 · vazio → 0. */
export function capturesPerPeriod(frequencyText: string | null | undefined): number {
  if (!frequencyText) return 0;
  const match = /(\d+)/.exec(frequencyText);
  if (!match) return 1; // texto sem número mas preenchido = ao menos uma
  return Math.max(0, Math.min(Number(match[1]), 12));
}

/** Desloca 'YYYY-MM-DD' em N dias (negativo volta), no fuso local. */
export function shiftISODate(iso: string, days: number): string {
  const date = fromISODate(iso);
  if (!date) return iso;
  return toISODate(addDays(date, days));
}

export interface CadenceReassignInput {
  /** Ordem desejada dos conteúdos que podem mudar de data. */
  movableIds: string[];
  /**
   * Datas que esses conteúdos já ocupam. A ordem daqui não importa:
   * as vagas são reaproveitadas em ordem cronológica. `null` não vira vaga
   * — o conteúdo sem data recebe a próxima data gerada.
   */
  freeDates: (string | null | undefined)[];
  /** Datas de conteúdos já publicados. Não são reatribuídas. */
  pinnedDates?: (string | null | undefined)[];
  weekdays: Weekday[];
  postsPerWeek: number;
  /**
   * Só entra em cena quando não há nenhuma data na fila. A primeira vaga
   * gerada parte daqui, inclusive.
   */
  anchor?: string | null;
}

export interface CadenceAssignment {
  id: string;
  date: string;
}

/**
 * Remaneja a fila de conteúdos sobre a cadência do plano.
 *
 * Sem item novo, as datas que já existem só trocam de dono. Com item a mais,
 * a vaga que falta é o próximo dia da semana do plano depois da última data,
 * respeitando `postsPerWeek` na semana de segunda a domingo. Pode cair no
 * mês seguinte.
 */
export function reassignCadenceDates(input: CadenceReassignInput): CadenceAssignment[] {
  const weekdays = new Set<number>(input.weekdays);
  const postsPerWeek = Math.max(0, input.postsPerWeek);
  const slots = input.freeDates.filter(isISODate).sort();
  const pinned = (input.pinnedDates ?? []).filter(isISODate);
  const taken = [...slots, ...pinned];

  while (slots.length < input.movableIds.length) {
    const latest = latestISO(taken);
    const next = nextCadenceDate({
      afterExclusive: latest,
      startInclusive: latest ? null : input.anchor ?? null,
      weekdays,
      postsPerWeek,
      taken,
    });
    if (!next) break;
    slots.push(next);
    taken.push(next);
  }

  return input.movableIds.slice(0, slots.length).map((id, index) => ({
    id,
    date: slots[index],
  }));
}

function isISODate(value: string | null | undefined): value is string {
  return !!value && !!fromISODate(value);
}

function latestISO(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((latest, iso) => (iso > latest ? iso : latest));
}

/** Segunda-feira da semana calendário de `iso` (domingo pertence à semana anterior). */
function mondayOf(iso: string): string | null {
  const date = fromISODate(iso);
  if (!date) return null;
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return toISODate(addDays(date, diff));
}

function cadenceCountInWeek(monday: string, taken: string[], weekdays: Set<number>): number {
  let count = 0;
  for (const iso of taken) {
    if (mondayOf(iso) !== monday) continue;
    const date = fromISODate(iso);
    if (date && weekdays.has(date.getDay())) count += 1;
  }
  return count;
}

function nextCadenceDate(input: {
  afterExclusive: string | null;
  startInclusive: string | null;
  weekdays: Set<number>;
  postsPerWeek: number;
  taken: string[];
}): string | null {
  if (input.weekdays.size === 0 || input.postsPerWeek <= 0) return null;

  const start = input.afterExclusive
    ? shiftISODate(input.afterExclusive, 1)
    : input.startInclusive;
  const cursor = start ? fromISODate(start) : null;
  if (!cursor) return null;

  const occupied = new Set(input.taken);
  for (let step = 0; step < 800; step += 1) {
    const day = addDays(cursor, step);
    if (!input.weekdays.has(day.getDay())) continue;
    const iso = toISODate(day);
    if (occupied.has(iso)) continue;
    const monday = mondayOf(iso);
    if (!monday) continue;
    if (cadenceCountInWeek(monday, input.taken, input.weekdays) >= input.postsPerWeek) continue;
    return iso;
  }
  return null;
}
