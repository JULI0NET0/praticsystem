import {
  CheckCircle2,
  Clock,
  ClipboardList,
  ExternalLink,
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

/** Vocabulário de "Assuntos" da Agenda — único lugar que o define. */
export const AGENDA_CATEGORIES: AgendaCategory[] = [
  { id: "meeting", label: "Reunião", color: "#3B82F6", icon: Users },
  { id: "prospecting", label: "Captação", color: "var(--color-warning)", icon: MapPin },
  { id: "task", label: "Tarefa Interna", color: "var(--color-text-secondary)", icon: CheckCircle2 },
  { id: "payment", label: "Pagamento", color: "var(--color-success)", icon: Clock },
  { id: "demand", label: "Demanda", color: "#6366F1", icon: ClipboardList },
];

/** Assuntos que fazem sentido a partir de uma Demanda — exclui os fluxos próprios da Agenda/Financeiro. */
export const DEMAND_AGENDA_SUBJECTS: AgendaCategory[] = AGENDA_CATEGORIES.filter((category) =>
  ["meeting", "prospecting", "task", "demand"].includes(category.id),
);

/** Assuntos cujo evento-espelho sincroniza com o Google Calendar (regra fixa, não configurável por demanda). */
export const AGENDA_GOOGLE_SYNC_SUBJECTS = new Set(["meeting", "prospecting"]);

export function getAgendaCategory(id: string | null | undefined): AgendaCategory | undefined {
  return AGENDA_CATEGORIES.find((category) => category.id === id);
}
