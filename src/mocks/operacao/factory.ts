import {
  ActionItem,
  List,
  Subtask,
  Task,
  ViewType,
} from "@/types/operacao";
import { uid } from "./ids";
import {
  ONBOARDING_STATUSES,
  CANCELAMENTO_STATUSES,
  CRIACAO_STATUSES,
  AUDIOVISUAL_STATUSES,
  EDICAO_STATUSES,
} from "./statuses";
import {
  ONBOARDING_TEMPLATE,
  CANCELAMENTO_TEMPLATE,
  CAPTACAO_TEMPLATES,
  CRIACAO_CHANNELS,
  ONBOARDING_FIELDS,
  CANCELAMENTO_FIELDS,
  CRIACAO_FIELDS,
  AUDIOVISUAL_FIELDS,
  TaskTemplate,
} from "./templates";

const BOARD_TABLE: ViewType[] = ["board", "table"];

// ---------------------------------------------------------------------------
// Clonagem de estrutura de template → subtarefas e ações
// ---------------------------------------------------------------------------

function buildSubtasks(taskId: string, template: TaskTemplate): Subtask[] {
  return template.subtasks.map((st) => {
    const subtaskId = uid("sub");
    const actions: ActionItem[] = st.actions.map((label, i) => ({
      id: uid("act"),
      subtaskId,
      order: i,
      label,
      done: false,
    }));
    return { id: subtaskId, taskId, name: st.name, actions };
  });
}

/** Cria uma tarefa a partir de um template mestre (réplica canônica). */
export function makeTaskFromTemplate(
  listId: string,
  template: TaskTemplate,
  opts: { title: string; statusId: string; taskTypeOverride?: Task["taskType"] },
): Task {
  const taskId = uid("task");
  return {
    id: taskId,
    listId,
    title: opts.title,
    taskType: opts.taskTypeOverride ?? template.taskType,
    statusId: opts.statusId,
    assigneeIds: [],
    customValues: {},
    subtasks: buildSubtasks(taskId, template),
  };
}

// ---------------------------------------------------------------------------
// ONBOARDING
// ---------------------------------------------------------------------------

export function buildOnboardingList(areaId: string): List {
  return {
    id: uid("list"),
    areaId,
    name: "Onboarding",
    isTemplate: false,
    views: BOARD_TABLE,
    statuses: ONBOARDING_STATUSES,
    customFields: ONBOARDING_FIELDS,
    tasks: [],
  };
}

/** Clona o template de onboarding para um novo cliente. */
export function makeOnboardingTask(
  listId: string,
  clientName: string,
  statusId: string = "ob_admin",
): Task {
  return makeTaskFromTemplate(listId, ONBOARDING_TEMPLATE, {
    title: `[ONBOARDING] ${clientName}`,
    statusId,
  });
}

export function buildCancelamentoList(areaId: string): List {
  return {
    id: uid("list"),
    areaId,
    name: "Cancelamento",
    isTemplate: false,
    views: BOARD_TABLE,
    statuses: CANCELAMENTO_STATUSES,
    customFields: CANCELAMENTO_FIELDS,
    tasks: [],
  };
}

export function makeCancelamentoTask(
  listId: string,
  clientName: string,
  statusId: string = "cx_admin",
): Task {
  return makeTaskFromTemplate(listId, CANCELAMENTO_TEMPLATE, {
    title: `[CANCELAMENTO] ${clientName}`,
    statusId,
  });
}

// ---------------------------------------------------------------------------
// AUDIOVISUAL
// ---------------------------------------------------------------------------

export function buildPlanejamentoList(areaId: string): List {
  return {
    id: uid("list"),
    areaId,
    name: "Planejamento",
    isTemplate: false,
    views: BOARD_TABLE,
    statuses: AUDIOVISUAL_STATUSES,
    customFields: AUDIOVISUAL_FIELDS,
    tasks: [],
  };
}

export function makeCaptacaoTask(
  listId: string,
  clientName: string,
  templateIndex = 0,
  statusId = "av_producao",
): Task {
  const template = CAPTACAO_TEMPLATES[templateIndex] ?? CAPTACAO_TEMPLATES[0];
  return makeTaskFromTemplate(listId, template, {
    title: template.title.replace("[TEMPLATE]", clientName),
    statusId,
  });
}

export function buildEdicaoList(areaId: string, kind: "videos" | "fotos"): List {
  return {
    id: uid("list"),
    areaId,
    name: kind === "videos" ? "Edição de vídeos" : "Edição de fotos",
    isTemplate: false,
    views: BOARD_TABLE,
    statuses: EDICAO_STATUSES,
    customFields: [],
    tasks: [],
  };
}

/**
 * Ao confirmar uma captação, gera 1 tarefa "PARA EDITAR" em cada fila de edição
 * (vídeos e fotos), vinculadas à captação (regra §10.4.8). Função pura e testável.
 */
export function makeEditingTasksFromCapture(
  videosListId: string,
  fotosListId: string,
  capture: Task,
): [Task, Task] {
  const mes = capture.customValues["mes_referente"] ?? null;
  const make = (listId: string, kind: "vídeos" | "fotos"): Task => ({
    id: uid("task"),
    listId,
    title: `Edição de ${kind} — ${capture.title}`,
    taskType: "default",
    statusId: "ed_para_editar",
    assigneeIds: [],
    parentTaskId: capture.id,
    customValues: { mes_referente: mes },
    subtasks: [],
  });
  return [make(videosListId, "vídeos"), make(fotosListId, "fotos")];
}

// ---------------------------------------------------------------------------
// CRIAÇÃO — lista de cliente com 9 tarefas de canal (packs de entrega)
// ---------------------------------------------------------------------------

/** Cria as 9 tarefas de canal (pack de entrega) — doc §6.1. */
export function makeCriacaoPackTasks(listId: string): Task[] {
  return CRIACAO_CHANNELS.map((ch) => ({
    id: uid("task"),
    listId,
    title: `${ch.label}`,
    taskType: "pack_entrega",
    statusId: "cr_planejamento",
    assigneeIds: [],
    description:
      ch.postCount > 0
        ? `Pack mensal de ${ch.label}. Template: até ${ch.postCount} posts.`
        : `Demandas extras de ${ch.label} (sem quantidade fixa).`,
    customValues: { midia: ch.media },
    subtasks: [],
  }));
}

/**
 * Constrói uma lista de cliente na área Criação, clonada do template mestre:
 * 9 canais + campos personalizados globais.
 */
export function buildCriacaoList(
  areaId: string,
  clientName: string,
  isTemplate = false,
): List {
  const listId = uid("list");
  return {
    id: listId,
    areaId,
    name: isTemplate ? "[TEMPLATE] Cliente" : clientName,
    isTemplate,
    views: ["board", "table", "calendar"],
    statuses: CRIACAO_STATUSES,
    customFields: CRIACAO_FIELDS,
    tasks: makeCriacaoPackTasks(listId),
    editorialConfig: {
      postsPerWeek: 3,
      weeks: 4,
      weekdays: [1, 3, 5],
      channels: ["FEED"],
      startFunnel: "TOPO",
    },
  };
}
