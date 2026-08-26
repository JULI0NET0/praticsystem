"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { playSound } from "@/utils/audio";
import { deriveStatusFields } from "@/lib/demandState";
import { computeAgendaMirror, shouldSyncGoogle } from "@/lib/demandAgendaSync";
import {
  EMPTY_DEMAND_FILTERS,
  PRIORITY_ORDER,
  type Demand,
  type DemandAttachment,
  type DemandClientRef,
  type DemandComment,
  type DemandChecklistItem,
  type DemandFilters,
  type DemandStatus,
  type DemandTemplate,
} from "@/types/demandas";

const ATTACHMENTS_BUCKET = "demand-attachments";
const SOUND_STORAGE_KEY = "pratic-demandas-som";

// A preferência mora no localStorage, fora do React. useSyncExternalStore é o
// que permite lê-la sem efeito (que a regra set-state-in-effect proíbe) e sem
// divergência de hidratação — o servidor sempre responde `true`.
const soundListeners = new Set<() => void>();

function subscribeSound(listener: () => void): () => void {
  soundListeners.add(listener);
  return () => {
    soundListeners.delete(listener);
  };
}

function readSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

function writeSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // ignora
  }
  for (const listener of soundListeners) listener();
}

interface DemandasContextValue {
  demands: Demand[];
  statuses: DemandStatus[];
  clients: DemandClientRef[];
  users: UserProfile[];
  loading: boolean;

  filters: DemandFilters;
  setFilters: (patch: Partial<DemandFilters>) => void;
  resetFilters: () => void;
  visibleDemands: Demand[];

  getDemand: (id: string) => Demand | undefined;
  getStatus: (id: string) => DemandStatus | undefined;
  getClient: (id: string | null | undefined) => DemandClientRef | undefined;
  getUser: (id: string) => UserProfile | undefined;

  createDemand: (input: Partial<Demand>) => Promise<Demand | null>;
  updateDemand: (id: string, patch: Partial<Demand>) => Promise<void>;
  deleteDemand: (id: string) => Promise<void>;
  moveDemand: (id: string, statusId: string, position?: number) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  batchUpdateDemands: (ids: string[], patch: Partial<Demand>) => Promise<void>;
  batchMoveDemands: (ids: string[], statusId: string) => Promise<void>;
  batchDeleteDemands: (ids: string[]) => Promise<void>;
  batchToggleComplete: (ids: string[], done: boolean) => Promise<void>;

  /** Som ao concluir. Preferência por navegador. */
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  upsertStatus: (status: DemandStatus) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  reorderStatuses: (orderedIds: string[]) => Promise<void>;

  loadDetails: (demandId: string) => Promise<void>;
  commentsOf: (demandId: string) => DemandComment[];

  /** Checklist: as etapas dentro da demanda (BLOCO 13). */
  checklistOf: (demandId: string) => DemandChecklistItem[];
  toggleChecklistItem: (item: DemandChecklistItem) => Promise<void>;
  addChecklistItem: (demandId: string, groupName: string, label: string) => Promise<void>;
  removeChecklistItem: (item: DemandChecklistItem) => Promise<void>;
  /** Copia os itens de um template para o checklist da demanda. */
  applyTemplate: (demandId: string, templateId: string) => Promise<void>;
  templates: DemandTemplate[];

  attachmentsOf: (demandId: string) => DemandAttachment[];
  addComment: (demandId: string, body: string, files: File[]) => Promise<void>;
  deleteComment: (comment: DemandComment) => Promise<void>;
  uploadAttachment: (demandId: string, file: File, commentId?: string) => Promise<void>;
  removeAttachment: (attachment: DemandAttachment) => Promise<void>;
  attachmentUrl: (attachment: DemandAttachment) => string;

  refresh: () => Promise<void>;
}

const DemandasContext = createContext<DemandasContextValue | null>(null);

/** Slug estável a partir de um rótulo digitado ("Em revisão" -> "em_revisao"). */
export function slugifyStatus(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `status_${Date.now()}`;
}

interface DemandsSnapshot {
  demands: Demand[];
  statuses: DemandStatus[];
  clients: DemandClientRef[];
  templates: DemandTemplate[];
}

/** PostgREST devolve agregados embutidos como `[{ count: n }]`. */
function embeddedCount(value: unknown): number {
  if (Array.isArray(value)) return Number(value[0]?.count ?? 0);
  return 0;
}

/** PostgREST devolve o relacionamento reverso de agenda_events(demand_id) como array; no máximo 1 (UNIQUE INDEX). */
function embeddedAgendaEvent(value: unknown): Demand["agenda_event"] {
  if (Array.isArray(value) && value[0]) {
    const event = value[0] as Record<string, unknown>;
    return {
      id: event.id as string,
      google_event_id: (event.google_event_id as string | null) ?? null,
      google_account: (event.google_account as string | null) ?? null,
      status: event.status as string,
    };
  }
  return null;
}

async function fetchDemandsSnapshot(): Promise<DemandsSnapshot> {
  const [demandsRes, statusesRes, clientsRes, templatesRes, checklistRes] = await Promise.all([
    // Os contadores vêm junto para que os cards mostrem "3 comentários" sem
    // precisar abrir a demanda antes. agenda_events(...) é o evento-espelho
    // opcional na Agenda (ver src/lib/demandAgendaSync.ts).
    supabase
      .from("demands")
      .select(
        "*, demand_comments(count), demand_attachments(count), agenda_events(id, google_event_id, google_account, status)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("demand_statuses").select("*").order("position", { ascending: true }),
    supabase.from("clients").select("id, name, nome_fantasia, status").order("name"),
    supabase.from("demand_templates").select("*").order("position", { ascending: true }),
    // Só demand_id e done: o suficiente para o "3/8" da linha, sem puxar os
    // rótulos de todas as etapas de todas as demandas.
    supabase.from("demand_checklist").select("demand_id, done"),
  ]);

  if (demandsRes.error) throw demandsRes.error;
  if (statusesRes.error) throw statusesRes.error;

  // Contagem por demanda, feita uma vez em vez de por linha
  const checklistCounts = new Map<string, { total: number; done: number }>();
  for (const row of (checklistRes.data ?? []) as { demand_id: string; done: boolean }[]) {
    const current = checklistCounts.get(row.demand_id) ?? { total: 0, done: 0 };
    current.total += 1;
    if (row.done) current.done += 1;
    checklistCounts.set(row.demand_id, current);
  }

  const demands = (demandsRes.data ?? []).map((row) => {
    const { demand_comments, demand_attachments, agenda_events, ...demand } = row as Record<
      string,
      unknown
    >;
    return {
      ...(demand as unknown as Demand),
      comment_count: embeddedCount(demand_comments),
      attachment_count: embeddedCount(demand_attachments),
      agenda_event: embeddedAgendaEvent(agenda_events),
      checklist_total: checklistCounts.get(demand.id as string)?.total ?? 0,
      checklist_done: checklistCounts.get(demand.id as string)?.done ?? 0,
    };
  });

  return {
    demands,
    statuses: (statusesRes.data ?? []) as DemandStatus[],
    // Lista de clientes e templates são acessórias: se falharem, a área
    // continua utilizável, só sem o pré-preenchimento.
    clients: (clientsRes.data ?? []) as DemandClientRef[],
    templates: (templatesRes.data ?? []) as DemandTemplate[],
  };
}

/**
 * Dispara o push do evento-espelho para o Google Calendar reusando a mesma
 * rota que a Agenda nativa já usa (`schedule/page.tsx`). A rota lê
 * título/data/descrição/tipo direto da linha em agenda_events pelo `eventId`
 * — não é preciso repassar nada além disso — e grava de volta
 * google_event_id/google_account nessa mesma linha.
 */
async function pushGoogleSync(eventId: string, action: "insert" | "update" | "delete"): Promise<void> {
  const res = await fetch("/api/agenda/google-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
}

function sortDemands(list: Demand[]): Demand[] {
  return [...list].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

export function DemandasProvider({ children }: { children: ReactNode }) {
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [statuses, setStatuses] = useState<DemandStatus[]>([]);
  const [clients, setClients] = useState<DemandClientRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState<DemandFilters>(() => ({
    ...EMPTY_DEMAND_FILTERS,
    hideCompleted: true,
    assigneeId: currentUser?.id ?? null,
  }));
  const soundEnabled = useSyncExternalStore(subscribeSound, readSoundPreference, () => true);

  const initializedUserRef = useRef(false);
  useEffect(() => {
    if (currentUser?.id && !initializedUserRef.current) {
      initializedUserRef.current = true;
      setFiltersState((prev) => ({
        ...prev,
        assigneeId: prev.assigneeId ?? currentUser.id,
      }));
    }
  }, [currentUser?.id]);

  // Detalhes carregados sob demanda ao abrir o drawer
  const [comments, setComments] = useState<Record<string, DemandComment[]>>({});
  const [attachments, setAttachments] = useState<Record<string, DemandAttachment[]>>({});
  const [checklists, setChecklists] = useState<Record<string, DemandChecklistItem[]>>({});
  const [templates, setTemplates] = useState<DemandTemplate[]>([]);

  // A busca é uma função pura (sem setState) para que o efeito abaixo só
  // atualize o estado dentro do callback do `.then` — e para que uma resposta
  // atrasada de um carregamento anterior não sobrescreva a mais recente.
  const applySnapshot = useCallback((snapshot: DemandsSnapshot) => {
    setDemands(sortDemands(snapshot.demands));
    setStatuses(snapshot.statuses);
    setClients(snapshot.clients);
    setTemplates(snapshot.templates);
    setLoading(false);
  }, []);

  const reportLoadError = useCallback(
    (err: unknown) => {
      console.error("Erro ao carregar demandas:", err);
      showToast("Erro ao carregar demandas: " + ((err as Error)?.message ?? ""), "error");
      setLoading(false);
    },
    [showToast],
  );

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    fetchDemandsSnapshot().then(
      (snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      },
      (err) => {
        if (!cancelled) reportLoadError(err);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [currentUser, applySnapshot, reportLoadError]);

  /** Recarrega tudo do banco. Não liga o "carregando": a tela já está cheia. */
  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      applySnapshot(await fetchDemandsSnapshot());
    } catch (err) {
      reportLoadError(err);
    }
  }, [currentUser, applySnapshot, reportLoadError]);

  // -------------------------------------------------------------------------
  // Seletores
  // -------------------------------------------------------------------------

  const getDemand = useCallback(
    (id: string) => demands.find((d) => d.id === id),
    [demands],
  );
  const getStatus = useCallback(
    (id: string) => statuses.find((s) => s.id === id),
    [statuses],
  );
  const getClient = useCallback(
    (id: string | null | undefined) => (id ? clients.find((c) => c.id === id) : undefined),
    [clients],
  );
  const getUser = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const setFilters = useCallback((patch: Partial<DemandFilters>) => {
    setFiltersState((f) => ({ ...f, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFiltersState(EMPTY_DEMAND_FILTERS), []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    writeSoundPreference(enabled);
  }, []);

  const visibleDemands = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return demands.filter((d) => {
      if (filters.scope !== "all" && d.scope !== filters.scope) return false;
      if (filters.clientId && d.client_id !== filters.clientId) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.priority && d.priority !== filters.priority) return false;
      if (filters.hideCompleted && d.status_category === "fechado") return false;
      if (filters.assigneeId) {
        const mine = d.assignee_ids?.includes(filters.assigneeId) || d.assign_all_team;
        if (!mine) return false;
      }
      if (term) {
        const client = getClient(d.client_id);
        const haystack = `${d.title} ${client?.name ?? ""} ${client?.nome_fantasia ?? ""}`;
        if (!haystack.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [demands, filters, getClient]);

  // -------------------------------------------------------------------------
  // Mutações de demanda — otimista com rollback
  // -------------------------------------------------------------------------

  /**
   * Mantém o evento-espelho em agenda_events alinhado ao estado atual da
   * demanda (ver src/lib/demandAgendaSync.ts para a regra). Roda depois que
   * a mutação da própria demanda já teve sucesso — um erro aqui não desfaz
   * a demanda, só avisa que a Agenda ficou fora de sincronia.
   */
  const syncAgendaMirror = useCallback(
    async (demand: Demand) => {
      const plan = computeAgendaMirror(demand);

      if (plan.action === "none") return;

      if (plan.action === "clear") {
        const mirror = demand.agenda_event;
        // Notifica o Google ANTES de apagar a linha local: a rota de sync lê
        // google_event_id/google_account da própria linha em agenda_events.
        if (mirror?.google_event_id) {
          try {
            await pushGoogleSync(mirror.id, "delete");
          } catch (err) {
            console.error("Erro ao remover evento do Google Agenda:", err);
          }
        }
        const { error } = await supabase.from("agenda_events").delete().eq("demand_id", demand.id);
        if (error) {
          showToast("Não foi possível remover o vínculo com a Agenda: " + error.message, "info");
          return;
        }
        setDemands((list) =>
          list.map((d) => (d.id === demand.id ? { ...d, agenda_event: null } : d)),
        );
        return;
      }

      const { payload } = plan;
      const { data: mirrored, error } = await supabase
        .from("agenda_events")
        .upsert({ demand_id: demand.id, ...payload }, { onConflict: "demand_id" })
        .select("id, google_event_id, google_account, status")
        .single();

      if (error || !mirrored) {
        showToast(
          "Demanda salva, mas não foi possível atualizar a Agenda: " + (error?.message ?? ""),
          "info",
        );
        return;
      }

      let agendaEvent = mirrored as NonNullable<Demand["agenda_event"]>;

      if (shouldSyncGoogle(payload.type)) {
        try {
          await pushGoogleSync(mirrored.id, "update");
          const { data: refreshed } = await supabase
            .from("agenda_events")
            .select("id, google_event_id, google_account, status")
            .eq("id", mirrored.id)
            .single();
          if (refreshed) agendaEvent = refreshed as NonNullable<Demand["agenda_event"]>;
        } catch (err) {
          console.error("Erro ao sincronizar com o Google Agenda:", err);
          showToast("Demanda salva na Agenda, mas a sincronização com o Google falhou.", "info");
        }
      } else if (agendaEvent.google_event_id) {
        // O assunto mudou para um que não sincroniza mais — tira do Google e
        // limpa os campos locais, senão fica um evento fantasma por lá.
        try {
          await pushGoogleSync(agendaEvent.id, "delete");
          await supabase
            .from("agenda_events")
            .update({ google_event_id: null, google_account: null })
            .eq("id", agendaEvent.id);
          agendaEvent = { ...agendaEvent, google_event_id: null, google_account: null };
        } catch (err) {
          console.error("Erro ao remover sincronização com o Google Agenda:", err);
        }
      }

      setDemands((list) =>
        list.map((d) => (d.id === demand.id ? { ...d, agenda_event: agendaEvent } : d)),
      );
    },
    [showToast],
  );

  const createDemand = useCallback(
    async (input: Partial<Demand>): Promise<Demand | null> => {
      if (!currentUser) return null;
      const firstStatus = statuses[0]?.id ?? "pending";
      const payload = {
        title: input.title?.trim() || "Nova demanda",
        description: input.description ?? null,
        client_id: input.client_id ?? null,
        status: input.status ?? firstStatus,
        priority: input.priority ?? "none",
        assignee_ids: input.assignee_ids ?? [currentUser.id],
        assign_all_team: input.assign_all_team ?? false,
        created_by: currentUser.id,
        start_date: input.start_date ?? null,
        due_date: input.due_date ?? null,
        due_time: input.due_time ?? null,
        position: input.position ?? Date.now(),
        // "demand" é o padrão de toda demanda nova (aparece na agenda pessoal
        // de quem é responsável). `undefined` = não veio no input (ex.:
        // QuickAddRow) -> aplica o padrão; `null` explícito respeita a
        // escolha de não vincular (ex.: usuário limpou o campo no modal).
        agenda_subject: input.agenda_subject === undefined ? "demand" : input.agenda_subject,
      };

      const { data, error } = await supabase
        .from("demands")
        .insert(payload)
        .select("*")
        .single();

      if (error || !data) {
        console.error("Erro ao criar demanda:", error);
        showToast("Erro ao criar demanda: " + (error?.message ?? ""), "error");
        return null;
      }

      const created = data as Demand;
      setDemands((list) => sortDemands([created, ...list]));
      showToast("Demanda criada!", "success");
      syncAgendaMirror(created).catch((err) => {
        console.error("Erro ao sincronizar demanda com a Agenda:", err);
      });
      return created;
    },
    [currentUser, statuses, showToast, syncAgendaMirror],
  );

  const updateDemand = useCallback(
    async (id: string, patch: Partial<Demand>) => {
      const previous = demands.find((d) => d.id === id);
      if (!previous) return;

      // Localmente o patch vai enriquecido com o que a trigger derivaria, para
      // a interface não ficar meio-atualizada durante a ida ao servidor. Para
      // o banco segue o patch original — lá quem calcula isso é a trigger.
      const optimistic = deriveStatusFields(patch, statuses);

      setDemands((list) =>
        sortDemands(list.map((d) => (d.id === id ? { ...d, ...optimistic } : d))),
      );

      const { data, error } = await supabase
        .from("demands")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        // rollback
        setDemands((list) => sortDemands(list.map((d) => (d.id === id ? previous : d))));
        console.error("Erro ao salvar demanda:", error);
        showToast("Erro ao salvar: " + error.message, "error");
        return;
      }

      // A trigger recalcula status_category / assigned_to / completed_at.
      // Mesclado (e não substituído) para não perder os agregados
      // comment_count/attachment_count nem agenda_event, que este SELECT não traz.
      if (data) {
        const merged: Demand = { ...previous, ...optimistic, ...(data as Demand) };
        setDemands((list) => sortDemands(list.map((d) => (d.id === id ? merged : d))));
        syncAgendaMirror(merged).catch((err) => {
          console.error("Erro ao sincronizar demanda com a Agenda:", err);
        });
      }
    },
    [demands, statuses, showToast, syncAgendaMirror],
  );

  const deleteDemand = useCallback(
    async (id: string) => {
      const previous = demands;
      const demand = demands.find((d) => d.id === id);

      // O evento-espelho é removido em cascata pelo banco (FK ON DELETE
      // CASCADE), mas isso não avisa o Google — precisa apagar de lá antes,
      // enquanto a linha em agenda_events (e o google_event_id) ainda existe.
      if (demand?.agenda_event?.google_event_id) {
        try {
          await pushGoogleSync(demand.agenda_event.id, "delete");
        } catch (err) {
          console.error("Erro ao remover evento do Google Agenda:", err);
        }
      }

      setDemands((list) => list.filter((d) => d.id !== id));

      const { error } = await supabase.from("demands").delete().eq("id", id);
      if (error) {
        setDemands(previous);
        showToast("Erro ao excluir: " + error.message, "error");
        return;
      }
      showToast("Demanda excluída.", "success");
    },
    [demands, showToast],
  );

  const moveDemand = useCallback(
    async (id: string, statusId: string, position?: number) => {
      const patch: Partial<Demand> = { status: statusId };
      if (position !== undefined) patch.position = position;
      await updateDemand(id, patch);
    },
    [updateDemand],
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const demand = demands.find((d) => d.id === id);
      if (!demand) return;

      const closed = statuses.find((s) => s.category === "fechado");
      const open =
        statuses.find((s) => s.category === "nao_iniciado") ??
        statuses.find((s) => s.category === "ativo");

      if (demand.status_category === "fechado") {
        if (!open) {
          showToast("Nenhum status aberto configurado.", "error");
          return;
        }
        await updateDemand(id, { status: open.id });
        return;
      }

      if (!closed) {
        showToast("Nenhum status de conclusão configurado.", "error");
        return;
      }
      // Só ao concluir — reabrir não faz som
      if (soundEnabled) playSound("task_done");
      await updateDemand(id, { status: closed.id });
    },
    [demands, statuses, updateDemand, showToast, soundEnabled],
  );

  const batchUpdateDemands = useCallback(
    async (ids: string[], patch: Partial<Demand>) => {
      if (ids.length === 0) return;
      const previous = demands;
      const optimistic = deriveStatusFields(patch, statuses);

      setDemands((list) =>
        sortDemands(list.map((d) => (ids.includes(d.id) ? { ...d, ...optimistic } : d))),
      );

      const { error } = await supabase
        .from("demands")
        .update(patch)
        .in("id", ids);

      if (error) {
        setDemands(previous);
        console.error("Erro ao atualizar demandas em lote:", error);
        showToast("Erro ao atualizar em lote: " + error.message, "error");
        return;
      }

      showToast(`${ids.length} demanda${ids.length > 1 ? "s" : ""} atualizada${ids.length > 1 ? "s" : ""}.`, "success");
      refresh();
    },
    [demands, statuses, showToast, refresh],
  );

  const batchMoveDemands = useCallback(
    async (ids: string[], statusId: string) => {
      await batchUpdateDemands(ids, { status: statusId });
    },
    [batchUpdateDemands],
  );

  const batchDeleteDemands = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const previous = demands;

      setDemands((list) => list.filter((d) => !ids.includes(d.id)));

      const { error } = await supabase.from("demands").delete().in("id", ids);
      if (error) {
        setDemands(previous);
        showToast("Erro ao excluir demandas: " + error.message, "error");
        return;
      }
      showToast(`${ids.length} demanda${ids.length > 1 ? "s" : ""} excluída${ids.length > 1 ? "s" : ""}.`, "success");
    },
    [demands, showToast],
  );

  const batchToggleComplete = useCallback(
    async (ids: string[], done: boolean) => {
      if (ids.length === 0) return;
      const targetStatus = done
        ? statuses.find((s) => s.category === "fechado")
        : statuses.find((s) => s.category === "nao_iniciado") ??
          statuses.find((s) => s.category === "ativo");

      if (!targetStatus) {
        showToast("Status de destino não encontrado.", "error");
        return;
      }

      if (done && soundEnabled) playSound("task_done");
      await batchUpdateDemands(ids, { status: targetStatus.id });
    },
    [statuses, soundEnabled, batchUpdateDemands, showToast],
  );

  // -------------------------------------------------------------------------
  // Status personalizáveis
  // -------------------------------------------------------------------------

  const upsertStatus = useCallback(
    async (status: DemandStatus) => {
      const { data, error } = await supabase
        .from("demand_statuses")
        .upsert(status)
        .select("*")
        .single();

      if (error || !data) {
        showToast("Erro ao salvar status: " + (error?.message ?? ""), "error");
        return;
      }

      const saved = data as DemandStatus;
      setStatuses((list) => {
        const next = list.some((s) => s.id === saved.id)
          ? list.map((s) => (s.id === saved.id ? saved : s))
          : [...list, saved];
        return next.sort((a, b) => a.position - b.position);
      });
      // A categoria pode ter mudado — recarrega para trazer status_category atualizado
      await refresh();
    },
    [showToast, refresh],
  );

  const deleteStatus = useCallback(
    async (id: string) => {
      if (statuses.length <= 1) {
        showToast("É preciso manter ao menos um status.", "error");
        return;
      }
      if (demands.some((d) => d.status === id)) {
        showToast("Mova as demandas deste status antes de excluí-lo.", "error");
        return;
      }

      const { error } = await supabase.from("demand_statuses").delete().eq("id", id);
      if (error) {
        showToast("Erro ao excluir status: " + error.message, "error");
        return;
      }
      setStatuses((list) => list.filter((s) => s.id !== id));
    },
    [statuses, demands, showToast],
  );

  const reorderStatuses = useCallback(
    async (orderedIds: string[]) => {
      const previous = statuses;
      const next = orderedIds
        .map((id, index) => {
          const found = previous.find((s) => s.id === id);
          return found ? { ...found, position: index } : null;
        })
        .filter((s): s is DemandStatus => s !== null);

      if (next.length !== previous.length) return;
      setStatuses(next);

      const { error } = await supabase
        .from("demand_statuses")
        .upsert(next.map(({ id, label, color, category, position }) => ({
          id,
          label,
          color,
          category,
          position,
        })));

      if (error) {
        setStatuses(previous);
        showToast("Erro ao reordenar status: " + error.message, "error");
      }
    },
    [statuses, showToast],
  );

  // -------------------------------------------------------------------------
  // Comentários e anexos
  // -------------------------------------------------------------------------

  const loadDetails = useCallback(async (demandId: string) => {
    const [commentsRes, attachmentsRes, checklistRes] = await Promise.all([
      supabase
        .from("demand_comments")
        .select("*")
        .eq("demand_id", demandId)
        .order("created_at", { ascending: true }),
      supabase
        .from("demand_attachments")
        .select("*")
        .eq("demand_id", demandId)
        .order("created_at", { ascending: true }),
      supabase
        .from("demand_checklist")
        .select("*")
        .eq("demand_id", demandId)
        .order("position", { ascending: true }),
    ]);

    if (!checklistRes.error) {
      setChecklists((map) => ({
        ...map,
        [demandId]: (checklistRes.data ?? []) as DemandChecklistItem[],
      }));
    }

    if (!commentsRes.error) {
      setComments((map) => ({ ...map, [demandId]: (commentsRes.data ?? []) as DemandComment[] }));
    }
    if (!attachmentsRes.error) {
      setAttachments((map) => ({
        ...map,
        [demandId]: (attachmentsRes.data ?? []) as DemandAttachment[],
      }));
    }
  }, []);

  const commentsOf = useCallback(
    (demandId: string) => comments[demandId] ?? [],
    [comments],
  );
  const attachmentsOf = useCallback(
    (demandId: string) => attachments[demandId] ?? [],
    [attachments],
  );

  const attachmentUrl = useCallback((attachment: DemandAttachment) => {
    return supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(attachment.file_path).data
      .publicUrl;
  }, []);

  /** Sobe o arquivo para o storage e grava a linha em demand_attachments. */
  const putAttachment = useCallback(
    async (demandId: string, file: File, commentId?: string) => {
      if (!currentUser) return;
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${demandId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("demand_attachments")
        .insert({
          demand_id: demandId,
          comment_id: commentId ?? null,
          user_id: currentUser.id,
          name: file.name,
          file_path: path,
          file_type: file.type,
          size: file.size,
        })
        .select("*")
        .single();

      if (error || !data) {
        // Não deixa arquivo órfão no bucket se a linha falhar
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
        throw error ?? new Error("Falha ao registrar anexo");
      }

      setAttachments((map) => ({
        ...map,
        [demandId]: [...(map[demandId] ?? []), data as DemandAttachment],
      }));
    },
    [currentUser],
  );

  const uploadAttachment = useCallback(
    async (demandId: string, file: File, commentId?: string) => {
      try {
        await putAttachment(demandId, file, commentId);
        showToast("Anexo enviado!", "success");
      } catch (err) {
        console.error("Erro ao enviar anexo:", err);
        showToast("Erro ao enviar anexo: " + ((err as Error)?.message ?? ""), "error");
      }
    },
    [putAttachment, showToast],
  );

  const removeAttachment = useCallback(
    async (attachment: DemandAttachment) => {
      const { error } = await supabase
        .from("demand_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) {
        showToast("Erro ao remover anexo: " + error.message, "error");
        return;
      }

      await supabase.storage.from(ATTACHMENTS_BUCKET).remove([attachment.file_path]);
      setAttachments((map) => ({
        ...map,
        [attachment.demand_id]: (map[attachment.demand_id] ?? []).filter(
          (a) => a.id !== attachment.id,
        ),
      }));
    },
    [showToast],
  );

  const addComment = useCallback(
    async (demandId: string, body: string, files: File[]) => {
      if (!currentUser) return;
      if (!body.trim() && files.length === 0) return;

      const { data, error } = await supabase
        .from("demand_comments")
        .insert({ demand_id: demandId, user_id: currentUser.id, body: body.trim() })
        .select("*")
        .single();

      if (error || !data) {
        showToast("Erro ao comentar: " + (error?.message ?? ""), "error");
        return;
      }

      const comment = data as DemandComment;
      setComments((map) => ({
        ...map,
        [demandId]: [...(map[demandId] ?? []), comment],
      }));

      for (const file of files) {
        try {
          await putAttachment(demandId, file, comment.id);
        } catch (err) {
          console.error("Erro ao anexar no comentário:", err);
          showToast(`Erro ao anexar "${file.name}".`, "error");
        }
      }
    },
    [currentUser, putAttachment, showToast],
  );

  const deleteComment = useCallback(
    async (comment: DemandComment) => {
      const { error } = await supabase
        .from("demand_comments")
        .delete()
        .eq("id", comment.id);

      if (error) {
        showToast("Erro ao excluir comentário: " + error.message, "error");
        return;
      }

      // O CASCADE já removeu as linhas dos anexos; limpa os arquivos do bucket
      const orphans = (attachments[comment.demand_id] ?? []).filter(
        (a) => a.comment_id === comment.id,
      );
      if (orphans.length) {
        await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .remove(orphans.map((a) => a.file_path));
      }

      setComments((map) => ({
        ...map,
        [comment.demand_id]: (map[comment.demand_id] ?? []).filter((c) => c.id !== comment.id),
      }));
      setAttachments((map) => ({
        ...map,
        [comment.demand_id]: (map[comment.demand_id] ?? []).filter(
          (a) => a.comment_id !== comment.id,
        ),
      }));
    },
    [attachments, showToast],
  );

  // -------------------------------------------------------------------------
  // Checklist e templates
  // -------------------------------------------------------------------------

  const checklistOf = useCallback(
    (demandId: string) => checklists[demandId] ?? [],
    [checklists],
  );

  /** Mantém os agregados da linha em dia sem recarregar a lista inteira. */
  const syncChecklistCounts = useCallback(
    (demandId: string, items: DemandChecklistItem[]) => {
      setDemands((list) =>
        list.map((demand) =>
          demand.id === demandId
            ? {
                ...demand,
                checklist_total: items.length,
                checklist_done: items.filter((item) => item.done).length,
              }
            : demand,
        ),
      );
    },
    [],
  );

  const toggleChecklistItem = useCallback(
    async (item: DemandChecklistItem) => {
      const next = !item.done;
      const updated = (checklists[item.demand_id] ?? []).map((current) =>
        current.id === item.id ? { ...current, done: next } : current,
      );

      setChecklists((map) => ({ ...map, [item.demand_id]: updated }));
      syncChecklistCounts(item.demand_id, updated);

      const { error } = await supabase
        .from("demand_checklist")
        .update({ done: next })
        .eq("id", item.id);

      if (error) {
        // rollback
        const reverted = updated.map((current) =>
          current.id === item.id ? { ...current, done: item.done } : current,
        );
        setChecklists((map) => ({ ...map, [item.demand_id]: reverted }));
        syncChecklistCounts(item.demand_id, reverted);
        showToast("Erro ao marcar item: " + error.message, "error");
      }
    },
    [checklists, syncChecklistCounts, showToast],
  );

  const addChecklistItem = useCallback(
    async (demandId: string, groupName: string, label: string) => {
      const current = checklists[demandId] ?? [];
      const { data, error } = await supabase
        .from("demand_checklist")
        .insert({
          demand_id: demandId,
          group_name: groupName,
          label: label.trim(),
          position: current.length,
        })
        .select("*")
        .single();

      if (error || !data) {
        showToast("Erro ao adicionar item: " + (error?.message ?? ""), "error");
        return;
      }

      const next = [...current, data as DemandChecklistItem];
      setChecklists((map) => ({ ...map, [demandId]: next }));
      syncChecklistCounts(demandId, next);
    },
    [checklists, syncChecklistCounts, showToast],
  );

  const removeChecklistItem = useCallback(
    async (item: DemandChecklistItem) => {
      const next = (checklists[item.demand_id] ?? []).filter((current) => current.id !== item.id);
      setChecklists((map) => ({ ...map, [item.demand_id]: next }));
      syncChecklistCounts(item.demand_id, next);

      const { error } = await supabase.from("demand_checklist").delete().eq("id", item.id);
      if (error) {
        showToast("Erro ao remover item: " + error.message, "error");
        await loadDetails(item.demand_id);
      }
    },
    [checklists, syncChecklistCounts, showToast, loadDetails],
  );

  const applyTemplate = useCallback(
    async (demandId: string, templateId: string) => {
      const { data: items, error: itemsError } = await supabase
        .from("demand_template_items")
        .select("group_name, label, position")
        .eq("template_id", templateId)
        .order("position", { ascending: true });

      if (itemsError || !items?.length) {
        showToast("Template sem itens: " + (itemsError?.message ?? ""), "error");
        return;
      }

      // Acrescenta ao que já existe, em vez de substituir: aplicar um segundo
      // template (conteúdo + captação) é caso de uso real.
      const offset = (checklists[demandId] ?? []).length;
      const rows = items.map((item, index) => ({
        demand_id: demandId,
        group_name: item.group_name,
        label: item.label,
        position: offset + index,
      }));

      const { data, error } = await supabase.from("demand_checklist").insert(rows).select("*");
      if (error || !data) {
        showToast("Erro ao aplicar template: " + (error?.message ?? ""), "error");
        return;
      }

      const next = [...(checklists[demandId] ?? []), ...(data as DemandChecklistItem[])];
      setChecklists((map) => ({ ...map, [demandId]: next }));
      syncChecklistCounts(demandId, next);
      showToast(`${data.length} etapas adicionadas.`, "success");
    },
    [checklists, syncChecklistCounts, showToast],
  );

  const value = useMemo<DemandasContextValue>(
    () => ({
      demands,
      statuses,
      clients,
      users,
      loading,
      filters,
      setFilters,
      resetFilters,
      visibleDemands,
      getDemand,
      getStatus,
      getClient,
      getUser,
      createDemand,
      updateDemand,
      deleteDemand,
      moveDemand,
      toggleComplete,
      batchUpdateDemands,
      batchMoveDemands,
      batchDeleteDemands,
      batchToggleComplete,
      soundEnabled,
      setSoundEnabled,
      upsertStatus,
      deleteStatus,
      reorderStatuses,
      loadDetails,
      commentsOf,
      checklistOf,
      toggleChecklistItem,
      addChecklistItem,
      removeChecklistItem,
      applyTemplate,
      templates,
      attachmentsOf,
      addComment,
      deleteComment,
      uploadAttachment,
      removeAttachment,
      attachmentUrl,
      refresh,
    }),
    [
      demands,
      statuses,
      clients,
      users,
      loading,
      filters,
      setFilters,
      resetFilters,
      visibleDemands,
      getDemand,
      getStatus,
      getClient,
      getUser,
      createDemand,
      updateDemand,
      deleteDemand,
      moveDemand,
      toggleComplete,
      batchUpdateDemands,
      batchMoveDemands,
      batchDeleteDemands,
      batchToggleComplete,
      soundEnabled,
      setSoundEnabled,
      upsertStatus,
      deleteStatus,
      reorderStatuses,
      loadDetails,
      commentsOf,
      checklistOf,
      toggleChecklistItem,
      addChecklistItem,
      removeChecklistItem,
      applyTemplate,
      templates,
      attachmentsOf,
      addComment,
      deleteComment,
      uploadAttachment,
      removeAttachment,
      attachmentUrl,
      refresh,
    ],
  );

  return <DemandasContext.Provider value={value}>{children}</DemandasContext.Provider>;
}

export function useDemandas(): DemandasContextValue {
  const ctx = useContext(DemandasContext);
  if (!ctx) throw new Error("useDemandas deve ser usado dentro de <DemandasProvider>");
  return ctx;
}
