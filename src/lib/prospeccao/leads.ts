import type { Campaign, CampaignFilter, Lead, LeadStage } from '@/types/database';

export const STAGES: { id: LeadStage; label: string; color: string }[] = [
  { id: 'novo', label: 'Novo', color: 'var(--color-text-tertiary)' },
  { id: 'contatado', label: 'Contatado', color: '#3B82F6' },
  { id: 'conversando', label: 'Conversando', color: '#8B5CF6' },
  { id: 'proposta', label: 'Proposta', color: 'var(--color-terracotta-700)' },
  { id: 'ganho', label: 'Ganho', color: 'var(--color-success)' },
  { id: 'perdido', label: 'Perdido', color: 'var(--color-danger)' },
  { id: 'stand_by', label: 'Stand by', color: '#CA8A04' },
];

export const ORIGIN_LABEL: Record<string, string> = {
  prospeccao_ativa: 'Prospecção ativa',
  indicacao: 'Indicação',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  site: 'Site',
  csv: 'Importação',
  manual: 'Manual',
  outro: 'Outro',
};

export const SEGMENT_SUGGESTIONS = ['parlamentar', 'empresa'];

/** Mantém só dígitos e aplica (DD) 9XXXX-XXXX enquanto digita (aceita +55 colado). */
export function maskPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function validateCnpj(raw: string): boolean {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += Number(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Aceita @perfil, perfil ou URL do Instagram e devolve só o handle. */
export function parseInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/);
  return m ? m[1] : null;
}

/** Vírgulas/pipe -> lista única, minúscula, sem vazios. */
export function parseSegments(raw: string): string[] {
  return [...new Set(raw.split(/[,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

const STATUS_RANK: Record<string, number> = { failed: 0, queued: 1, sent: 2, delivered: 3, read: 4, played: 5 };
/** Status só avança (um "delivered" atrasado não desfaz "read"); falha sempre vence se ainda não entregue. */
export function nextMessageStatus(current: string, incoming: string): string {
  if (incoming === 'failed') return (STATUS_RANK[current] ?? 0) >= 3 ? current : 'failed';
  return (STATUS_RANK[incoming] ?? 0) > (STATUS_RANK[current] ?? 0) ? incoming : current;
}

export function stageLabel(stage: LeadStage): string {
  return STAGES.find((s) => s.id === stage)?.label ?? stage;
}

/**
 * Normaliza para E.164 brasileiro (somente dígitos, com 55).
 * Retorna null se não parecer um telefone válido.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const m = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

/** Substitui {{nome}} e {{empresa}} (nome usa só o primeiro nome). */
export function interpolate(template: string, lead: Pick<Lead, 'nome' | 'empresa'>): string {
  const vars: Record<string, string> = {
    nome: lead.nome.trim().split(/\s+/)[0] ?? '',
    empresa: lead.empresa?.trim() ?? '',
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function filterLeadsForCampaign(leads: Lead[], filter: CampaignFilter): Lead[] {
  return leads.filter((l) => {
    if (!l.telefone) return false;
    if (filter.estagios?.length && !filter.estagios.includes(l.estagio)) return false;
    if (filter.origens?.length && !filter.origens.includes(l.origem)) return false;
    if (filter.tags?.length && !filter.tags.some((t) => l.tags.includes(t))) return false;
    return true;
  });
}

export function pipelineStats(leads: Lead[]) {
  const open = leads.filter((l) => !['ganho', 'perdido'].includes(l.estagio));
  const won = leads.filter((l) => l.estagio === 'ganho').length;
  const closed = won + leads.filter((l) => l.estagio === 'perdido').length;
  const sum = (arr: Lead[]) => arr.reduce((acc, l) => acc + (l.valor_estimado ?? 0), 0);
  return {
    total: leads.length,
    novos: leads.filter((l) => l.estagio === 'novo').length,
    emAberto: sum(open),
    conversao: closed ? Math.round((won / closed) * 100) : 0,
    naoLidas: leads.reduce((acc, l) => acc + l.unread_count, 0),
  };
}

export function campaignLabel(status: Campaign['status']): string {
  return { draft: 'Rascunho', scheduled: 'Agendada', running: 'Em andamento', done: 'Concluída' }[status];
}

// ---------------- CSV ----------------

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

const HEADER_ALIASES: Record<string, string> = {
  nome: 'nome', name: 'nome', contato: 'nome',
  empresa: 'empresa', company: 'empresa', negocio: 'empresa', 'negócio': 'empresa',
  telefone: 'telefone', phone: 'telefone', whatsapp: 'telefone', celular: 'telefone',
  email: 'email', 'e-mail': 'email',
  instagram: 'instagram', insta: 'instagram',
  servico: 'servico_interesse', 'serviço': 'servico_interesse',
  tags: 'tags',
  cnpj: 'cnpj',
  segmento: 'segmentos', segmentos: 'segmentos',
  origem: 'origem', canal: 'origem',
};

export interface ParsedLeadRow {
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  servico_interesse: string | null;
  tags: string[];
  cnpj: string | null;
  segmentos: string[];
  origem?: string;
}

/**
 * Lê CSV (vírgula ou ponto e vírgula) com cabeçalho. Descarta linhas sem
 * nome e remove duplicatas por telefone dentro do arquivo.
 */
export function parseLeadsCsv(text: string): { rows: ParsedLeadRow[]; skipped: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0 };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = splitCsvLine(lines[0], sep).map((h) => HEADER_ALIASES[h.toLowerCase()] ?? '');
  const seen = new Set<string>();
  const rows: ParsedLeadRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, sep);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { if (h && cells[i]) rec[h] = cells[i]; });
    const phone = normalizePhone(rec.telefone);
    if (!rec.nome || (phone && seen.has(phone))) { skipped++; continue; }
    if (phone) seen.add(phone);
    rows.push({
      nome: rec.nome,
      empresa: rec.empresa ?? null,
      telefone: phone,
      email: rec.email ?? null,
      instagram: parseInstagram(rec.instagram),
      cnpj: rec.cnpj && validateCnpj(rec.cnpj) ? rec.cnpj.replace(/\D/g, '') : null,
      segmentos: rec.segmentos ? parseSegments(rec.segmentos) : [],
      origem: rec.origem && ORIGIN_LABEL[rec.origem.toLowerCase()] ? rec.origem.toLowerCase() : undefined,
      servico_interesse: rec.servico_interesse ?? null,
      tags: rec.tags ? rec.tags.split(/[|,]/).map((t) => t.trim()).filter(Boolean) : [],
    });
  }
  return { rows, skipped };
}
