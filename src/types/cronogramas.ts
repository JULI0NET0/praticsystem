// ============================================================================
// Cronogramas de conteúdo — BLOCO 15 de setup_database.sql.
//
// Conteúdo não é demanda avulsa: o cronograma tem características próprias
// (competência, serviço contratado, cadência de posts, captações) e sobrevive
// à geração, para ser revisado e receber anexos e resultados depois.
// ============================================================================

import type { PeriodKind, Weekday } from '@/lib/contentSchedule';

export type ContentPlanStatus = 'rascunho' | 'ativo' | 'concluido';

export interface ContentPlan {
  id: string;
  client_id: string;
  contract_id?: string | null;
  title: string;
  /** Competência, 'YYYY-MM'. */
  month_ref: string;
  period_kind: PeriodKind;
  weeks: number;
  start_date?: string | null;
  posts_per_week: number;
  weekdays: Weekday[];
  channels: string[];
  /** Documento TipTap, igual a demands.description. */
  description?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
  status: ContentPlanStatus;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

/** O que o wizard junta antes de gerar. */
export interface ContentPlanDraft {
  clientId: string | null;
  contractId: string | null;
  title: string;
  monthRef: string;
  periodKind: PeriodKind;
  weeks: number;
  startDate: string;
  postsPerWeek: number;
  weekdays: Weekday[];
  channels: string[];
  contentTemplateId: string | null;
  captureTemplateId: string | null;
  /** Só gera a trilha de captação quando o contrato prevê. */
  includeCapture: boolean;
  captureFrequency: string | null;
}

/** Dados do contrato ativo que pré-preenchem o wizard. */
export interface ContractHint {
  contractId: string;
  serviceName: string | null;
  postsPerWeek: number | null;
  contentCapture: boolean;
  captureFrequency: string | null;
}

export const WEEKDAY_LABELS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: 'Segunda', short: 'S' },
  { value: 2, label: 'Terça', short: 'T' },
  { value: 3, label: 'Quarta', short: 'Q' },
  { value: 4, label: 'Quinta', short: 'Q' },
  { value: 5, label: 'Sexta', short: 'S' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 0, label: 'Domingo', short: 'D' },
];

export const CONTENT_PLAN_STATUS_LABELS: Record<ContentPlanStatus, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  concluido: 'Concluído',
};

/** Canais de publicação. Espelha CRIACAO_CHANNELS do protótipo de operação. */
export const CONTENT_CHANNELS: { value: string; label: string; color: string }[] = [
  { value: 'FEED', label: 'Feed', color: '#C96442' },
  { value: 'STORIES', label: 'Stories', color: '#8A6FA0' },
  { value: 'FACEBOOK', label: 'Facebook', color: '#5B84AD' },
  { value: 'TIKTOK', label: 'TikTok', color: '#A66189' },
  { value: 'LINKEDIN', label: 'LinkedIn', color: '#6A6FA8' },
  { value: 'TWITTER', label: 'X / Twitter', color: '#5A9188' },
  { value: 'EMAIL_MARKETING', label: 'E-mail marketing', color: '#BE8A4A' },
  { value: 'PINTEREST', label: 'Pinterest', color: '#B05C63' },
];

export function channelLabel(value: string): string {
  return CONTENT_CHANNELS.find((channel) => channel.value === value)?.label ?? value;
}

export function channelColor(value: string): string {
  return CONTENT_CHANNELS.find((channel) => channel.value === value)?.color ?? '#6E6D66';
}
