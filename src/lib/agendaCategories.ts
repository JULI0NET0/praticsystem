import {
  CheckCircle2,
  Clock,
  ClipboardList,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AgendaCategory {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

/**
 * Vocabulário de "Assuntos" da Agenda — único lugar que o define.
 *
 * As cores vêm da rampa categórica do design system (§2.6), em hex literal
 * (exceção permitida à regra de tokens). Antes Reunião e Demanda eram azuis
 * do Tailwind, e Tarefa usava o cinza de texto, que parecia desativada.
 * Pagamento fica no verde-oliva de "sucesso" da própria rampa.
 */
export const AGENDA_CATEGORIES: AgendaCategory[] = [
  { id: "meeting", label: "Reunião", color: "#5B84AD", icon: Users },
  { id: "prospecting", label: "Captação", color: "#BE8A4A", icon: MapPin },
  { id: "task", label: "Tarefa Interna", color: "#6E6D66", icon: CheckCircle2 },
  { id: "payment", label: "Pagamento", color: "#788C5D", icon: Clock },
  { id: "demand", label: "Demanda", color: "#8A6FA0", icon: ClipboardList },
];

/** Visão limpa: só reunião e captação. Tarefa, pagamento e demanda entram quando alguém liga o assunto. */
export const AGENDA_PRIMARY_CATEGORY_IDS = ["meeting", "prospecting"] as const;

export function isAgendaPrimarySelection(active: readonly string[]): boolean {
  return (
    active.length === AGENDA_PRIMARY_CATEGORY_IDS.length &&
    AGENDA_PRIMARY_CATEGORY_IDS.every((id) => active.includes(id))
  );
}

/** Assuntos que fazem sentido a partir de uma Demanda — exclui os fluxos próprios da Agenda/Financeiro. */
export const DEMAND_AGENDA_SUBJECTS: AgendaCategory[] = AGENDA_CATEGORIES.filter((category) =>
  ["meeting", "prospecting", "task", "demand"].includes(category.id),
);

/** Assuntos cujo evento-espelho sincroniza com o Google Calendar (regra fixa, não configurável por demanda). */
export const AGENDA_GOOGLE_SYNC_SUBJECTS = new Set(["meeting", "prospecting"]);

export function getAgendaCategory(id: string | null | undefined): AgendaCategory | undefined {
  return AGENDA_CATEGORIES.find((category) => category.id === id);
}
