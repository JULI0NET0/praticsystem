import type { ScheduledRecurrence } from '@/types/database';

export const MAX_AHEAD = 12;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Próxima ocorrência depois de `from` segundo a regra (soma `interval` unidades). */
export function nextOccurrence(from: Date, rec: ScheduledRecurrence): Date {
  const n = Math.max(1, rec.interval || 1);
  if (rec.freq === 'monthly') return addMonths(from, n);
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + (rec.freq === 'weekly' ? 7 * n : n));
  return next;
}

/**
 * Datas de uma série a partir de `start` (inclusive), respeitando `until` e `count`
 * (total da série, contando as já criadas em `alreadyCreated`) e o limite de `max` à frente.
 */
export function expandOccurrences(
  start: Date,
  rec: ScheduledRecurrence | null | undefined,
  opts: { max?: number; alreadyCreated?: number } = {}
): Date[] {
  const max = opts.max ?? MAX_AHEAD;
  if (!rec) return [start];
  const until = rec.until ? new Date(rec.until) : null;
  const total = rec.count ?? Infinity;
  const out: Date[] = [];
  let cur = start;
  let created = opts.alreadyCreated ?? 0;
  while (out.length < max && created < total && (!until || cur <= until)) {
    out.push(cur);
    created++;
    cur = nextOccurrence(cur, rec);
  }
  return out;
}

/** Horário comercial de São Paulo (8h–20h): fora disso o aviso de risco de bloqueio aparece. */
export function isOutsideBusinessHours(date: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(date));
  return hour < 8 || hour >= 20;
}

export const RECURRENCE_LABEL: Record<ScheduledRecurrence['freq'], string> = {
  daily: 'Todo dia',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
};

export function describeRecurrence(rec?: ScheduledRecurrence | null): string {
  if (!rec) return '';
  const every = rec.interval > 1 ? ` (a cada ${rec.interval})` : '';
  const end = rec.until ? ` até ${new Date(rec.until).toLocaleDateString('pt-BR')}` : rec.count ? `, ${rec.count} vezes` : '';
  return `${RECURRENCE_LABEL[rec.freq]}${every}${end}`;
}
