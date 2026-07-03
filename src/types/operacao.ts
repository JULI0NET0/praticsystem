// ============================================================================
// CRM "Operação OFICIAL" — Modelo de dados (fase MOCK, isolado do database.ts)
// Espaço → Área(Pasta) → Lista → Tarefa → Subtarefa(Etapa) → Ação(Entregável)
// ============================================================================

export type ViewType = "board" | "table" | "calendar";

export type TaskType =
  | "default"
  | "onboarding"
  | "offboarding"
  | "pack_entrega"
  | "post"
  | "captacao";

export type StatusCategory = "nao_iniciado" | "ativo" | "fechado";

export type Priority = "low" | "medium" | "high" | "urgent";

/** Canais de mídia (doc §3 / §10.2 MediaType) */
export type MediaType =
  | "FEED"
  | "STORIES"
  | "FACEBOOK"
  | "TIKTOK"
  | "LINKEDIN"
  | "TWITTER"
  | "EMAIL_MARKETING"
  | "PINTEREST"
  | "DEMANDA_EXTRA";

/** Etapa do funil (doc §10.2 FunnelStage) */
export type FunnelStage = "TOPO" | "MEIO" | "FUNDO";

/** Tipo de captação audiovisual (doc §10.2 CaptureType) */
export type CaptureType = "CAPTACAO" | "CAPTACAO_ADS" | "EDITORIAL";

/** 0=domingo ... 6=sábado */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ----------------------------------------------------------------------------
// Definições de configuração (status e campos personalizados de cada lista)
// ----------------------------------------------------------------------------

export interface StatusDef {
  id: string;
  label: string;
  category: StatusCategory;
  /** cor sólida (hex) usada em pílulas e colunas do Kanban */
  color: string;
}

export type FieldType = "text" | "month" | "date" | "dropdown" | "label";

export interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface FieldDef {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  color?: string;
}

// ----------------------------------------------------------------------------
// Entidades da árvore
// ----------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  subtaskId: string;
  order: number;
  label: string;
  done: boolean;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  statusId?: string;
  actions: ActionItem[];
}

export type CustomValue = string | number | boolean | null;

export interface Task {
  id: string;
  listId: string;
  title: string;
  taskType: TaskType;
  statusId: string;
  assigneeIds: string[];
  priority?: Priority;
  startDate?: string;
  dueDate?: string;
  description?: string;
  /** valores dos campos personalizados, indexados por FieldDef.key */
  customValues: Record<string, CustomValue>;
  subtasks: Subtask[];
  /** para POSTs: referência à tarefa de canal pai (Feed/Stories/...) */
  parentTaskId?: string;
}

export interface List {
  id: string;
  areaId: string;
  name: string;
  isTemplate: boolean;
  views: ViewType[];
  statuses: StatusDef[];
  customFields: FieldDef[];
  tasks: Task[];
  /** config do pacote de gestão de redes (dirige o gerador de calendário) */
  editorialConfig?: EditorialPackageConfig;
}

export interface Area {
  id: string;
  spaceId: string;
  name: string;
  /** nome do ícone lucide (resolvido na UI) */
  icon: string;
  order: number;
  lists: List[];
}

export interface Space {
  id: string;
  name: string;
  areas: Area[];
}

// ----------------------------------------------------------------------------
// Calendário editorial / geração de demandas
// ----------------------------------------------------------------------------

export interface EditorialPackageConfig {
  /** posts por semana, ex.: 3 */
  postsPerWeek: number;
  /** número de semanas consideradas, padrão 4 */
  weeks: number;
  /** dias da semana em que os posts saem, ex.: [1,3,5] = seg/qua/sex */
  weekdays: Weekday[];
  /** canal(is) de mídia dos posts gerados */
  channels: MediaType[];
  /** funil inicial padrão */
  startFunnel?: FunnelStage;
}

export interface EditorialGenerationInput extends EditorialPackageConfig {
  /** lista de cliente (área Criação) onde as demandas serão inseridas */
  listId: string;
  /** mês de referência no formato "Jul/2026" ou "2026-07" */
  monthRef: string;
}
