import { toISODate } from "./dueDate";
import type {
  Demand,
  DemandClientRef,
  DemandPriority,
  DemandStatus,
} from "@/types/demandas";

export type WhatsAppSummaryGrouping = "assignee" | "priority";
export type WhatsAppDateScope = "today" | "overdue_and_today" | "open_all" | "selected";

export interface UserRef {
  id: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
}

export interface GenerateWhatsAppSummaryOptions {
  demands: Demand[];
  clients?: DemandClientRef[];
  users?: UserRef[];
  statuses?: DemandStatus[];

  dateScope?: WhatsAppDateScope;
  selectedIds?: string[];
  grouping?: WhatsAppSummaryGrouping;
  targetAssigneeId?: string | "all" | "unassigned";
  allowedPriorities?: DemandPriority[];

  includeTime?: boolean;
  includeClient?: boolean;
  includeStatus?: boolean;
  includeChecklist?: boolean;
  customTitle?: string;
  referenceDate?: Date;
}

export const PRIORITY_CONFIG: Record<
  DemandPriority,
  { label: string; emoji: string; weight: number }
> = {
  urgent: { label: "URGENTE", emoji: "🟥", weight: 4 },
  high: { label: "ALTA", emoji: "🟧", weight: 3 },
  medium: { label: "MÉDIO", emoji: "🟨", weight: 2 },
  low: { label: "BAIXA", emoji: "🟩", weight: 1 },
  none: { label: "OUTRAS", emoji: "⬜", weight: 0 },
};

const ORDERED_PRIORITIES: DemandPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function formatDisplayDate(d: Date): string {
  const weekday = WEEKDAYS[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${weekday}, _${day}/${month}/${year}_`;
}

export function filterDemandsForSummary(options: {
  demands: Demand[];
  dateScope?: WhatsAppDateScope;
  selectedIds?: string[];
  targetAssigneeId?: string | "all" | "unassigned";
  allowedPriorities?: DemandPriority[];
  referenceDate?: Date;
}): Demand[] {
  const {
    demands,
    dateScope = "today",
    selectedIds = [],
    targetAssigneeId = "all",
    allowedPriorities = ["urgent", "high", "medium", "low", "none"],
    referenceDate = new Date(),
  } = options;

  const todayIso = toISODate(referenceDate);
  const selectedSet = new Set(selectedIds);
  const allowedPrioritiesSet = new Set(allowedPriorities);

  return demands.filter((d) => {
    // 1. Filtro de prioridade
    if (!allowedPrioritiesSet.has(d.priority || "none")) {
      return false;
    }

    // 2. Filtro de escopo / data
    if (dateScope === "selected") {
      if (!selectedSet.has(d.id)) return false;
    } else if (dateScope === "today") {
      if (d.status_category === "fechado") return false;
      if (d.due_date !== todayIso) return false;
    } else if (dateScope === "overdue_and_today") {
      if (d.status_category === "fechado") return false;
      if (!d.due_date || d.due_date > todayIso) return false;
    } else if (dateScope === "open_all") {
      if (d.status_category === "fechado") return false;
    }

    // 3. Filtro de responsável
    if (targetAssigneeId === "all") {
      return true;
    }
    if (targetAssigneeId === "unassigned") {
      return (
        (!d.assignee_ids || d.assignee_ids.length === 0) &&
        !d.assigned_to &&
        !d.assign_all_team
      );
    }

    const assignees = d.assignee_ids || (d.assigned_to ? [d.assigned_to] : []);
    if (d.assign_all_team) return true;
    return assignees.includes(targetAssigneeId);
  });
}

function resolveClientName(
  demand: Demand,
  clientsMap: Map<string, DemandClientRef>
): string {
  if (demand.scope === "internal" || !demand.client_id) {
    return "PRATIC";
  }
  const client = clientsMap.get(demand.client_id);
  if (!client) return "PRATIC";
  const name = client.nome_fantasia || client.name || "PRATIC";
  return name.toUpperCase();
}

function resolveUserDisplayName(
  userId: string,
  usersMap: Map<string, UserRef>
): string {
  const user = usersMap.get(userId);
  if (!user) return "Equipe";
  return user.name || (user.username ? `@${user.username}` : user.email || "Equipe");
}

function resolveAssigneesNames(
  demand: Demand,
  usersMap: Map<string, UserRef>
): string {
  if (demand.assign_all_team) return "Toda a equipe";
  const ids = demand.assignee_ids?.length
    ? demand.assignee_ids
    : demand.assigned_to
    ? [demand.assigned_to]
    : [];
  if (ids.length === 0) return "Sem responsável";
  return ids.map((id) => resolveUserDisplayName(id, usersMap)).join(", ");
}

/** Formata uma linha de item de demanda no padrão • *CLIENTE* | Título */
function formatDemandItem(
  demand: Demand,
  options: {
    clientsMap: Map<string, DemandClientRef>;
    statusesMap: Map<string, DemandStatus>;
    includeTime: boolean;
    includeClient: boolean;
    includeStatus: boolean;
    includeChecklist: boolean;
    prefixWithAssignee?: string;
    bulletStyle?: "bullet" | "none";
  }
): string {
  const {
    clientsMap,
    statusesMap,
    includeTime,
    includeClient,
    includeStatus,
    includeChecklist,
    prefixWithAssignee,
    bulletStyle = "bullet",
  } = options;

  const parts: string[] = [];

  if (bulletStyle === "bullet") {
    parts.push("•");
  }

  if (prefixWithAssignee) {
    parts.push(`*${prefixWithAssignee}*:`);
  }

  if (includeClient) {
    const clientName = resolveClientName(demand, clientsMap);
    parts.push(`*${clientName}* |`);
  }

  parts.push(demand.title.trim());

  const meta: string[] = [];

  if (includeTime && demand.due_time) {
    meta.push(`⏰ ${demand.due_time}`);
  }

  if (
    includeChecklist &&
    typeof demand.checklist_total === "number" &&
    demand.checklist_total > 0
  ) {
    meta.push(`☑️ ${demand.checklist_done ?? 0}/${demand.checklist_total}`);
  }

  if (includeStatus && demand.status) {
    const st = statusesMap.get(demand.status);
    if (st) meta.push(`(${st.label})`);
  }

  if (meta.length > 0) {
    parts.push(`(${meta.join(" · ")})`);
  }

  return parts.join(" ");
}

function groupDemandsByPriority(demands: Demand[], priority: DemandPriority): Demand[] {
  return demands.filter((d) => (d.priority || "none") === priority);
}

export function generateWhatsAppSummary(
  options: GenerateWhatsAppSummaryOptions
): string {
  const {
    demands,
    clients = [],
    users = [],
    statuses = [],
    dateScope = "today",
    selectedIds = [],
    grouping = "assignee",
    targetAssigneeId = "all",
    allowedPriorities = ["urgent", "high", "medium", "low", "none"],
    includeTime = true,
    includeClient = true,
    includeStatus = false,
    includeChecklist = true,
    customTitle,
    referenceDate = new Date(),
  } = options;

  const clientsMap = new Map(clients.map((c) => [c.id, c]));
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const statusesMap = new Map(statuses.map((s) => [s.id, s]));

  const filtered = filterDemandsForSummary({
    demands,
    dateScope,
    selectedIds,
    targetAssigneeId,
    allowedPriorities,
    referenceDate,
  });

  const lines: string[] = [];

  // Se for direcionado a um membro específico
  const isIndividualTarget =
    targetAssigneeId !== "all" && targetAssigneeId !== "unassigned";
  const targetUser = isIndividualTarget ? usersMap.get(targetAssigneeId) : null;
  const targetUserName = targetUser
    ? targetUser.name || (targetUser.username ? `@${targetUser.username}` : "Colega")
    : null;

  // 1. Saudação inicial se individual
  if (isIndividualTarget && targetUserName) {
    lines.push(`Olá *${targetUserName}*, segue seu resumo de demandas:`);
    lines.push("");
  }

  const defaultTitle =
    dateScope === "today"
      ? "DEMANDAS DE HOJE"
      : dateScope === "overdue_and_today"
      ? "DEMANDAS DE HOJE & ATRASADAS"
      : dateScope === "selected"
      ? "DEMANDAS SELECIONADAS"
      : "RESUMO DE DEMANDAS";

  lines.push(`*${customTitle || defaultTitle}* - ${formatDisplayDate(referenceDate)}`);

  // Contagem geral com emojis quadrados
  const urgentCount = filtered.filter((d) => d.priority === "urgent").length;
  const highCount = filtered.filter((d) => d.priority === "high").length;
  const mediumCount = filtered.filter((d) => d.priority === "medium").length;
  const lowCount = filtered.filter((d) => d.priority === "low").length;
  const noneCount = filtered.filter((d) => (d.priority || "none") === "none").length;
  const totalCount = filtered.length;

  const statItems: string[] = [];
  if (urgentCount > 0) statItems.push(`🟥 ${urgentCount}`);
  if (highCount > 0) statItems.push(`🟧 ${highCount}`);
  if (mediumCount > 0) statItems.push(`🟨 ${mediumCount}`);
  if (lowCount > 0) statItems.push(`🟩 ${lowCount}`);
  if (noneCount > 0 && statItems.length === 0) statItems.push(`⬜ ${noneCount}`);

  const statSuffix = statItems.length > 0 ? ` (${statItems.join(" · ")})` : "";
  lines.push(`*Total:* ${totalCount} demanda${totalCount === 1 ? "" : "s"}${statSuffix}`);
  lines.push("");

  if (filtered.length === 0) {
    lines.push("_Nenhuma demanda encontrada para os critérios selecionados._");
    return lines.join("\n");
  }

  // 2. Corpo conforme o agrupamento
  if (grouping === "priority") {
    // Agrupamento por Prioridade
    for (const priority of ORDERED_PRIORITIES) {
      const pDemands = filtered.filter(
        (d) => (d.priority || "none") === priority
      );
      if (pDemands.length === 0) continue;

      const pCfg = PRIORITY_CONFIG[priority];
      lines.push(`${pCfg.emoji} *${pCfg.label}*`);

      for (const demand of pDemands) {
        const assigneeText = resolveAssigneesNames(demand, usersMap);
        lines.push(
          formatDemandItem(demand, {
            clientsMap,
            statusesMap,
            includeTime,
            includeClient,
            includeStatus,
            includeChecklist,
            prefixWithAssignee: isIndividualTarget ? undefined : assigneeText,
            bulletStyle: "bullet",
          })
        );
      }
      lines.push("");
    }
  } else {
    // Agrupamento por Responsável
    if (isIndividualTarget) {
      for (const priority of ORDERED_PRIORITIES) {
        const pDemands = groupDemandsByPriority(filtered, priority);
        if (pDemands.length === 0) continue;

        const pCfg = PRIORITY_CONFIG[priority];
        lines.push(`${pCfg.emoji} *${pCfg.label}*`);

        for (const demand of pDemands) {
          lines.push(
            formatDemandItem(demand, {
              clientsMap,
              statusesMap,
              includeTime,
              includeClient,
              includeStatus,
              includeChecklist,
              bulletStyle: "bullet",
            })
          );
        }
        lines.push("");
      }
    } else {
      type GroupBucket = {
        id: string;
        name: string;
        demands: Demand[];
      };

      const groupsMap = new Map<string, GroupBucket>();

      for (const demand of filtered) {
        const assignees = demand.assign_all_team
          ? ["all_team"]
          : demand.assignee_ids?.length
          ? demand.assignee_ids
          : demand.assigned_to
          ? [demand.assigned_to]
          : ["unassigned"];

        for (const uid of assignees) {
          let g = groupsMap.get(uid);
          if (!g) {
            let name = "Sem responsável";
            if (uid === "all_team") name = "Toda a Equipe";
            else if (uid !== "unassigned") name = resolveUserDisplayName(uid, usersMap);

            g = { id: uid, name, demands: [] };
            groupsMap.set(uid, g);
          }
          if (!g.demands.some((d) => d.id === demand.id)) {
            g.demands.push(demand);
          }
        }
      }

      // Ordenar responsáveis por nome
      const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
        if (a.id === "all_team") return -1;
        if (b.id === "all_team") return 1;
        if (a.id === "unassigned") return 1;
        if (b.id === "unassigned") return -1;
        return a.name.localeCompare(b.name, "pt-BR");
      });

      for (const group of sortedGroups) {
        lines.push(`👤 *${group.name}*`);

        for (const priority of ORDERED_PRIORITIES) {
          const pDemands = groupDemandsByPriority(group.demands, priority);
          if (pDemands.length === 0) continue;

          const pCfg = PRIORITY_CONFIG[priority];
          lines.push(`${pCfg.emoji} *${pCfg.label}*`);

          for (const demand of pDemands) {
            lines.push(
              formatDemandItem(demand, {
                clientsMap,
                statusesMap,
                includeTime,
                includeClient,
                includeStatus,
                includeChecklist,
                bulletStyle: "bullet",
              })
            );
          }
        }
        lines.push("");
      }
    }
  }

  if (isIndividualTarget) {
    lines.push("💪 Bom trabalho!");
  } else {
    lines.push("🚀 Vamos pra cima!");
  }

  return lines.join("\n").trim();
}

/**
 * Gera URL para envio via WhatsApp Web / App.
 * Se houver telefone, direciona para o número (formato wa.me/55DDNNNNNNNNN).
 */
export function buildWhatsAppShareUrl(text: string, phone?: string): string {
  const encodedText = encodeURIComponent(text);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      const fullPhone =
        cleanPhone.length === 10 || cleanPhone.length === 11
          ? `55${cleanPhone}`
          : cleanPhone;
      return `https://wa.me/${fullPhone}?text=${encodedText}`;
    }
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
