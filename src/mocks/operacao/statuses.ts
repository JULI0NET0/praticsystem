import { StatusDef } from "@/types/operacao";

// ============================================================================
// Catálogos de status por tipo de lista (doc §4, §5, §6)
// Cores alinhadas à identidade Pratic (accent laranja + verde/amarelo/vermelho)
// ============================================================================

/** Onboarding — 10 status (doc §4.1) */
export const ONBOARDING_STATUSES: StatusDef[] = [
  { id: "ob_templates", label: "TEMPLATES", category: "nao_iniciado", color: "#71717A" },
  { id: "ob_admin", label: "ADMINISTRATIVO", category: "ativo", color: "#3B82F6" },
  { id: "ob_kickoff", label: "KICK OFF", category: "ativo", color: "#EC4899" },
  { id: "ob_aguardando_c1", label: "AGUARDANDO C1", category: "ativo", color: "#EF4444" },
  { id: "ob_1contato", label: "1º CONTATO", category: "ativo", color: "#F97316" },
  { id: "ob_operacional", label: "OPERACIONAL", category: "ativo", color: "#22C55E" },
  { id: "ob_macro", label: "PRODUÇÃO DO MACRO", category: "ativo", color: "#8B5CF6" },
  { id: "ob_reuniao", label: "REUNIÃO ESTRATÉGICA", category: "ativo", color: "#A855F7" },
  { id: "ob_finalizacao", label: "FINALIZAÇÃO", category: "ativo", color: "#D9480F" },
  { id: "ob_concluido", label: "CONCLUÍDO", category: "fechado", color: "#15803D" },
];

/** Cancelamento / Offboarding — 5 status (doc §4.1 Cancelamento) */
export const CANCELAMENTO_STATUSES: StatusDef[] = [
  { id: "cx_templates", label: "TEMPLATES", category: "nao_iniciado", color: "#71717A" },
  { id: "cx_admin", label: "ADMINISTRATIVO", category: "ativo", color: "#3B82F6" },
  { id: "cx_operacional", label: "OPERACIONAL", category: "ativo", color: "#F97316" },
  { id: "cx_finalizacao", label: "FINALIZAÇÃO", category: "ativo", color: "#EF4444" },
  { id: "cx_concluido", label: "CONCLUÍDO", category: "fechado", color: "#15803D" },
];

/** Criação / Produção de conteúdo — 8 status (doc §6.1) */
export const CRIACAO_STATUSES: StatusDef[] = [
  { id: "cr_templates", label: "TEMPLATES", category: "nao_iniciado", color: "#71717A" },
  { id: "cr_planejamento", label: "PLANEJAMENTO", category: "ativo", color: "#EF4444" },
  { id: "cr_design", label: "DESIGN", category: "ativo", color: "#F97316" },
  { id: "cr_revisao", label: "REVISÃO", category: "ativo", color: "#EAB308" },
  { id: "cr_pdf", label: "PDF", category: "ativo", color: "#22C55E" },
  { id: "cr_para_entregar", label: "PARA ENTREGAR", category: "ativo", color: "#16A34A" },
  { id: "cr_entregue", label: "ENTREGUE", category: "ativo", color: "#15803D" },
  { id: "cr_fechado", label: "FECHADO", category: "fechado", color: "#71717A" },
];

/** Planejamento audiovisual (doc §5.1) */
export const AUDIOVISUAL_STATUSES: StatusDef[] = [
  { id: "av_nao_iniciado", label: "NÃO INICIADO", category: "nao_iniciado", color: "#71717A" },
  { id: "av_producao", label: "PRODUÇÃO", category: "ativo", color: "#8B5CF6" },
  { id: "av_concluido", label: "CONCLUÍDO", category: "fechado", color: "#15803D" },
];

/** Filas de edição de vídeos/fotos (doc §5.1) */
export const EDICAO_STATUSES: StatusDef[] = [
  { id: "ed_para_editar", label: "PARA EDITAR", category: "ativo", color: "#F97316" },
  { id: "ed_concluido", label: "CONCLUÍDO", category: "fechado", color: "#15803D" },
];

/** Status inicial padrão para novas demandas de POST na área Criação */
export const CRIACAO_INITIAL_STATUS_ID = "cr_planejamento";
