"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, UserCircle2 } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { DatesSetArg, DayCellContentArg, EventContentArg, EventDropArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { AGENDA_CATEGORIES as CATEGORIES, AGENDA_PRIMARY_CATEGORY_IDS, getAgendaCategory, isAgendaPrimarySelection } from "@/lib/agendaCategories";
import {
  addDays,
  isSameDay,
  itemFromAgendaEvent,
  itemFromInvoice,
  matchesResponsible,
  type RawAgendaEvent,
  type RawInvoice,
  startOfDayLocal,
  timeLabel,
  toLocalInputValue,
  type AgendaItem,
} from "@/lib/agendaItems";
import { toISODate } from "@/lib/dueDate";
import { tint } from "@/lib/tint";
import Combobox from "@/components/ui/Combobox";
import { UserAvatar } from "@/components/demandas/AssigneePicker";
import { playSound } from "@/utils/audio";
import AgendaSidePanel from "@/components/agenda/AgendaSidePanel";
import AgendaToolbar, { type CalendarViewId } from "@/components/agenda/AgendaToolbar";
import BottomSheet from "@/components/agenda/BottomSheet";
import CategoryFilterChips from "@/components/agenda/CategoryFilterChips";
import type { OpenPoint } from "@/components/agenda/DayEventList";
import EventDetails from "@/components/agenda/EventDetails";
import { EventFormPanel, type AgendaClient, type EventFormData } from "@/components/agenda/EventForm";
import FloatingPopover from "@/components/agenda/FloatingPopover";
import GoogleAgendaModal from "@/components/agenda/GoogleAgendaModal";
import GoogleSyncButton, { type GoogleAccountState } from "@/components/agenda/GoogleSyncButton";
import MobileAgenda, { type MobileView } from "@/components/agenda/MobileAgenda";

const VIEW_STORAGE_KEY = "pratic-agenda-view";
const MOBILE_VIEW_STORAGE_KEY = "pratic-agenda-mobile-view";
const DESKTOP_VIEWS: CalendarViewId[] = ["dayGridMonth", "timeGridWeek", "timeGridDay", "listWeek"];
const MOBILE_VIEWS: MobileView[] = ["day", "month", "list"];
const ALL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

interface RawClient {
  id: string;
  name: string;
  nome_fantasia?: string | null;
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored && (allowed as readonly string[]).includes(stored)) return stored as T;
  } catch {
    // localStorage indisponível (janela privada, site data bloqueado)
  }
  return fallback;
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage indisponível
  }
}

/** Hoje: próxima hora cheia. Outro dia: 10:00. */
function defaultStartFor(day: Date, now: Date): Date {
  const start = startOfDayLocal(day);
  if (isSameDay(day, now) && now.getHours() < 22) start.setHours(now.getHours() + 1, 0, 0, 0);
  else start.setHours(10, 0, 0, 0);
  return start;
}

function emptyForm(date: Date): EventFormData {
  return {
    title: "",
    type: "meeting",
    date: toLocalInputValue(date),
    client_id: "",
    visibility: "public",
    status: "scheduled",
    description: "",
  };
}

function formFromItem(item: AgendaItem): EventFormData {
  return {
    title: item.title,
    type: item.type,
    date: toLocalInputValue(item.start),
    client_id: item.clientId ?? "",
    visibility: item.visibility === "private" ? "private" : "public",
    status: item.status,
    description: item.description,
  };
}

type PanelState =
  | { mode: "closed" }
  | { mode: "details"; itemId: string; x: number; y: number }
  | { mode: "form"; itemId: string | null; x: number; y: number };

const CLOSED: PanelState = { mode: "closed" };

/** Ponto de origem do popover: o clique, ou o centro da tela (teclado, sem coordenadas). */
function pointOrCenter(point?: OpenPoint): OpenPoint {
  if (point && (point.x || point.y)) return point;
  return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
}

export default function SchedulePage() {
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<AgendaClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([...AGENDA_PRIMARY_CATEGORY_IDS]);
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => startOfDayLocal(new Date()));

  const [desktopView, setDesktopView] = useState<CalendarViewId>(() =>
    readStored(VIEW_STORAGE_KEY, DESKTOP_VIEWS, "dayGridMonth"),
  );
  const [mobileView, setMobileView] = useState<MobileView>(() =>
    readStored(MOBILE_VIEW_STORAGE_KEY, MOBILE_VIEWS, "day"),
  );
  const [calendarTitle, setCalendarTitle] = useState("");
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  const [panel, setPanel] = useState<PanelState>(CLOSED);
  const [formData, setFormData] = useState<EventFormData>(() => emptyForm(new Date()));

  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    oauthReady?: boolean;
    accounts?: {
      agenciapratic?: { configured: boolean; valid?: boolean; expired?: boolean; error?: string; email: string };
      praticlabs?: { configured: boolean; valid?: boolean; expired?: boolean; error?: string; email: string };
    };
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // O painel do dia e a linha de "agora" acompanham o relógio.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("id, name, nome_fantasia, status").order("name");
    if (data) setClients(data as AgendaClient[]);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data: agendaData, error: agendaError } = await supabase
        .from("agenda_events")
        .select("*, demands(assignee_ids, assign_all_team)");

      if (agendaError) throw agendaError;
      const agendaEvents = (agendaData ?? []) as RawAgendaEvent[];

      // Regras de visibilidade: espelho de demanda só para os responsáveis
      // (ou equipe toda); público para todos; privado só para quem criou.
      const visibleAgendaEvents = agendaEvents.filter((event) => {
        if (event.demand_id && event.demands) {
          if (event.demands.assign_all_team) return true;
          return Array.isArray(event.demands.assignee_ids) && event.demands.assignee_ids.includes(currentUser.id);
        }
        if (event.visibility === "public") return true;
        return event.assigned_to === currentUser.id;
      });

      let invoiceItems: AgendaItem[] = [];
      if (currentUser.role === "admin" || currentUser.role === "board") {
        const [invoicesRes, clientsRes] = await Promise.all([
          supabase.from("invoices").select("*").order("due_date"),
          supabase.from("clients").select("id, name, nome_fantasia"),
        ]);
        if (invoicesRes.error) throw invoicesRes.error;
        const localClients = (clientsRes.data ?? []) as RawClient[];
        invoiceItems = ((invoicesRes.data ?? []) as RawInvoice[]).map((invoice) => {
          const client = localClients.find((c) => c.id === invoice.client_id);
          return itemFromInvoice(invoice, client?.nome_fantasia || client?.name || "Cliente");
        });
      }

      setItems([...visibleAgendaEvents.map(itemFromAgendaEvent), ...invoiceItems]);
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; hint?: string };
      console.error("Erro ao buscar agenda:", { message: error.message, details: error.details, hint: error.hint, error: err });
      showToast("Erro ao carregar agenda", "error");
    }
  }, [currentUser, showToast]);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agenda/google-sync");
      if (res.ok) setGoogleStatus(await res.json());
    } catch (err) {
      console.error("Erro ao verificar status do Google Agenda:", err);
    }
  }, []);

  const pullFromGoogle = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setIsSyncingGoogle(true);
        const res = await fetch("/api/agenda/google-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pull", account: "agenciapratic" }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.isExpired || data.error?.includes("expirou") || data.error?.includes("invalid_grant")) {
            setGoogleStatus((prev) =>
              prev
                ? {
                    ...prev,
                    accounts: {
                      ...prev.accounts,
                      agenciapratic: {
                        ...prev.accounts?.agenciapratic,
                        configured: true,
                        valid: false,
                        expired: true,
                        email: "agenciapratic@gmail.com",
                      },
                    },
                  }
                : prev,
            );
            if (!silent) {
              setShowGoogleModal(true);
              showToast("A autorização do Google Agenda expirou. Reconecte a conta.", "info");
            }
            return;
          }
          if (!silent && (data.accountNotConfigured || data.error?.includes("não configurada"))) {
            setShowGoogleModal(true);
          }
          if (!silent) throw new Error(data.error || "Erro ao sincronizar com o Google Agenda");
          return;
        }

        setLastSyncedAt(Date.now());
        const totalChanges = (data.inserted || 0) + (data.updated || 0) + (data.deleted || 0);
        if (totalChanges > 0) {
          showToast(`Sincronizado com Google! ${data.inserted} novos, ${data.updated} atualizados.`, "success");
          await fetchEvents();
        } else if (!silent) {
          showToast("Agenda já sincronizada com agenciapratic@gmail.com!", "success");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Falha na sincronização";
        console.error("Erro na sincronização:", err);
        if (!silent) showToast(message, "error");
      } finally {
        if (!silent) setIsSyncingGoogle(false);
      }
    },
    [fetchEvents, showToast],
  );

  useEffect(() => {
    // Carga inicial: dados primeiro; depois o status do Google e uma sincronização silenciosa.
    void (async () => {
      await Promise.all([fetchEvents(), fetchClients()]);
      await fetchGoogleStatus();
      await pullFromGoogle(true);
    })();

    const handleFocus = () => pullFromGoogle(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchEvents, fetchClients, fetchGoogleStatus, pullFromGoogle]);

  const syncToGoogleCalendar = async (
    eventId: string,
    action: "insert" | "update" | "delete",
    data?: { title: string; type: string; date: string; description?: string },
  ) => {
    try {
      const res = await fetch("/api/agenda/google-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, action, ...data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
    } catch (err: unknown) {
      console.error("Erro ao sincronizar com Google Agenda:", err);
      const message = err instanceof Error ? err.message : "";
      showToast(message ? `Google Agenda: ${message}` : "Falha ao sincronizar com Google Agenda", "info");
    }
  };

  /* ------------------------------------------------------------ derivados */

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const clientNames = useMemo(
    () => new Map(clients.map((c) => [c.id, c.nome_fantasia || c.name])),
    [clients],
  );
  const selectedItem = panel.mode !== "closed" && panel.itemId ? (itemsById.get(panel.itemId) ?? null) : null;

  // Busca + responsável (antes do filtro de assunto, para as contagens do painel).
  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesResponsible(item, responsibleFilter)) return false;
      if (!query) return true;
      const client = item.clientId ? (clientNames.get(item.clientId) ?? "") : "";
      return item.title.toLowerCase().includes(query) || client.toLowerCase().includes(query);
    });
  }, [items, searchQuery, responsibleFilter, clientNames]);

  const filteredItems = useMemo(
    () => searchedItems.filter((item) => activeFilters.includes(item.type)),
    [searchedItems, activeFilters],
  );

  // Contagem por assunto no período que a tela mostra: o do calendário no
  // desktop, o mês do dia selecionado no mobile.
  const categoryCounts = useMemo(() => {
    const start = isMobile
      ? new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1)
      : visibleRange?.start;
    const end = isMobile
      ? new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 1)
      : visibleRange?.end;
    const counts: Record<string, number> = {};
    for (const category of CATEGORIES) counts[category.id] = 0;
    for (const item of searchedItems) {
      if (start && item.start < start) continue;
      if (end && item.start >= end) continue;
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [searchedItems, isMobile, selectedDay, visibleRange]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      filteredItems.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.allDay ? toISODate(item.start) : item.start,
        allDay: item.allDay,
        // Espelho de demanda só se edita pela demanda; fatura é somente leitura.
        editable: !item.demandId && !item.isInvoice,
      })),
    [filteredItems],
  );

  const googleState: GoogleAccountState = !googleStatus
    ? "checking"
    : googleStatus.accounts?.agenciapratic?.expired
      ? "expired"
      : googleStatus.accounts?.agenciapratic?.configured
        ? "ok"
        : "pending";

  /* -------------------------------------------------------------- filtros */

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  const resetFilters = () => setActiveFilters(ALL_CATEGORY_IDS);
  const toggleMine = () =>
    setResponsibleFilter((prev) => (currentUser && prev === currentUser.id ? null : (currentUser?.id ?? null)));

  const userOptions = useMemo(
    () =>
      users.map((user) => {
        const handle = user.username ? `@${user.username}` : user.name || user.email;
        return {
          value: user.id,
          label: handle,
          description: user.name && user.username ? user.name : undefined,
          keywords: `${user.username || ""} ${user.name || ""} ${user.email || ""}`.trim(),
          icon: <UserAvatar name={handle} avatarUrl={user.avatar_url ?? user.avatarUrl} size={20} ring={false} />,
        };
      }),
    [users],
  );

  const responsibleCombobox =
    users.length > 0 ? (
      <Combobox
        value={responsibleFilter}
        onChange={setResponsibleFilter}
        options={userOptions}
        ariaLabel="Filtrar por responsável"
        searchPlaceholder="Buscar pessoa…"
        clearOption={{ label: "Toda a equipe", icon: <UserCircle2 size={14} /> }}
      />
    ) : null;

  const mineActive = Boolean(currentUser && responsibleFilter === currentUser.id);

  /* -------------------------------------------------------------- painéis */

  const closePanel = useCallback(() => setPanel(CLOSED), []);

  const openNew = (day: Date, point?: OpenPoint, exactDate?: Date) => {
    const at = pointOrCenter(point);
    setFormData(emptyForm(exactDate ?? defaultStartFor(day, now)));
    setPanel({ mode: "form", itemId: null, ...at });
  };

  const openDetails = (item: AgendaItem, point?: OpenPoint) => {
    const at = pointOrCenter(point);
    setFormData(formFromItem(item));
    setPanel({ mode: "details", itemId: item.id, ...at });
  };

  const openEdit = (item: AgendaItem) => {
    if (item.demandId || item.isInvoice) return;
    setFormData(formFromItem(item));
    setPanel((prev) => ({
      mode: "form",
      itemId: item.id,
      ...pointOrCenter(prev.mode === "closed" ? undefined : { x: prev.x, y: prev.y }),
    }));
  };

  /** Fechar o formulário por gesto/arrasto: pergunta antes de perder o que foi digitado. */
  const dismissFormByGesture = () => {
    const dirty = formData.title.trim() !== "" || formData.description.trim() !== "";
    if (dirty && !selectedItem && !window.confirm("Descartar este compromisso?")) return;
    closePanel();
  };

  /* -------------------------------------------------------------- mutações */

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      showToast("Título é obrigatório", "error");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title: formData.title.trim(),
        type: formData.type,
        date: new Date(formData.date).toISOString(),
        client_id: formData.client_id || null,
        visibility: formData.visibility,
        status: formData.status,
        description: formData.description,
        assigned_to: currentUser?.id,
      };

      const editing = selectedItem && !selectedItem.isInvoice ? selectedItem : null;
      let savedEventId: string | undefined = editing?.id;

      if (editing) {
        const { error } = await supabase.from("agenda_events").update(eventData).eq("id", editing.id);
        if (error) throw error;
        showToast("Compromisso atualizado!", "success");
      } else {
        const { data: inserted, error } = await supabase
          .from("agenda_events")
          .insert([eventData])
          .select("id")
          .single();
        if (error) throw error;
        savedEventId = inserted?.id;
        showToast("Compromisso criado!", "success");
      }

      if (formData.status === "completed" && editing?.status !== "completed") playSound("task_done");

      if (formData.visibility === "public" && savedEventId) {
        await syncToGoogleCalendar(savedEventId, editing ? "update" : "insert", {
          title: eventData.title,
          type: eventData.type,
          date: eventData.date,
          description: eventData.description,
        });
      }

      // Leva a tela até o dia salvo, para o compromisso novo aparecer onde o usuário está olhando.
      const savedDay = startOfDayLocal(new Date(eventData.date));
      setSelectedDay(savedDay);
      calendarRef.current?.getApi().gotoDate(savedDay);

      closePanel();
      await fetchEvents();
    } catch (err: unknown) {
      console.error("Erro ao salvar evento:", err);
      showToast(err instanceof Error ? err.message : "Erro ao salvar compromisso", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AgendaItem) => {
    if (item.isInvoice || item.demandId) return;
    try {
      await syncToGoogleCalendar(item.id, "delete");
      const { error } = await supabase.from("agenda_events").delete().eq("id", item.id);
      if (error) throw error;
      showToast("Compromisso excluído", "success");
      closePanel();
      fetchEvents();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      showToast("Erro ao excluir", "error");
    }
  };

  const toggleComplete = async (item: AgendaItem) => {
    if (item.isInvoice || item.demandId) return;
    const nextStatus = item.status === "completed" ? "scheduled" : "completed";
    try {
      const { error } = await supabase.from("agenda_events").update({ status: nextStatus }).eq("id", item.id);
      if (error) throw error;
      if (nextStatus === "completed") playSound("task_done");
      // Atualiza já na tela; o refetch confirma em seguida.
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)));
      setFormData((prev) => (panel.mode !== "closed" && panel.itemId === item.id ? { ...prev, status: nextStatus } : prev));
      fetchEvents();
      showToast(nextStatus === "completed" ? "Concluído!" : "Marcado como pendente", "success");
    } catch {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const reschedule = async (item: AgendaItem, newStart: Date): Promise<boolean> => {
    try {
      const newDate = newStart.toISOString();
      const { error } = await supabase.from("agenda_events").update({ date: newDate }).eq("id", item.id);
      if (error) throw error;
      fetchEvents();
      if (item.visibility !== "private") {
        await syncToGoogleCalendar(item.id, "update", {
          title: item.title,
          type: item.type,
          date: newDate,
          description: item.description,
        });
      }
      return true;
    } catch (err: unknown) {
      console.error("Erro ao reagendar:", err);
      showToast(err instanceof Error ? err.message : "Erro ao reagendar", "error");
      return false;
    }
  };

  const moveToTomorrow = async (item: AgendaItem) => {
    if (item.isInvoice || item.demandId) return;
    if (await reschedule(item, addDays(item.start, 1))) showToast("Movido para amanhã", "success");
  };

  const handleEventDrop = async (arg: EventDropArg) => {
    const item = itemsById.get(arg.event.id);
    if (!item || !arg.event.start) return arg.revert();
    if (item.isInvoice) {
      arg.revert();
      showToast("Não é possível mover faturas pelo calendário", "info");
      return;
    }
    if (item.demandId) {
      arg.revert();
      showToast("Este compromisso vem de uma demanda — edite a data por lá", "info");
      return;
    }
    if (await reschedule(item, arg.event.start)) showToast("Compromisso reagendado!", "success");
    else arg.revert();
  };

  /* -------------------------------------------------------------- calendário (desktop) */

  const calendarApi = () => calendarRef.current?.getApi();

  const handleDatesSet = (arg: DatesSetArg) => {
    setCalendarTitle(arg.view.title);
    setVisibleRange({ start: arg.view.currentStart, end: arg.view.currentEnd });
    const view = arg.view.type as CalendarViewId;
    if (DESKTOP_VIEWS.includes(view)) {
      setDesktopView(view);
      writeStored(VIEW_STORAGE_KEY, view);
    }
    // O painel do dia acompanha a navegação: se o dia escolhido saiu do
    // período, volta para hoje (quando visível) ou para o começo do período.
    setSelectedDay((prev) => {
      if (prev >= arg.view.currentStart && prev < arg.view.currentEnd) return prev;
      const today = startOfDayLocal(new Date());
      return today >= arg.view.currentStart && today < arg.view.currentEnd
        ? today
        : startOfDayLocal(arg.view.currentStart);
    });
  };

  const handleDateClick = (arg: DateClickArg) => {
    if (arg.view.type === "dayGridMonth") {
      setSelectedDay(startOfDayLocal(arg.date));
      return;
    }
    openNew(arg.date, { x: arg.jsEvent.clientX, y: arg.jsEvent.clientY }, arg.date);
  };

  const handleEventClick = (arg: { event: { id: string }; jsEvent: MouseEvent }) => {
    const item = itemsById.get(arg.event.id);
    if (item) openDetails(item, { x: arg.jsEvent.clientX, y: arg.jsEvent.clientY });
  };

  const renderEventContent = useCallback(
    (info: EventContentArg) => {
      const item = itemsById.get(info.event.id);
      if (!item) return null;
      const color = getAgendaCategory(item.type)?.color ?? "var(--color-text-secondary)";
      const completed = item.status === "completed";
      const time = item.allDay ? "" : timeLabel(item);
      const strike = completed ? "line-through" : "none";

      if (info.view.type === "dayGridMonth") {
        return (
          <div className="agenda-chip" style={{ background: tint(color, 14), opacity: completed ? 0.55 : 1 }}>
            <span aria-hidden="true" className="agenda-chip-dot" style={{ background: color }} />
            <span className="agenda-chip-title" style={{ textDecoration: strike }}>{item.title}</span>
            {time && <span className="agenda-chip-time">{time}</span>}
          </div>
        );
      }
      if (info.view.type.startsWith("timeGrid")) {
        return (
          <div className="agenda-block" style={{ background: tint(color, 16), borderLeftColor: color, opacity: completed ? 0.55 : 1 }}>
            <span className="agenda-block-title" style={{ textDecoration: strike }}>{item.title}</span>
            {time && <span className="agenda-block-time">{time}</span>}
          </div>
        );
      }
      return <span style={{ textDecoration: strike, opacity: completed ? 0.55 : 1 }}>{item.title}</span>;
    },
    [itemsById],
  );

  const dayCellClassNames = useCallback(
    (arg: DayCellContentArg) => (isSameDay(arg.date, selectedDay) ? ["agenda-day-selected"] : []),
    [selectedDay],
  );

  /* -------------------------------------------------------------- render */

  const google = {
    state: googleState,
    syncing: isSyncingGoogle,
    lastSyncedAt,
    onClick: () => setShowGoogleModal(true),
  };

  const detailsContent = selectedItem && panel.mode === "details" && (
    <EventDetails
      item={selectedItem}
      clientName={selectedItem.clientId ? (clientNames.get(selectedItem.clientId) ?? "Cliente vinculado") : null}
      onClose={closePanel}
      onToggleComplete={() => toggleComplete(selectedItem)}
      onEdit={() => openEdit(selectedItem)}
      onDelete={() => handleDelete(selectedItem)}
      onOpenDemand={() => router.push(`/admin/demandas?d=${selectedItem.demandId}`)}
    />
  );

  const formContent = panel.mode === "form" && (
    <EventFormPanel
      isEditing={panel.itemId !== null}
      saving={saving}
      value={formData}
      onChange={setFormData}
      clients={clients}
      autoFocusTitle={!isMobile}
      onSubmit={handleSaveEvent}
      onCancel={closePanel}
    />
  );

  const overlays = (
    <>
      <GoogleAgendaModal
        open={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        state={googleState}
        syncing={isSyncingGoogle}
        onSync={() => {
          setShowGoogleModal(false);
          pullFromGoogle(false);
        }}
      />
      {isMobile ? (
        <>
          <BottomSheet open={panel.mode === "details" && selectedItem !== null} onClose={closePanel} label="Detalhes do compromisso">
            <div style={{ padding: "0 20px 24px", flex: 1, minHeight: 0, overflowY: "auto" }}>{detailsContent}</div>
          </BottomSheet>
          <BottomSheet
            open={panel.mode === "form"}
            onClose={closePanel}
            onDismissGesture={dismissFormByGesture}
            label={panel.mode === "form" && panel.itemId ? "Editar compromisso" : "Novo compromisso"}
            height="88dvh"
          >
            {formContent}
          </BottomSheet>
        </>
      ) : (
        <FloatingPopover
          open={panel.mode !== "closed" && (panel.mode === "form" || selectedItem !== null)}
          x={panel.mode === "closed" ? 0 : panel.x}
          y={panel.mode === "closed" ? 0 : panel.y}
          onClose={closePanel}
          label={panel.mode === "form" ? "Compromisso" : "Detalhes do compromisso"}
          layoutKey={panel.mode}
        >
          {panel.mode === "details" ? (
            <div style={{ padding: 16, flex: 1, minHeight: 0, overflowY: "auto" }}>{detailsContent}</div>
          ) : (
            formContent
          )}
        </FloatingPopover>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div id="agenda-page-container">
        <MobileAgenda
          items={filteredItems}
          clientNames={clientNames}
          now={now}
          day={selectedDay}
          onDayChange={setSelectedDay}
          view={mobileView}
          onView={(view) => {
            setMobileView(view);
            writeStored(MOBILE_VIEW_STORAGE_KEY, view);
          }}
          activeCategories={activeFilters}
          categoryCounts={categoryCounts}
          onToggleCategory={toggleFilter}
          onResetCategories={resetFilters}
          filtersExtra={
            <>
              {responsibleCombobox}
              {currentUser && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={mineActive}
                  onClick={toggleMine}
                  className="btn btn-secondary"
                  style={{ minHeight: 48, justifyContent: "flex-start" }}
                >
                  <UserCircle2 size={16} /> Só os meus compromissos
                </button>
              )}
            </>
          }
          filtersActiveCount={(isAgendaPrimarySelection(activeFilters) ? 0 : 1) + (responsibleFilter ? 1 : 0)}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          google={google}
          onOpen={openDetails}
          onToggleComplete={toggleComplete}
          onMoveTomorrow={moveToTomorrow}
          onEdit={(item) => {
            openEdit(item);
          }}
          onNew={(day) => openNew(day)}
          onRefresh={() => pullFromGoogle(false)}
        />
        {overlays}
      </div>
    );
  }

  return (
    <div id="agenda-page-container" style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--text-h1)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Agenda
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-ui)", color: "var(--color-text-secondary)" }}>
            Compromissos, reuniões e eventos sincronizados
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GoogleSyncButton {...google} />
          <button
            type="button"
            className="btn btn-accent"
            onClick={(event) => openNew(selectedDay, { x: event.clientX, y: event.clientY })}
          >
            <Plus size={15} /> Novo compromisso
          </button>
        </div>
      </header>

      <div
        className="surface"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}
      >
        <AgendaToolbar
          title={calendarTitle.charAt(0).toUpperCase() + calendarTitle.slice(1)}
          view={desktopView}
          onView={(view) => calendarApi()?.changeView(view)}
          onPrev={() => calendarApi()?.prev()}
          onNext={() => calendarApi()?.next()}
          onToday={() => {
            calendarApi()?.today();
            setSelectedDay(startOfDayLocal(new Date()));
          }}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          responsibleControl={responsibleCombobox}
          mineActive={mineActive}
          onToggleMine={currentUser ? toggleMine : null}
        />

        <CategoryFilterChips
          active={activeFilters}
          counts={categoryCounts}
          onToggle={toggleFilter}
          onReset={resetFilters}
        />

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div className="agenda-calendar" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={desktopView}
              headerToolbar={false}
              locale={ptBrLocale}
              firstDay={1}
              events={calendarEvents}
              editable
              dayMaxEvents
              weekends
              fixedWeekCount={false}
              height="100%"
              nowIndicator
              allDaySlot
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              datesSet={handleDatesSet}
              eventContent={renderEventContent}
              dayCellClassNames={dayCellClassNames}
              dayHeaderFormat={{ weekday: "short", omitCommas: true }}
              views={{ timeGridWeek: { dayHeaderFormat: { weekday: "short", day: "numeric", omitCommas: true } } }}
            />
          </div>

          <AgendaSidePanel
            day={selectedDay}
            now={now}
            items={filteredItems}
            clientNames={clientNames}
            onPrevDay={() => setSelectedDay((day) => addDays(day, -1))}
            onNextDay={() => setSelectedDay((day) => addDays(day, 1))}
            onSelectDay={(day) => {
              const target = startOfDayLocal(day);
              setSelectedDay(target);
              calendarApi()?.gotoDate(target);
            }}
            onOpen={openDetails}
            onToggleComplete={toggleComplete}
            onNewOnDay={(point) => openNew(selectedDay, point)}
          />
        </div>
      </div>

      {overlays}
    </div>
  );
}
