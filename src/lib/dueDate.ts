// ============================================================================
// Prazos em linguagem natural para a área de Demandas.
//
// O projeto não usa date-fns nem dayjs — só Date nativo (ver toLocalISOString
// em src/app/admin/schedule/page.tsx). Tudo aqui trabalha em horário LOCAL:
// nunca usar new Date('YYYY-MM-DD'), que é interpretado como UTC e volta um
// dia atrás nos fusos negativos.
// ============================================================================

export type DueBucket =
  | 'atrasada'
  | 'hoje'
  | 'amanha'
  | 'semana'
  | 'depois'
  | 'sem_data';

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal' | 'muted';

export interface DueDateLabel {
  label: string;
  tone: DueTone;
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** Chaves de busca por dia da semana, sem acento e sem "-feira". */
const WEEKDAY_KEYS = [
  ['domingo', 'dom'],
  ['segunda', 'seg'],
  ['terca', 'ter'],
  ['quarta', 'qua'],
  ['quinta', 'qui'],
  ['sexta', 'sex'],
  ['sabado', 'sab'],
];

const BUCKET_LABELS: Record<DueBucket, string> = {
  atrasada: 'Atrasadas',
  hoje: 'Hoje',
  amanha: 'Amanhã',
  semana: 'Esta semana',
  depois: 'Depois',
  sem_data: 'Sem prazo',
};

export const DUE_BUCKET_ORDER: DueBucket[] = [
  'atrasada',
  'hoje',
  'amanha',
  'semana',
  'depois',
  'sem_data',
];

export function dueBucketLabel(bucket: DueBucket): string {
  return BUCKET_LABELS[bucket];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date -> 'YYYY-MM-DD' no fuso local. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' -> Date à meia-noite local (aceita timestamps completos). */
export function fromISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Meia-noite local do dia informado (padrão: hoje). */
export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Diferença em dias inteiros entre dois dias (positivo = futuro). */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Próxima ocorrência do dia da semana (hoje mesmo NÃO conta — vai para a semana seguinte). */
function nextWeekday(from: Date, weekday: number): Date {
  const today = startOfDay(from);
  const delta = (weekday - today.getDay() + 7) % 7;
  return addDays(today, delta === 0 ? 7 : delta);
}

/**
 * Interpreta prazo escrito à mão e devolve 'YYYY-MM-DD', ou null se não entender.
 *
 * Aceita: hoje, amanhã, depois de amanhã, ontem, próxima semana, dias da semana
 * ("segunda", "sexta-feira", "próxima quinta"), "em 3 dias", "+3",
 * dd/mm, dd/mm/aa, dd/mm/aaaa e aaaa-mm-dd.
 */
export function parseDueDateInput(input: string, now: Date = new Date()): string | null {
  const text = normalize(input);
  if (!text) return null;

  if (text === 'sem data' || text === 'sem prazo' || text === 'nenhum') return null;
  if (text === 'hoje') return toISODate(startOfDay(now));
  if (text === 'ontem') return toISODate(addDays(now, -1));
  if (text === 'amanha') return toISODate(addDays(now, 1));
  if (text === 'depois de amanha') return toISODate(addDays(now, 2));
  if (text === 'proxima semana' || text === 'semana que vem') return toISODate(addDays(now, 7));
  if (text === 'proximo mes' || text === 'mes que vem') {
    const base = startOfDay(now);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
    return toISODate(next);
  }

  // "em 3 dias" / "3 dias" / "+3"
  const relative = /^(?:em\s+)?\+?(\d{1,3})\s*(?:d|dias?)?$/.exec(text);
  if (relative && /d|\+|em/.test(text)) {
    return toISODate(addDays(now, Number(relative[1])));
  }

  // aaaa-mm-dd
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : toISODate(date);
  }

  // dd/mm, dd/mm/aa, dd/mm/aaaa (também aceita separador ponto ou hífen)
  const brMatch = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(text);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    let year = startOfDay(now).getFullYear();
    if (brMatch[3]) {
      year = brMatch[3].length === 2 ? 2000 + Number(brMatch[3]) : Number(brMatch[3]);
    }
    const date = new Date(year, month - 1, day);
    // Rejeita datas que "estouram" o mês (ex.: 31/02 vira 03/03)
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return toISODate(date);
  }

  // Dias da semana, com ou sem "próxima"/"que vem" e com ou sem "-feira"
  const weekdayText = text
    .replace(/^(proxima|proximo|prox\.?)\s+/, '')
    .replace(/\s+(que vem)$/, '')
    .replace(/-?feira$/, '')
    .trim();

  for (let i = 0; i < WEEKDAY_KEYS.length; i++) {
    if (WEEKDAY_KEYS[i].includes(weekdayText)) {
      return toISODate(nextWeekday(now, i));
    }
  }

  return null;
}

/** Rótulo curto do prazo + tom para colorir (estilo Todoist). */
export function formatDueDateLabel(
  iso: string | null | undefined,
  now: Date = new Date(),
): DueDateLabel {
  if (!iso) return { label: 'Sem prazo', tone: 'muted' };

  const date = fromISODate(iso);
  if (!date) return { label: 'Sem prazo', tone: 'muted' };

  const diff = daysBetween(now, date);

  if (diff === 0) return { label: 'Hoje', tone: 'today' };
  if (diff === 1) return { label: 'Amanhã', tone: 'soon' };
  if (diff === -1) return { label: 'Ontem', tone: 'overdue' };

  const tone: DueTone = diff < 0 ? 'overdue' : diff <= 6 ? 'soon' : 'normal';

  // Dentro dos próximos 6 dias mostra o dia da semana, como no Todoist
  if (diff > 1 && diff <= 6) {
    const name = WEEKDAYS[date.getDay()];
    return { label: name.charAt(0).toUpperCase() + name.slice(1), tone };
  }

  const sameYear = date.getFullYear() === startOfDay(now).getFullYear();
  const label = sameYear
    ? `${date.getDate()} de ${MONTHS_SHORT[date.getMonth()]}`
    : `${date.getDate()} de ${MONTHS_SHORT[date.getMonth()]} de ${date.getFullYear()}`;

  return { label, tone };
}

/** Grupo da visualização em lista. */
export function dueDateBucket(
  iso: string | null | undefined,
  now: Date = new Date(),
): DueBucket {
  if (!iso) return 'sem_data';
  const date = fromISODate(iso);
  if (!date) return 'sem_data';

  const diff = daysBetween(now, date);
  if (diff < 0) return 'atrasada';
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanha';
  if (diff <= 7) return 'semana';
  return 'depois';
}

/**
 * Grupo da lista para UMA demanda específica, considerando conclusão: uma
 * demanda concluída DENTRO do prazo não deve continuar aparecendo em
 * "Atrasadas" só porque hoje já passou daquela data — ela foi entregue a
 * tempo. "Atrasada" de verdade é quem segue aberta e já passou do prazo, ou
 * quem só foi concluída DEPOIS do prazo (aí o grupo reflete o atraso real,
 * calculado no instante da conclusão em vez de "agora").
 */
export function demandDueBucket(
  dueDate: string | null | undefined,
  isDone: boolean,
  completedAt: string | null | undefined,
  now: Date = new Date(),
): DueBucket {
  if (isDone && completedAt) {
    return dueDateBucket(dueDate, new Date(completedAt));
  }
  return dueDateBucket(dueDate, now);
}

/** Formata 'HH:MM:SS' (coluna TIME do Postgres) como 'HH:MM'. */
export function formatDueTime(time: string | null | undefined): string {
  if (!time) return '';
  const match = /^(\d{2}):(\d{2})/.exec(time);
  return match ? `${match[1]}:${match[2]}` : '';
}
