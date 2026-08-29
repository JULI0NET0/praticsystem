import { AGENDA_GOOGLE_SYNC_SUBJECTS } from "@/lib/agendaCategories";
import type { AgendaSubject, Demand } from "@/types/demandas";

export interface AgendaMirrorPayload {
  title: string;
  type: AgendaSubject;
  date: string;
  client_id: string | null;
  assigned_to: string | null;
  visibility: "public" | "private";
  description: string;
  status: "scheduled";
}

export type AgendaMirrorPlan =
  | { action: "none" }
  | { action: "clear" }
  | { action: "upsert"; payload: AgendaMirrorPayload };

/** Meio-dia local — usado quando a demanda tem due_date mas não due_time. */
const DEFAULT_DUE_TIME = "12:00:00";

/**
 * Decide o que fazer com o evento-espelho de uma demanda na Agenda, dado o
 * estado atual dela. Função pura — nenhuma chamada de rede aqui, só a regra
 * de negócio, para poder ser testada isoladamente do Provider.
 */
export function computeAgendaMirror(demand: Demand): AgendaMirrorPlan {
  const hadLink = Boolean(demand.agenda_event);

  if (!demand.agenda_subject || !demand.due_date) {
    return hadLink ? { action: "clear" } : { action: "none" };
  }

  const time = demand.due_time || DEFAULT_DUE_TIME;
  const date = new Date(`${demand.due_date}T${time}`);
  if (Number.isNaN(date.getTime())) {
    return hadLink ? { action: "clear" } : { action: "none" };
  }

  // Visibilidade pública só se for sincronizado com Google Calendar (reunião/captação)
  // ou explicitamente marcado para toda a equipe (assign_all_team).
  // Demandas com responsáveis específicos não são públicas para quem não for responsável.
  const isAllTeam = Boolean(demand.assign_all_team);
  const isGoogleSync = AGENDA_GOOGLE_SYNC_SUBJECTS.has(demand.agenda_subject);
  const visibility: "public" | "private" = isGoogleSync || isAllTeam ? "public" : "private";

  return {
    action: "upsert",
    payload: {
      title: demand.title,
      type: demand.agenda_subject,
      date: date.toISOString(),
      client_id: demand.client_id,
      assigned_to: demand.assignee_ids?.[0] ?? null,
      visibility,
      description: `Gerado a partir da demanda: ${demand.title}`,
      status: "scheduled",
    },
  };
}

/**
 * Se este assunto sincroniza com o Google — regra fixa por Assunto, NÃO pela
 * visibilidade computada acima (que pode ser 'public' por ter múltiplos
 * responsáveis mesmo num assunto que nunca deveria ir pro Google).
 */
export function shouldSyncGoogle(subject: AgendaSubject): boolean {
  return AGENDA_GOOGLE_SYNC_SUBJECTS.has(subject);
}
