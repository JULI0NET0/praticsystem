// ============================================================================
// Atalhos digitados no próprio título da demanda (estilo Todoist/Linear):
//
//   "Ajustar banner #Cold Joias @Julio sexta 14h P1"
//    -> título "Ajustar banner", cliente Cold Joias, responsável Julio,
//       prazo na próxima sexta às 14:00, prioridade urgente.
//
// Tudo que é reconhecido sai do título, para o texto não guardar a sintaxe.
// ============================================================================

import { parseDueDateInput } from './dueDate';
import { parsePriorityToken, type DemandPriority } from '@/types/demandas';

export type QuickTokenKind = 'client' | 'assignee' | 'priority' | 'date' | 'time';

export interface QuickToken {
  kind: QuickTokenKind;
  /** Trecho exato consumido do título. */
  raw: string;
  /** Rótulo legível para o chip de confirmação. */
  label: string;
}

export interface QuickCatalogItem {
  id: string;
  label: string;
  /** Nome alternativo também aceito (ex.: razão social do cliente). */
  alias?: string | null;
}

export interface QuickParseResult {
  title: string;
  clientId: string | null;
  assigneeIds: string[];
  priority: DemandPriority | null;
  dueDate: string | null;
  dueTime: string | null;
  tokens: QuickToken[];
}

export interface QuickCatalogs {
  clients: QuickCatalogItem[];
  users: QuickCatalogItem[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Palavras de data reconhecidas soltas no título (sem prefixo). */
const DATE_WORD = String.raw`depois de amanh[aã]|hoje|amanh[aã]|ontem|pr[oó]xima semana|semana que vem|`
  + String.raw`(?:pr[oó]xim[ao]\s+)?(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-?feira)?(?:\s+que\s+vem)?|`
  + String.raw`em\s+\d{1,3}\s+dias?|\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?`;

const DATE_RE = new RegExp(String.raw`(?:^|\s)(${DATE_WORD})(?=\s|$)`, 'i');
// 14h, 14h30, 14:30, às 9h — o "h"/":" é o que separa hora de data (03/09)
const TIME_RE = /(?:^|\s)(?:[àa]s\s+)?(\d{1,2})(?::(\d{2})|h(\d{2})?)(?=\s|$)/i;
const PRIORITY_RE = /(?:^|\s)(p[1-5])(?=\s|$)/i;

/**
 * Casa o nome MAIS LONGO do catálogo que começa logo depois do marcador.
 * Preciso porque os nomes têm espaço ("#Cold Joias"): um `\S+` pegaria
 * só "Cold" e deixaria "Joias" perdido no título.
 */
function matchCatalog(
  rest: string,
  catalog: QuickCatalogItem[],
): { item: QuickCatalogItem; consumed: number } | null {
  const haystack = normalize(rest);
  let best: { item: QuickCatalogItem; consumed: number } | null = null;

  for (const item of catalog) {
    for (const rawCandidate of [item.label, item.alias]) {
      if (!rawCandidate) continue;
      const candidate = rawCandidate.replace(/^[@#]/, '');
      const needle = normalize(candidate).trim();
      if (!needle) continue;
      if (!haystack.startsWith(needle)) continue;
      // Só aceita se terminar em fronteira de palavra
      const next = haystack.charAt(needle.length);
      if (next && next !== ' ') continue;
      if (!best || needle.length > best.consumed) {
        best = { item, consumed: needle.length };
      }
    }
  }
  return best;
}

function extractMarker(
  text: string,
  marker: '#' | '@',
  catalog: QuickCatalogItem[],
): { text: string; item: QuickCatalogItem; raw: string } | null {
  let from = 0;
  for (;;) {
    const index = text.indexOf(marker, from);
    if (index === -1) return null;
    // O marcador precisa iniciar uma palavra (evita e-mails, "a@b")
    const before = text.charAt(index - 1);
    if (index > 0 && before !== ' ') {
      from = index + 1;
      continue;
    }

    const match = matchCatalog(text.slice(index + 1), catalog);
    if (match) {
      const raw = text.slice(index, index + 1 + match.consumed);
      const stripped = `${text.slice(0, index)}${text.slice(index + 1 + match.consumed)}`;
      return { text: stripped, item: match.item, raw };
    }
    from = index + 1;
  }
}

/** Trecho digitado após `#`/`@` no ponto do cursor — alimenta o autocomplete. */
export function activeMarkerQuery(
  text: string,
  caret: number,
): { marker: '#' | '@'; query: string; start: number } | null {
  const upToCaret = text.slice(0, caret);
  const index = Math.max(upToCaret.lastIndexOf('#'), upToCaret.lastIndexOf('@'));
  if (index === -1) return null;

  const before = upToCaret.charAt(index - 1);
  if (index > 0 && before !== ' ') return null;

  const query = upToCaret.slice(index + 1);
  // Some depois de duas palavras: aí já não é mais um nome sendo digitado
  if (query.split(' ').length > 3) return null;

  return { marker: upToCaret.charAt(index) as '#' | '@', query, start: index };
}

/** Substitui o trecho do marcador em edição pelo nome completo escolhido. */
export function applyMarkerCompletion(
  text: string,
  caret: number,
  label: string,
): { text: string; caret: number } {
  const active = activeMarkerQuery(text, caret);
  if (!active) return { text, caret };

  const cleanLabel = label.replace(/^[@#]/, '');
  const head = `${text.slice(0, active.start)}${active.marker}${cleanLabel} `;
  return { text: `${head}${text.slice(caret)}`, caret: head.length };
}

export function parseQuickInput(
  input: string,
  catalogs: QuickCatalogs,
  now: Date = new Date(),
): QuickParseResult {
  let text = input;
  const tokens: QuickToken[] = [];

  // 1) Cliente (#) — um só
  let clientId: string | null = null;
  const client = extractMarker(text, '#', catalogs.clients);
  if (client) {
    text = client.text;
    clientId = client.item.id;
    tokens.push({ kind: 'client', raw: client.raw, label: client.item.label });
  }

  // 2) Responsáveis (@) — vários
  const assigneeIds: string[] = [];
  for (;;) {
    const assignee = extractMarker(text, '@', catalogs.users);
    if (!assignee) break;
    text = assignee.text;
    if (!assigneeIds.includes(assignee.item.id)) {
      assigneeIds.push(assignee.item.id);
      tokens.push({ kind: 'assignee', raw: assignee.raw, label: assignee.item.label });
    }
  }

  // 3) Prioridade (P1..P5)
  let priority: DemandPriority | null = null;
  const priorityMatch = PRIORITY_RE.exec(text);
  if (priorityMatch) {
    priority = parsePriorityToken(priorityMatch[1]);
    if (priority) {
      text = text.replace(priorityMatch[0], ' ');
      tokens.push({
        kind: 'priority',
        raw: priorityMatch[1],
        label: priorityMatch[1].toUpperCase(),
      });
    }
  }

  // 4) Hora — antes da data, senão "14:30" poderia ser lido como dd/mm
  let dueTime: string | null = null;
  const timeMatch = TIME_RE.exec(text);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] ?? timeMatch[3] ?? 0);
    if (hours < 24 && minutes < 60) {
      dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], ' ');
      tokens.push({ kind: 'time', raw: timeMatch[0].trim(), label: dueTime });
    }
  }

  // 5) Data
  let dueDate: string | null = null;
  const dateMatch = DATE_RE.exec(text);
  if (dateMatch) {
    const parsed = parseDueDateInput(dateMatch[1], now);
    if (parsed) {
      dueDate = parsed;
      text = text.replace(dateMatch[0], ' ');
      tokens.push({ kind: 'date', raw: dateMatch[1].trim(), label: dateMatch[1].trim() });
    }
  }

  return {
    title: text.replace(/\s{2,}/g, ' ').trim(),
    clientId,
    assigneeIds,
    priority,
    dueDate,
    dueTime,
    tokens,
  };
}

// ----------------------------------------------------------------------------
// Destaque de menções em texto já gravado (comentários)
// ----------------------------------------------------------------------------

export interface MentionSegment {
  kind: 'text' | 'user' | 'client';
  value: string;
}

/**
 * Quebra o texto em trechos, marcando `@Colaborador` e `#Cliente`.
 *
 * Casa contra os nomes e aliases do catálogo em vez de usar `@\S+`: os nomes podem ter espaço
 * ("@Julio Neto", "#Cold Joias") ou ser username ("@julioneto").
 * Nomes mais longos são testados primeiro, para "Ana" não vencer "Ana Paula".
 */
export function splitMentions(text: string, catalogs: QuickCatalogs): MentionSegment[] {
  const userEntries = catalogs.users.flatMap((u) => {
    const primary = u.label.replace(/^@/, '');
    const alias = u.alias?.replace(/^@/, '');
    return [
      { marker: '@' as const, label: primary, kind: 'user' as const },
      ...(alias && alias !== primary ? [{ marker: '@' as const, label: alias, kind: 'user' as const }] : []),
    ];
  });

  const clientEntries = catalogs.clients.flatMap((c) => {
    const primary = c.label.replace(/^#/, '');
    const alias = c.alias?.replace(/^#/, '');
    return [
      { marker: '#' as const, label: primary, kind: 'client' as const },
      ...(alias && alias !== primary ? [{ marker: '#' as const, label: alias, kind: 'client' as const }] : []),
    ];
  });

  const entries: { marker: '@' | '#'; label: string; kind: 'user' | 'client' }[] = [
    ...userEntries,
    ...clientEntries,
  ].sort((a, b) => b.label.length - a.label.length);

  const segments: MentionSegment[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer) segments.push({ kind: 'text', value: buffer });
    buffer = '';
  };

  outer: while (index < text.length) {
    const char = text[index];
    if (char === '@' || char === '#') {
      const before = index > 0 ? text[index - 1] : ' ';
      if (before === ' ' || before === '\n') {
        const rest = text.slice(index + 1);
        for (const entry of entries) {
          if (entry.marker !== char) continue;
          if (!rest.toLowerCase().startsWith(entry.label.toLowerCase())) continue;
          const next = rest.charAt(entry.label.length);
          if (next && /[\w]/.test(next)) continue; // não casa no meio de palavra
          flush();
          segments.push({ kind: entry.kind, value: `${char}${entry.label}` });
          index += 1 + entry.label.length;
          continue outer;
        }
      }
    }
    buffer += char;
    index += 1;
  }

  flush();
  return segments;
}
