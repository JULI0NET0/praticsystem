// ============================================================================
// Demandas da Agência — modelo persistido (tabelas demands / demand_statuses /
// demand_comments / demand_attachments). Ver BLOCO 11 de setup_database.sql.
//
// Não confundir com src/types/operacao.ts, que é o protótipo mock do fluxo
// editorial em /admin/operacao.
// ============================================================================

/** Categoria do status — dirige "concluir", contagens e os leitores legados. */
export type DemandStatusCategory = 'nao_iniciado' | 'ativo' | 'fechado';

export type DemandPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/** Demanda de cliente (tem client_id) ou interna/operacional (sem client_id). */
export type DemandScope = 'client' | 'internal';

export type DemandView = 'list' | 'board';

/** Como a Lista agrupa: por prazo (padrão) ou por status (espelhando o Kanban). */
export type DemandListGroupBy = 'due' | 'status';

/** Documento TipTap, mesmo formato de notes.content. */
export type DemandDescription = Record<string, unknown> | null;

export interface DemandStatus {
  id: string;
  label: string;
  color: string;
  category: DemandStatusCategory;
  position: number;
  created_at?: string;
}

export interface Demand {
  id: string;
  title: string;
  description?: DemandDescription;
  client_id: string | null;
  scope: DemandScope;
  status: string;
  status_category: DemandStatusCategory;
  priority: DemandPriority;
  assignee_ids: string[];
  /** Derivada por trigger (= assignee_ids[1]); mantida para os leitores legados. */
  assigned_to?: string | null;
  assign_all_team: boolean;
  created_by?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  position: number;
  completed_at?: string | null;
  type?: string | null;
  created_at: string;
  updated_at?: string;
  /** Agregados trazidos na listagem, para os cards não precisarem abrir a demanda. */
  comment_count?: number;
  attachment_count?: number;
}

export interface DemandComment {
  id: string;
  demand_id: string;
  user_id: string;
  body: string;
  edited: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DemandAttachment {
  id: string;
  demand_id: string;
  /** null = anexo da demanda; preenchido = anexo de um comentário. */
  comment_id: string | null;
  user_id?: string | null;
  name: string;
  file_path: string;
  file_type?: string | null;
  size?: number | null;
  created_at: string;
}

/** Cliente reduzido — só o que a área de demandas precisa exibir. */
export interface DemandClientRef {
  id: string;
  name: string;
  nome_fantasia?: string | null;
}

export interface DemandFilters {
  /** 'all' | 'client' | 'internal' */
  scope: DemandScope | 'all';
  clientId: string | null;
  assigneeId: string | null;
  priority: DemandPriority | null;
  status: string | null;
  search: string;
  /** Esconde as demandas em status de categoria `fechado`. */
  hideCompleted: boolean;
}

export const EMPTY_DEMAND_FILTERS: DemandFilters = {
  scope: 'all',
  clientId: null,
  assigneeId: null,
  priority: null,
  status: null,
  search: '',
  hideCompleted: false,
};

export const PRIORITY_ORDER: Record<DemandPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export const PRIORITY_LABELS: Record<DemandPriority, string> = {
  none: 'Sem prioridade',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

/**
 * Cores literais (não tokens): as pílulas derivam o wash com `tint()`.
 * Saturadas de propósito — a rampa anterior era dessaturada demais e as
 * quatro prioridades ficavam indistinguíveis de relance na lista.
 * `none` continua neutro: ausência de prioridade não deve competir.
 */
export const PRIORITY_COLORS: Record<DemandPriority, string> = {
  none: '#8a8a83',
  low: '#4f7fb8',
  medium: '#c98a1e',
  high: '#e0642f',
  urgent: '#c0271b',
};

/** Atalho digitável no título e rótulo compacto (estilo Todoist). */
export const PRIORITY_SHORT: Record<DemandPriority, string> = {
  urgent: 'P1',
  high: 'P2',
  medium: 'P3',
  low: 'P4',
  none: 'P5',
};

/** 'p1' -> 'urgent'. Aceita P1..P5 e os nomes por extenso. */
export function parsePriorityToken(token: string): DemandPriority | null {
  const key = token.trim().toLowerCase();
  const byShort: Record<string, DemandPriority> = {
    p1: 'urgent',
    p2: 'high',
    p3: 'medium',
    p4: 'low',
    p5: 'none',
  };
  if (byShort[key]) return byShort[key];
  const byName: Record<string, DemandPriority> = {
    urgente: 'urgent',
    alta: 'high',
    media: 'medium',
    baixa: 'low',
    nenhuma: 'none',
  };
  return byName[key] ?? null;
}

export function clientLabel(client: DemandClientRef | undefined | null): string {
  if (!client) return '';
  return client.nome_fantasia || client.name;
}
