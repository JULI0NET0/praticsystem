"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AppWindow,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CircleCheck,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Folder,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Magnet,
  MessageSquare,
  Moon,
  NotebookPen,
  Palette,
  Pencil,
  Pin,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  Sunrise,
  Target,
  Timer,
  Trash2,
  Trophy,
  Users,
  Video,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { usePresence } from "@/hooks/usePresence";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { usePomodoro, WORK_MS, BREAK_MS } from "@/hooks/usePomodoro";
import { usePoints } from "@/hooks/usePoints";
import { formatDueDateLabel, formatDueTime, toISODate } from "@/lib/dueDate";
import { getAgendaCategory } from "@/lib/agendaCategories";
import { parseQuickInput, type QuickCatalogs } from "@/lib/quickParse";
import styles from "./workspace-painel.module.css";

type Tema = "claro" | "escuro";
type Fundo = "Liso" | "Malha" | "Linhas" | "Grade" | "Imagem";
type Papel = "Grade" | "Malha" | "Liso" | "Imagem";
type Modo = "Painel" | "Área de trabalho";
type Chip = "demanda" | "nota" | "reuniao" | "buscar";

type Prefs = {
  tema: Tema;
  fundo: Fundo;
  papel: Papel;
  modo: Modo;
  veu: number;
  snap: boolean;
  widgets: boolean;
  personalizar: boolean;
};

type DemandRow = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  status_category: string;
  updated_at?: string | null;
  assignee_ids: string[] | null;
  clients: { name: string } | { name: string }[] | null;
  demand_statuses: { label: string } | { label: string }[] | null;
};

type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  type: string | null;
  client_id: string | null;
  assigned_to: string | null;
  visibility: string | null;
  demand_id: string | null;
  demands: { assignee_ids: string[] | null; assign_all_team: boolean | null } | null;
};

type NoteRow = {
  id: string;
  title: string;
  subjects: string[] | null;
  updated_at: string;
};

type WorkspaceLink = { id: string; name: string; url: string; icon: string };

type DayBar = { key: string; label: string; today: boolean; minutes: number; done: number };

type Win = { id: string; x: number; y: number; z: number; w?: number; h?: number };

const PREFS_KEY = "pratic-ws-painel";
const WALL_KEY = "pratic-ws-wallpaper";
const EMOJIS = ["☕", "☀️", "🌙", "🚀", "🔥", "💻", "🎨", "🎯", "✨", "⚡", "📝", "🏆"];
const VEUS = [
  ["Nenhum", 0],
  ["Leve", 45],
  ["Forte", 72],
] as const;
const AVATARS = [
  { bg: "var(--avt-bg)", ink: "var(--avt-ink)" },
  { bg: "var(--avb-bg)", ink: "var(--avb-ink)" },
  { bg: "var(--avo-bg)", ink: "var(--avo-ink)" },
  { bg: "var(--avv-bg)", ink: "var(--avv-ink)" },
];
const STRIPES = ["var(--k1)", "var(--k2)", "var(--k3)", "var(--k4)"];
const FUNDOS: Record<Exclude<Fundo, "Imagem"> | "Liso" | "Malha" | "Linhas" | "Grade", { img: string; size: string }> = {
  Liso: { img: "none", size: "auto" },
  Malha: { img: "radial-gradient(var(--bs) 1px, transparent 1px)", size: "22px 22px" },
  Linhas: { img: "repeating-linear-gradient(var(--bs) 0 1px, transparent 1px 26px)", size: "auto" },
  Grade: { img: "linear-gradient(var(--bs) 1px, transparent 1px), linear-gradient(90deg, var(--bs) 1px, transparent 1px)", size: "28px 28px" },
};
const PAPEIS: Record<Papel, { img: string; size: string }> = {
  Grade: FUNDOS.Grade,
  Malha: FUNDOS.Malha,
  Liso: FUNDOS.Liso,
  Imagem: { img: "none", size: "auto" },
};
const DEFAULT_LINKS: WorkspaceLink[] = [
  { id: "default-drive", name: "Drive da equipe", url: "https://drive.google.com", icon: "folder" },
  { id: "default-brand", name: "Brandbook", url: "#", icon: "palette" },
  { id: "default-metas", name: "Metas do trimestre", url: "#", icon: "target" },
];
const APPS: { id: string; label: string; icon: LucideIcon; href: string; w: number; h: number; kind: string }[] = [
  { id: "demandas", label: "Demandas", icon: ListChecks, href: "/admin/demandas", w: 560, h: 320, kind: "demandas" },
  { id: "agenda", label: "Agenda", icon: CalendarDays, href: "/admin/schedule", w: 380, h: 280, kind: "agenda" },
  { id: "notas", label: "Notas", icon: NotebookPen, href: "/admin/notas", w: 360, h: 300, kind: "notas" },
  { id: "pomodoro", label: "Pomodoro", icon: Timer, href: "/admin/workspace", w: 360, h: 190, kind: "pomodoro" },
  { id: "cronogramas", label: "Cronogramas", icon: CalendarRange, href: "/admin/cronogramas", w: 420, h: 240, kind: "vazio" },
  { id: "clientes", label: "Clientes", icon: Users, href: "/admin/clients", w: 420, h: 240, kind: "vazio" },
  { id: "financeiro", label: "Financeiro", icon: CreditCard, href: "/admin/financeiro", w: 420, h: 240, kind: "vazio" },
  { id: "chat", label: "Chat", icon: MessageSquare, href: "/admin/chat", w: 380, h: 260, kind: "vazio" },
  { id: "lixeira", label: "Lixeira", icon: Trash2, href: "/admin/workspace", w: 360, h: 200, kind: "vazio" },
];
const DOCK = ["demandas", "agenda", "notas", "pomodoro", "chat", "financeiro"];
const LINK_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  palette: Palette,
  target: Target,
  "credit-card": CreditCard,
  file: FileText,
};

const FALLBACK_PREFS: Prefs = {
  tema: "claro",
  fundo: "Malha",
  papel: "Grade",
  modo: "Painel",
  veu: 1,
  snap: true,
  widgets: true,
  personalizar: true,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return FALLBACK_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return FALLBACK_PREFS;
    return { ...FALLBACK_PREFS, ...JSON.parse(raw) };
  } catch {
    return FALLBACK_PREFS;
  }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return letters.toUpperCase() || "?";
}

function avatarOf(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i)) % AVATARS.length;
  return AVATARS[hash];
}

function plural(count: number, oneWord: string, many: string) {
  return `${count} ${count === 1 ? oneWord : many}`;
}

function formatHm(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function spDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function lastSevenDays(): { key: string; label: string; today: boolean }[] {
  const todayKey = spDateKey(new Date());
  const [year, month, day] = todayKey.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, label: key === todayKey ? "hoje" : names[date.getDay()], today: key === todayKey };
  });
}

function relativeNote(iso: string, pinned: boolean) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const hours = Math.round(diff / 3600000);
  const when = hours < 1
    ? "agora"
    : hours < 24
      ? `há ${hours}h`
      : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return pinned ? `fixada · editada ${when}` : when;
}

function prazoTone(tone: string) {
  if (tone === "overdue") return { bg: "var(--da-wash)", ink: "var(--da-ink)" };
  if (tone === "today" || tone === "soon") return { bg: "var(--wa-wash)", ink: "var(--wa-ink)" };
  return { bg: "var(--sk)", ink: "var(--ts)" };
}

function statusTone(category: string) {
  if (category === "fechado") return { bg: "var(--su-wash)", ink: "var(--su-ink)", label: "Concluída" };
  if (category === "ativo") return { bg: "var(--in-wash)", ink: "var(--in-ink)", label: "Em andamento" };
  return { bg: "var(--sk)", ink: "var(--ts)", label: "Não iniciada" };
}

export default function WorkspacePainel() {
  const router = useRouter();
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const { isUserOnline } = usePresence();
  const { isTracking, todayMinutes, currentSession, clockIn, clockOut } = useTimeTracker();
  const pomodoro = usePomodoro();
  const { summary, fetchRanking } = usePoints();
  const captureRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [prefs, setPrefs] = useState<Prefs>(FALLBACK_PREFS);
  const [wallpaper, setWallpaper] = useState("");
  const [ready, setReady] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emoji, setEmoji] = useState("☕");
  const [status, setStatus] = useState("");
  const [editingStatus, setEditingStatus] = useState(false);
  const [capture, setCapture] = useState("");
  const [chip, setChip] = useState<Chip>("demanda");
  const [chartMode, setChartMode] = useState<"horas" | "concluidas">("horas");
  const [demandView, setDemandView] = useState<"lista" | "kanban">("lista");
  const [agendaSpan, setAgendaSpan] = useState<"hoje" | "semana">("hoje");
  const [noteDraft, setNoteDraft] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [links, setLinks] = useState<WorkspaceLink[]>(DEFAULT_LINKS);
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [dueToday, setDueToday] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [dueWeek, setDueWeek] = useState(0);
  const [finishedToday, setFinishedToday] = useState(0);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [days, setDays] = useState<DayBar[]>(() => lastSevenDays().map((day) => ({ ...day, minutes: 0, done: 0 })));
  const [rank, setRank] = useState<number | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [tick, setTick] = useState(0);
  const [windows, setWindows] = useState<Win[]>([
    { id: "demandas", x: 132, y: 34, z: 31 },
    { id: "pomodoro", x: 150, y: 352, z: 32 },
  ]);
  const [selectedApp, setSelectedApp] = useState<string | null>("demandas");
  const [dragging, setDragging] = useState(false);
  const [desktopPanel, setDesktopPanel] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    try {
      setWallpaper(window.localStorage.getItem(WALL_KEY) || "");
    } catch {
      setWallpaper("");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // preferências locais indisponíveis
    }
  }, [prefs, ready]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "n") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      captureRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setEmoji(currentUser.emoji || "☕");
    setStatus(currentUser.workspace_settings?.status || currentUser.status_message || "");
    const saved = currentUser.workspace_settings?.links;
    if (Array.isArray(saved) && saved.length > 0) setLinks(saved);

    const assigneeFilter = `assignee_ids.cs.{${currentUser.id}},assign_all_team.eq.true`;
    const todayISO = toISODate(new Date());
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndISO = toISODate(weekEnd);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);

    let cancelled = false;
    (async () => {
      const [listRes, openRes, todayRes, lateRes, weekRes, doneRes, agendaRes, notesRes, logsRes, doneDaysRes, clientsRes] = await Promise.all([
        supabase
          .from("demands")
          .select("id, title, due_date, due_time, status_category, updated_at, assignee_ids, clients(name), demand_statuses(label)")
          .neq("status_category", "fechado")
          .or(assigneeFilter)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8),
        supabase.from("demands").select("id", { count: "exact", head: true }).neq("status_category", "fechado").or(assigneeFilter),
        supabase.from("demands").select("id", { count: "exact", head: true }).neq("status_category", "fechado").or(assigneeFilter).eq("due_date", todayISO),
        supabase.from("demands").select("id", { count: "exact", head: true }).neq("status_category", "fechado").or(assigneeFilter).lt("due_date", todayISO),
        supabase.from("demands").select("id", { count: "exact", head: true }).neq("status_category", "fechado").or(assigneeFilter).gte("due_date", todayISO).lte("due_date", weekEndISO),
        supabase.from("demands").select("id", { count: "exact", head: true }).or(assigneeFilter).gte("completed_at", startOfToday.toISOString()).lt("completed_at", startOfTomorrow.toISOString()),
        supabase
          .from("agenda_events")
          .select("id, title, date, type, client_id, assigned_to, visibility, demand_id, demands(assignee_ids, assign_all_team)")
          .gte("date", new Date().toISOString())
          .lt("date", new Date(Date.now() + 7 * 86400000).toISOString())
          .order("date", { ascending: true }),
        supabase
          .from("notes")
          .select("id, title, subjects, updated_at")
          .or(`user_id.eq.${currentUser.id},shared_with.cs.{${currentUser.id}},share_all.eq.true`)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("time_logs")
          .select("start_time, end_time, duration_minutes")
          .eq("user_id", currentUser.id)
          .gte("start_time", weekStart.toISOString()),
        supabase
          .from("demands")
          .select("completed_at")
          .or(assigneeFilter)
          .gte("completed_at", weekStart.toISOString()),
        supabase.from("clients").select("id, name").order("name").limit(400),
      ]);
      if (cancelled) return;
      setDemands((listRes.data as DemandRow[] | null) ?? []);
      setOpenCount(openRes.count ?? 0);
      setDueToday(todayRes.count ?? 0);
      setOverdue(lateRes.count ?? 0);
      setDueWeek(weekRes.count ?? 0);
      setFinishedToday(doneRes.count ?? 0);
      const visible = ((agendaRes.data as AgendaEvent[] | null) ?? []).filter((event) => {
        if (event.demand_id && event.demands) {
          if (event.demands.assign_all_team) return true;
          return Array.isArray(event.demands.assignee_ids) && event.demands.assignee_ids.includes(currentUser.id);
        }
        if (event.visibility === "public") return true;
        return event.assigned_to === currentUser.id;
      });
      setEvents(visible);
      const noteRows = (notesRes.data as NoteRow[] | null) ?? [];
      noteRows.sort((a, b) => {
        const aPinned = (a.subjects ?? []).includes("_pinned:true");
        const bPinned = (b.subjects ?? []).includes("_pinned:true");
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      setNotes(noteRows);
      setClients((clientsRes.data as { id: string; name: string }[] | null) ?? []);

      const skeleton = lastSevenDays();
      const minutes = new Map(skeleton.map((day) => [day.key, 0]));
      const done = new Map(skeleton.map((day) => [day.key, 0]));
      for (const log of logsRes.data ?? []) {
        const key = spDateKey(new Date(log.start_time));
        if (!minutes.has(key)) continue;
        const amount = log.duration_minutes
          ? Number(log.duration_minutes)
          : !log.end_time
            ? (Date.now() - new Date(log.start_time).getTime()) / 60000
            : 0;
        minutes.set(key, (minutes.get(key) ?? 0) + amount);
      }
      for (const row of doneDaysRes.data ?? []) {
        if (!row.completed_at) continue;
        const key = spDateKey(new Date(row.completed_at));
        if (!done.has(key)) continue;
        done.set(key, (done.get(key) ?? 0) + 1);
      }
      setDays(skeleton.map((day) => ({ ...day, minutes: minutes.get(day.key) ?? 0, done: done.get(day.key) ?? 0 })));
    })();

    fetchRanking("week").then((rows) => {
      if (cancelled) return;
      setRank(rows.find((row) => row.user_id === currentUser.id)?.rank ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser, fetchRanking]);

  const catalogs = useMemo<QuickCatalogs>(() => ({
    clients: clients.map((client) => ({ id: client.id, label: client.name, alias: client.name })),
    users: users.map((user) => ({ id: user.id, label: user.username || user.name, alias: user.name })),
  }), [clients, users]);

  const parsed = useMemo(() => parseQuickInput(capture, catalogs), [capture, catalogs]);
  const firstName = currentUser?.name?.split(" ")[0] || "você";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace("-feira", "");
  const datePretty = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const meetingsToday = events.filter((event) => spDateKey(new Date(event.date)) === spDateKey(new Date()) && (event.type === "meeting" || event.type === "reuniao")).length;
  const elapsed = currentSession ? Date.now() - new Date(currentSession.start_time).getTime() : 0;
  void tick;
  const leftMs = pomodoro.timeLeftMs();
  const phaseMs = pomodoro.mode === "work" ? WORK_MS : BREAK_MS;
  const progress = Math.min(1, Math.max(0, 1 - leftMs / phaseMs));
  const avgMinutes = days.reduce((sum, day) => sum + day.minutes, 0) / Math.max(1, days.length);
  const todayBar = days.find((day) => day.today);
  const hourDelta = Math.round((todayBar?.minutes ?? todayMinutes) - avgMinutes);
  const maxBar = Math.max(1, ...days.map((day) => (chartMode === "horas" ? day.minutes : day.done)));
  const agendaVisible = events.filter((event) => agendaSpan === "semana" || spDateKey(new Date(event.date)) === spDateKey(new Date()));
  const nextEvent = events[0];
  const team = [...users].sort((a, b) => Number(isUserOnline(b.id)) - Number(isUserOnline(a.id))).slice(0, 6);
  const onlineCount = users.filter((user) => isUserOnline(user.id)).length;

  const suggestions = useMemo(() => {
    const items: { href: string; tag: string; title: string; sub: string; action: string; icon: LucideIcon; bg: string; ink: string }[] = [];
    const late = demands.find((demand) => demand.due_date && demand.due_date < toISODate(new Date()));
    if (late) {
      items.push({
        href: `/admin/demandas?d=${late.id}`,
        tag: "Atrasada",
        title: late.title,
        sub: `${one(late.clients)?.name || "Sem cliente"} · prazo ${formatDueDateLabel(late.due_date).label.toLowerCase()}`,
        action: "Abrir demanda",
        icon: AlertTriangle,
        bg: "var(--da-wash)",
        ink: "var(--da-ink)",
      });
    }
    if (nextEvent) {
      const soon = new Date(nextEvent.date).getTime() - Date.now() < 60 * 60 * 1000;
      items.push({
        href: "/admin/schedule",
        tag: soon ? "Em breve" : "Agenda",
        title: nextEvent.title,
        sub: new Date(nextEvent.date).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
        action: "Abrir agenda",
        icon: Video,
        bg: "var(--wa-wash)",
        ink: "var(--wa-ink)",
      });
    }
    const stalled = demands.find((demand) => {
      if (!demand.updated_at || demand.id === late?.id) return false;
      return Date.now() - new Date(demand.updated_at).getTime() > 3 * 86400000;
    });
    if (stalled) {
      items.push({
        href: `/admin/demandas?d=${stalled.id}`,
        tag: "Parada",
        title: stalled.title,
        sub: "Sem movimentação há mais de 3 dias.",
        action: "Retomar",
        icon: FileText,
        bg: "var(--in-wash)",
        ink: "var(--in-ink)",
      });
    }
    return items.slice(0, 3);
  }, [demands, nextEvent]);

  const patchPrefs = (patch: Partial<Prefs>) => setPrefs((current) => ({ ...current, ...patch }));

  const saveStatus = async () => {
    if (!currentUser) return;
    setEditingStatus(false);
    const { error } = await supabase.from("users").update({
      status_message: status,
      workspace_settings: { ...currentUser.workspace_settings, status },
    }).eq("id", currentUser.id);
    if (!error) showToast("Status atualizado", "success");
  };

  const saveEmoji = async (next: string) => {
    setEmoji(next);
    setEmojiOpen(false);
    if (!currentUser) return;
    const { error } = await supabase.from("users").update({ emoji: next }).eq("id", currentUser.id);
    if (error) showToast("Não foi possível salvar o emoji", "error");
  };

  const submitCapture = () => {
    if (chip === "buscar") {
      window.dispatchEvent(new Event("toggle-search"));
      return;
    }
    if (chip === "nota") {
      router.push("/admin/notas");
      return;
    }
    if (chip === "reuniao") {
      router.push("/admin/schedule");
      return;
    }
    try {
      if (capture.trim()) window.sessionStorage.setItem("pratic-workspace-quickadd", capture.trim());
    } catch {
      // segue sem pré-preencher
    }
    router.push("/admin/demandas?action=new");
  };

  const saveLink = async () => {
    if (!currentUser) return;
    const name = linkName.trim();
    const url = linkUrl.trim();
    if (!name || !url) {
      showToast("Informe nome e URL", "error");
      return;
    }
    const next = [...links, { id: crypto.randomUUID(), name, url, icon: "folder" }];
    const { error } = await supabase.from("users").update({
      workspace_settings: { ...currentUser.workspace_settings, links: next },
    }).eq("id", currentUser.id);
    if (error) {
      showToast("Não foi possível salvar o link", "error");
      return;
    }
    setLinks(next);
    setLinkName("");
    setLinkUrl("");
    setAddingLink(false);
    showToast("Link salvo", "success");
  };

  const onWallpaper = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setWallpaper(value);
      try {
        window.localStorage.setItem(WALL_KEY, value);
      } catch {
        showToast("A imagem é grande demais para ficar salva neste navegador", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const focusWindow = (id: string) => {
    setSelectedApp(id);
    setWindows((current) => {
      const z = current.reduce((max, item) => Math.max(max, item.z), 30) + 1;
      return current.map((item) => (item.id === id ? { ...item, z } : item));
    });
  };

  const openWindow = (id: string) => {
    setWindows((current) => {
      const z = current.reduce((max, item) => Math.max(max, item.z), 30) + 1;
      if (current.some((item) => item.id === id)) {
        return current.map((item) => (item.id === id ? { ...item, z } : item));
      }
      const n = current.length;
      return current.concat([{ id, x: 180 + (n % 4) * 34, y: 60 + (n % 4) * 30, z }]);
    });
    setSelectedApp(id);
  };

  const fundo = FUNDOS[prefs.fundo === "Imagem" ? "Liso" : prefs.fundo];
  const veu = VEUS[prefs.veu] ?? VEUS[1];
  const backgroundImage = prefs.fundo === "Imagem" ? undefined : fundo.img;
  const topWindow = [...windows].sort((a, b) => b.z - a.z)[0];
  const focusedLabel = APPS.find((app) => app.id === topWindow?.id)?.label ?? "Área de trabalho";

  const demandRows = demands.map((demand) => {
    const due = formatDueDateLabel(demand.due_date);
    const time = formatDueTime(demand.due_time);
    const tone = prazoTone(due.tone);
    const status = statusTone(demand.status_category);
    const statusLabel = one(demand.demand_statuses)?.label || status.label;
    const assignee = users.find((user) => demand.assignee_ids?.includes(user.id));
    const name = assignee?.name || currentUser?.name || "?";
    const face = avatarOf(assignee?.id || name);
    return { demand, due, time, tone, status, statusLabel, name, face, client: one(demand.clients)?.name || "Interna" };
  });

  const captureLabel = chip === "nota" ? "Abrir notas" : chip === "reuniao" ? "Abrir agenda" : chip === "buscar" ? "Buscar" : "Criar demanda";

  return (
    <div
      id="workspace-painel"
      className={styles.root}
      data-tema={prefs.tema}
      data-modo={prefs.modo === "Painel" ? "painel" : "desktop"}
    >
      {prefs.modo === "Painel" ? (
        <main
          className={styles.main}
          style={{
            backgroundColor: prefs.fundo === "Imagem" ? "transparent" : "var(--cv)",
            backgroundImage: prefs.fundo === "Imagem" && wallpaper ? `url(${wallpaper})` : backgroundImage,
            backgroundSize: prefs.fundo === "Imagem" && wallpaper ? "cover" : fundo.size,
            backgroundPosition: "center",
          }}
        >
          {prefs.fundo === "Imagem" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: `color-mix(in oklab, var(--cv) ${veu[1]}%, transparent)` }} />
          )}

          <section className={styles.hero}>
            <div className={styles.heroText}>
              <div style={{ position: "relative" }}>
                <button type="button" className={styles.emojiBtn} onClick={() => setEmojiOpen((open) => !open)} aria-label="Trocar emoji">{emoji}</button>
                {emojiOpen && (
                  <div className={styles.emojiPop}>
                    {EMOJIS.map((item) => (
                      <button key={item} type="button" onClick={() => saveEmoji(item)}>{item}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className={styles.kicker}>{datePretty}</div>
                <h1 className={styles.title}>{greeting}, <strong>{firstName}</strong></h1>
                <p className={styles.lead}>
                  Você tem <strong>{plural(dueToday, "demanda", "demandas")}</strong> hoje, <strong style={{ color: "var(--da-ink)" }}>{plural(overdue, "atrasada", "atrasadas")}</strong> e <strong>{plural(meetingsToday, "reunião", "reuniões")}</strong>.
                </p>
              </div>
            </div>
            <div className={styles.heroActions}>
              {editingStatus ? (
                <form className={styles.pill} onSubmit={(event) => { event.preventDefault(); saveStatus(); }}>
                  <span className={styles.dot} />
                  <input value={status} onChange={(event) => setStatus(event.target.value)} onBlur={saveStatus} autoFocus placeholder="O que você está fazendo?" />
                </form>
              ) : (
                <button type="button" className={styles.pill} onClick={() => setEditingStatus(true)}>
                  <span className={styles.dot} />
                  <span>{status || "Definir status"}</span>
                  <Pencil size={13} color="var(--tt)" />
                </button>
              )}
              {isTracking ? (
                <div className={`${styles.pill} ${styles.timer}`}>
                  <span className={styles.live} />
                  <span>{formatClock(elapsed)}</span>
                  <span className={styles.sep} />
                  <button type="button" className={styles.stop} onClick={() => clockOut()}>Parar</button>
                </div>
              ) : (
                <button type="button" className={`${styles.pill} ${styles.timer}`} onClick={() => clockIn()}>
                  <Clock size={14} /> Iniciar registro
                </button>
              )}
              <button type="button" className={styles.btn} onClick={() => patchPrefs({ personalizar: !prefs.personalizar })}>
                <SlidersHorizontal size={15} /> Personalizar
              </button>
            </div>
          </section>

          {prefs.personalizar && (
            <section className={`${styles.card} ${styles.appear}`}>
              <span className={styles.appearLabel}><SlidersHorizontal size={14} /> Aparência</span>
              <span className={styles.field}>
                <span className={styles.fieldName}>Modo</span>
                <span className={styles.seg}>
                  <button type="button" data-on={prefs.modo === "Painel"} onClick={() => patchPrefs({ modo: "Painel" })}><LayoutDashboard size={13} /> Painel</button>
                  <button type="button" data-on={prefs.modo !== "Painel"} onClick={() => patchPrefs({ modo: "Área de trabalho" })}><AppWindow size={13} /> Área de trabalho</button>
                </span>
              </span>
              <span className={styles.field}>
                <span className={styles.fieldName}>Tema</span>
                <span className={styles.seg}>
                  <button type="button" data-on={prefs.tema === "claro"} onClick={() => patchPrefs({ tema: "claro" })}><Sun size={13} /> Claro</button>
                  <button type="button" data-on={prefs.tema === "escuro"} onClick={() => patchPrefs({ tema: "escuro" })}><Moon size={13} /> Escuro</button>
                </span>
              </span>
              <span className={styles.field} style={{ flexWrap: "wrap" }}>
                <span className={styles.fieldName}>Fundo</span>
                {(["Liso", "Malha", "Linhas", "Grade", "Imagem"] as Fundo[]).map((nome) => (
                  <button key={nome} type="button" className={styles.fundoChip} data-on={prefs.fundo === nome} onClick={() => patchPrefs({ fundo: nome })}>
                    <span className={styles.swatch} style={{ backgroundImage: nome === "Imagem" ? undefined : FUNDOS[nome].img, backgroundSize: "7px 7px" }} />
                    {nome}
                  </button>
                ))}
                {prefs.fundo === "Imagem" && (
                  <>
                    <button
                      type="button"
                      className={styles.drop}
                      style={{ backgroundImage: wallpaper ? `url(${wallpaper})` : undefined }}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files?.[0];
                        if (file) onWallpaper(file);
                      }}
                    >
                      {wallpaper ? "" : "Solte a imagem"}
                    </button>
                    <input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onWallpaper(file); }} />
                    <button type="button" className={styles.fundoChip} onClick={() => patchPrefs({ veu: (prefs.veu + 1) % VEUS.length })}>Véu: {veu[0]}</button>
                  </>
                )}
              </span>
              <span className={styles.saveNote}>
                Vale só para você
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => showToast("Aparência salva neste navegador", "success")}>Salvar layout</button>
              </span>
            </section>
          )}

          <section className={`${styles.card} ${styles.capture}`}>
            <form className={styles.captureBar} data-on={capture.trim() ? "true" : "false"} onSubmit={(event) => { event.preventDefault(); submitCapture(); }}>
              <Zap size={16} color="var(--co-700)" />
              <input
                ref={captureRef}
                value={capture}
                onChange={(event) => setCapture(event.target.value)}
                placeholder={chip === "buscar" ? "Buscar em demandas, clientes e notas" : "Criar demanda, nota ou reunião — ou buscar em tudo"}
              />
              <span className={styles.kbds}><kbd>⌘</kbd><kbd>N</kbd></span>
            </form>
            {capture.trim() && chip === "demanda" && (
              <div className={styles.preview}>
                <span className={styles.previewLabel}>Vai criar</span>
                {parsed.tokens.map((token) => {
                  const palette = token.kind === "client"
                    ? { bg: "var(--co-100)", ink: "var(--co-ink)", dot: "var(--co-700)" }
                    : token.kind === "assignee"
                      ? { bg: "var(--in-wash)", ink: "var(--in-ink)", dot: "var(--in)" }
                      : token.kind === "priority"
                        ? { bg: "var(--da-wash)", ink: "var(--da-ink)", dot: "var(--da)" }
                        : { bg: "var(--sk)", ink: "var(--ts)", dot: "var(--bt)" };
                  return (
                    <span key={`${token.kind}-${token.raw}`} className={styles.token} style={{ background: palette.bg, color: palette.ink, border: token.kind === "date" || token.kind === "time" ? "1px solid var(--bs)" : undefined }}>
                      {token.kind === "client" && <i className={styles.tokenDot} style={{ background: palette.dot }} />}
                      {token.label}
                    </span>
                  );
                })}
                <span className={styles.previewActions}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setCapture("")}>Descartar</button>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitCapture}>{captureLabel}</button>
                </span>
              </div>
            )}
            <div className={styles.chips}>
              {([
                ["demanda", "Demanda", ClipboardList],
                ["nota", "Nota", NotebookPen],
                ["reuniao", "Reunião", CalendarPlus],
                ["buscar", "Buscar", Search],
              ] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" className={styles.chip} data-on={chip === id} onClick={() => setChip(id)}>
                  <Icon size={14} /> {label}
                </button>
              ))}
              <span className={styles.hint}>Escreva naturalmente: <code>#cliente @pessoa sexta 14h P1</code></span>
            </div>
          </section>

          <section className={styles.kpis}>
            <Kpi icon={ClipboardList} label="Demandas abertas" value={String(openCount)} note={`${dueWeek} vencem esta semana`} />
            <Kpi icon={CircleCheck} label="Concluídas hoje" value={String(finishedToday)} note="registradas hoje" />
            <Kpi icon={Clock} label="Horas hoje" value={formatHm(todayMinutes)} note={`média de ${formatHm(avgMinutes)} nos últimos 7 dias`} delta={hourDelta === 0 ? undefined : `${hourDelta > 0 ? "+" : "−"}${formatHm(Math.abs(hourDelta))}`} positive={hourDelta >= 0} />
            <Kpi icon={Trophy} label="Pontos na semana" value={String(summary.week)} unit="pts" note={rank ? `${rank}º no ranking da semana` : "semana em andamento"} delta={rank ? `${rank}º` : undefined} positive />
          </section>

          {suggestions.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Sugerido para você</span>
                <Link href="/admin/demandas" className={styles.link}>Ver todas</Link>
              </div>
              <div className={styles.suggestGrid}>
                {suggestions.map((item) => (
                  <Link key={item.title} href={item.href} className={`${styles.card} ${styles.suggest}`}>
                    <span className={styles.iconSq} style={{ background: item.bg, color: item.ink }}><item.icon size={15} /></span>
                    <span className={styles.suggestBody}>
                      <span className={styles.tag} style={{ color: item.ink }}>{item.tag}</span>
                      <span className={styles.suggestTitle}>{item.title}</span>
                      <span className={styles.sub}>{item.sub}</span>
                      <span className={styles.action}>{item.action} →</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className={styles.split}>
            <div className={`${styles.card} ${styles.grow}`}>
              <div className={styles.cardHead}>
                <BarChart3 size={15} /> Produtividade
                <span className={styles.muted}>últimos 7 dias</span>
                <span className={styles.miniSeg}>
                  <button type="button" data-on={chartMode === "horas"} onClick={() => setChartMode("horas")}>Horas</button>
                  <button type="button" data-on={chartMode === "concluidas"} onClick={() => setChartMode("concluidas")}>Concluídas</button>
                </span>
              </div>
              <div className={styles.chart}>
                <div className={styles.bars}>
                  {days.map((day) => {
                    const value = chartMode === "horas" ? day.minutes : day.done;
                    const height = value <= 0 ? 2 : Math.max(8, Math.round((value / maxBar) * 100));
                    return (
                      <div key={day.key} className={styles.barCol}>
                        <span className={styles.barVal} style={day.today ? { color: "var(--co-ink)", fontWeight: 700 } : undefined}>
                          {chartMode === "horas" ? formatHm(day.minutes).replace(/^0/, "") : day.done}
                        </span>
                        <div className={`${styles.bar} ${day.today ? styles.barToday : ""}`} style={{ height: `${height}%` }} />
                        <span className={day.today ? styles.barLabelToday : styles.barLabel}>{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={`${styles.card} ${styles.side}`}>
              <div className={styles.cardHead}>
                <Sunrise size={15} /> Hoje
                <span className={`${styles.muted}`} style={{ marginLeft: "auto" }}>{new Date().toLocaleDateString("pt-BR")}</span>
              </div>
              <div className={styles.todayBig}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className={styles.hours}>{formatHm(todayMinutes)}</span>
                  <span className={styles.kpiUnit}>trabalhadas</span>
                </div>
                <div>
                  <Stat label="Concluídas" value={String(finishedToday)} />
                  <Stat label="Atrasadas" value={String(overdue)} color="var(--da-ink)" />
                  <Stat label="Reuniões" value={String(meetingsToday)} />
                  <Stat label="Pontos" value={`+${summary.today}`} color="var(--su-ink)" />
                </div>
              </div>
            </div>
          </section>

          <section className={styles.split}>
            <div className={`${styles.card} ${styles.grow}`}>
              <div className={styles.cardHead}>
                <ListChecks size={15} /> Minhas demandas
                <span className={styles.muted}>{openCount}</span>
                <span className={styles.miniSeg}>
                  <button type="button" data-on={demandView === "lista"} onClick={() => setDemandView("lista")}>Lista</button>
                  <button type="button" data-on={demandView === "kanban"} onClick={() => setDemandView("kanban")}>Kanban</button>
                </span>
              </div>
              {demandRows.length === 0 ? <div className={styles.empty}>Nenhuma demanda aberta com você.</div> : demandView === "lista" ? (
                demandRows.map(({ demand, due, time, tone, status, statusLabel, name, face, client }) => (
                  <Link key={demand.id} href={`/admin/demandas?d=${demand.id}`} className={styles.demandRow}>
                    <span className={styles.check} />
                    <span className={styles.demandTitle}>{demand.title}</span>
                    <span className={styles.client}>{client}</span>
                    <span className={styles.badge} style={{ background: tone.bg, color: tone.ink }}>{due.label.toLowerCase()}{time ? `, ${time}` : ""}</span>
                    <span className={styles.badge} style={{ background: status.bg, color: status.ink }}><i />{statusLabel}</span>
                    <span className={styles.avatar} style={{ background: face.bg, color: face.ink }}>{initials(name)}</span>
                  </Link>
                ))
              ) : (
                <div className={styles.kanban}>
                  {["nao_iniciado", "ativo"].map((category) => (
                    <div key={category} className={styles.col}>
                      <h4>{statusTone(category).label}</h4>
                      {demandRows.filter((row) => row.demand.status_category === category).map((row) => (
                        <Link key={row.demand.id} href={`/admin/demandas?d=${row.demand.id}`}>{row.demand.title}</Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.cardFoot}>
                <Link href="/admin/demandas" className={styles.link}>Ver todas as demandas</Link>
              </div>
            </div>
            <div className={`${styles.card} ${styles.side}`}>
              <div className={styles.cardHead}>
                <CalendarDays size={15} /> Agenda
                <span className={styles.miniSeg}>
                  <button type="button" data-on={agendaSpan === "hoje"} onClick={() => setAgendaSpan("hoje")}>Hoje</button>
                  <button type="button" data-on={agendaSpan === "semana"} onClick={() => setAgendaSpan("semana")}>7 dias</button>
                </span>
              </div>
              {agendaVisible.length === 0 ? <div className={styles.empty}>Nada na agenda neste período.</div> : agendaVisible.slice(0, 6).map((event, index) => {
                const date = new Date(event.date);
                const soon = date.getTime() - Date.now() < 45 * 60 * 1000;
                const category = getAgendaCategory(event.type);
                return (
                  <Link key={event.id} href="/admin/schedule" className={styles.agendaRow}>
                    <span className={styles.stripe} style={{ background: STRIPES[index % STRIPES.length] }} />
                    <span className={styles.hora}>{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className={styles.suggestTitle}>{event.title}</span>
                      <span className={styles.personStatus}>{category?.label || "Compromisso"}</span>
                    </span>
                    {soon && <span className={styles.badge} style={{ background: "var(--wa-wash)", color: "var(--wa-ink)" }}>em breve</span>}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className={styles.trio}>
            <div className={`${styles.card} ${styles.side}`}>
              <div className={styles.cardHead}>
                <Users size={15} /> Equipe
                <span className={styles.muted}>{onlineCount} online</span>
              </div>
              {team.length === 0 ? <div className={styles.empty}>Ninguém da equipe por aqui.</div> : team.map((person) => {
                const online = isUserOnline(person.id);
                const face = avatarOf(person.id);
                return (
                  <Link key={person.id} href="/admin/chat" className={styles.person}>
                    <span className={styles.avaWrap}>
                      <span className={styles.avatar} style={{ background: face.bg, color: face.ink }}>{initials(person.name || person.username || "?")}</span>
                      <span className={styles.presence} style={{ background: online ? "var(--su)" : "var(--bd)" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className={styles.personName}>{person.name}</span>
                      <span className={styles.personStatus}>{person.status_message || (online ? "Online" : "Offline")}</span>
                    </span>
                    <MessageSquare size={15} color="var(--tt)" />
                  </Link>
                );
              })}
            </div>
            <div className={`${styles.card} ${styles.side}`}>
              <div className={styles.cardHead}>
                <NotebookPen size={15} /> Notas
                <Link href="/admin/notas" className={styles.link}>Nova</Link>
              </div>
              <div className={styles.notesBody}>
                <form className={styles.quick} onSubmit={(event) => { event.preventDefault(); router.push("/admin/notas"); }}>
                  <Plus size={14} />
                  <input value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Anotar rápido…" />
                </form>
                {notes.length === 0 ? <div className={styles.empty}>Nenhuma nota recente.</div> : notes.slice(0, 3).map((note) => {
                  const pinned = (note.subjects ?? []).includes("_pinned:true");
                  return (
                    <Link key={note.id} href={`/admin/notas/${note.id}`} className={styles.noteRow}>
                      {pinned ? <Pin size={14} color="var(--co-700)" /> : <FileText size={14} color="var(--tt)" />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className={styles.noteTitle}>{note.title || "Sem título"}</span>
                        <span className={styles.personStatus}>{relativeNote(note.updated_at, pinned)}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className={`${styles.card} ${styles.side}`}>
              <div className={styles.cardHead}>
                <Timer size={15} /> Pomodoro
                <span className={`${styles.muted}`} style={{ marginLeft: "auto" }}>{pomodoro.sessionsToday} {pomodoro.sessionsToday === 1 ? "ciclo" : "ciclos"} hoje</span>
              </div>
              <PomodoroBlock leftMs={leftMs} progress={progress} mode={pomodoro.mode} running={pomodoro.isRunning} onStart={pomodoro.start} onPause={pomodoro.pause} onSkip={pomodoro.skip} />
            </div>
          </section>

          <section className={`${styles.card} ${styles.links}`}>
            <span className={styles.sectionLabel}>Links úteis</span>
            {links.map((link) => {
              const Icon = LINK_ICONS[link.icon] || Folder;
              return (
                <a key={link.id} className={styles.linkChip} href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <Icon size={14} color="var(--tt)" /> {link.name}
                </a>
              );
            })}
            <button type="button" className={styles.addLink} onClick={() => setAddingLink((open) => !open)}><Plus size={14} /> Adicionar</button>
            {addingLink && (
              <form className={styles.linkForm} onSubmit={(event) => { event.preventDefault(); saveLink(); }}>
                <input value={linkName} onChange={(event) => setLinkName(event.target.value)} placeholder="Nome" />
                <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" />
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Salvar</button>
              </form>
            )}
          </section>
        </main>
      ) : (
        <div className={styles.desktop}>
          <div className={styles.menuBar}>
            <span className={styles.brand}>pratic.</span>
            <button type="button" className={styles.btn} style={{ height: 26, fontSize: 12, padding: "0 10px" }} onClick={() => patchPrefs({ modo: "Painel" })}>
              <LayoutDashboard size={14} /> Workspace
            </button>
            <strong>{focusedLabel}</strong>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 }}>
              {isTracking && <span className={styles.clockPill}><span className={styles.live} />{formatClock(elapsed)}</span>}
              <button type="button" className={styles.iconBtn} data-on={prefs.snap} title="Alinhar à grade" onClick={() => patchPrefs({ snap: !prefs.snap })}><Magnet size={14} /></button>
              <button type="button" className={styles.iconBtn} title="Organizar janelas" onClick={() => organizeWindows(stageRef.current, windows, prefs.widgets, setWindows)}><LayoutGrid size={14} /></button>
              <button type="button" className={styles.iconBtn} title="Personalizar" onClick={() => setDesktopPanel((open) => !open)}><SlidersHorizontal size={14} /></button>
              <span style={{ fontWeight: 600, color: "var(--tp)", fontVariantNumeric: "tabular-nums" }}>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </span>
          </div>
          <div
            ref={stageRef}
            className={styles.stage}
            style={{
              backgroundColor: "var(--cv)",
              backgroundImage: prefs.papel === "Imagem" && wallpaper ? `url(${wallpaper})` : PAPEIS[prefs.papel].img,
              backgroundSize: prefs.papel === "Imagem" && wallpaper ? "cover" : PAPEIS[prefs.papel].size,
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag) return;
              let x = Math.max(0, event.clientX - drag.dx);
              let y = Math.max(0, event.clientY - drag.dy);
              if (prefs.snap) {
                x = Math.round(x / 24) * 24;
                y = Math.round(y / 24) * 24;
              }
              setWindows((current) => current.map((item) => (item.id === drag.id ? { ...item, x, y } : item)));
            }}
            onPointerUp={() => { dragRef.current = null; setDragging(false); }}
          >
            {prefs.snap && dragging && (
              <div style={{ position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none", backgroundImage: "linear-gradient(color-mix(in oklab, var(--co) 30%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--co) 30%, transparent) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            )}
            <div className={styles.icons}>
              {APPS.map((app) => (
                <button key={app.id} type="button" className={styles.appIcon} onClick={() => openWindow(app.id)}>
                  <span className={styles.appGlyph} style={{ color: selectedApp === app.id ? "var(--co-700)" : "var(--ts)" }}><app.icon size={21} /></span>
                  <span>{app.label}</span>
                </button>
              ))}
            </div>
            {prefs.widgets && !desktopPanel && (
              <div className={styles.widgets}>
                <div className={styles.widget}>
                  <div className={styles.widgetClock}>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className={styles.sub}>{datePretty}</div>
                  <div className={styles.sub} style={{ marginTop: 8 }}><strong style={{ color: "var(--tp)" }}>{formatHm(todayMinutes)}</strong> trabalhadas hoje</div>
                </div>
                {nextEvent && (
                  <div className={styles.widget} style={{ padding: 0, overflow: "hidden" }}>
                    <div className={styles.cardHead}><Sunrise size={13} /> Próximo</div>
                    <div style={{ padding: "12px 14px" }}>
                      <div className={styles.tag} style={{ color: "var(--wa-ink)" }}>{new Date(nextEvent.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className={styles.suggestTitle}>{nextEvent.title}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {windows.map((win) => {
              const app = APPS.find((item) => item.id === win.id);
              if (!app) return null;
              const active = topWindow?.id === win.id;
              return (
                <div key={win.id} className={styles.window} onPointerDown={() => focusWindow(win.id)} style={{ left: win.x, top: win.y, width: win.w || app.w, height: win.h || app.h, zIndex: win.z, borderColor: active ? "var(--bd)" : "var(--bs)" }}>
                  <div
                    className={styles.windowHead}
                    style={{ background: active ? "var(--rs)" : "var(--sk)" }}
                    onPointerDown={(event) => {
                      if ((event.target as HTMLElement).closest("button")) return;
                      const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      const stage = stageRef.current?.getBoundingClientRect();
                      dragRef.current = { id: win.id, dx: event.clientX - (stage ? rect.left - stage.left : win.x), dy: event.clientY - (stage ? rect.top - stage.top : win.y) };
                      setDragging(prefs.snap);
                      focusWindow(win.id);
                    }}
                  >
                    <app.icon size={14} color="var(--tt)" />
                    <span>{app.label}</span>
                    <span style={{ marginLeft: "auto" }}>
                      <button type="button" className={styles.iconBtn} onClick={(event) => { event.stopPropagation(); setWindows((current) => current.filter((item) => item.id !== win.id)); }}><X size={14} /></button>
                    </span>
                  </div>
                  <div className={styles.windowBody}>
                    {app.kind === "demandas" && demandRows.map(({ demand, client, tone, due, time, name, face }) => (
                      <Link key={demand.id} href={`/admin/demandas?d=${demand.id}`} className={styles.demandRow}>
                        <span className={styles.check} />
                        <span className={styles.demandTitle}>{demand.title}</span>
                        <span className={styles.client}>{client}</span>
                        <span className={styles.badge} style={{ background: tone.bg, color: tone.ink }}>{due.label.toLowerCase()}{time ? `, ${time}` : ""}</span>
                        <span className={styles.avatar} style={{ background: face.bg, color: face.ink }}>{initials(name)}</span>
                      </Link>
                    ))}
                    {app.kind === "agenda" && events.slice(0, 6).map((event, index) => (
                      <Link key={event.id} href="/admin/schedule" className={styles.agendaRow}>
                        <span className={styles.stripe} style={{ background: STRIPES[index % STRIPES.length] }} />
                        <span className={styles.hora}>{new Date(event.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className={styles.suggestTitle}>{event.title}</span>
                      </Link>
                    ))}
                    {app.kind === "notas" && notes.slice(0, 4).map((note) => (
                      <Link key={note.id} href={`/admin/notas/${note.id}`} className={styles.noteRow} style={{ margin: 8 }}>
                        <FileText size={14} color="var(--tt)" />
                        <span className={styles.noteTitle}>{note.title || "Sem título"}</span>
                      </Link>
                    ))}
                    {app.kind === "pomodoro" && <PomodoroBlock leftMs={leftMs} progress={progress} mode={pomodoro.mode} running={pomodoro.isRunning} onStart={pomodoro.start} onPause={pomodoro.pause} onSkip={pomodoro.skip} />}
                    {app.kind === "vazio" && (
                      <div className={styles.empty} style={{ textAlign: "center" }}>
                        <app.icon size={22} color="var(--bt)" />
                        <div className={styles.suggestTitle}>{app.label}</div>
                        <Link href={app.href} className={styles.link}>Abrir módulo</Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {desktopPanel && (
              <div className={styles.panel}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span className={styles.sectionLabel}>Personalizar</span>
                  <button type="button" className={styles.iconBtn} style={{ marginLeft: "auto" }} onClick={() => setDesktopPanel(false)}><X size={13} /></button>
                </div>
                <div>
                  <div className={styles.fieldName} style={{ marginBottom: 8 }}>Papel de parede</div>
                  <div className={styles.paperGrid}>
                    {(["Grade", "Malha", "Liso", "Imagem"] as Papel[]).map((nome) => (
                      <button key={nome} type="button" className={styles.paper} data-on={prefs.papel === nome} onClick={() => patchPrefs({ papel: nome })}>
                        <span className={styles.paperPreview} style={{ backgroundImage: nome === "Imagem" ? undefined : PAPEIS[nome].img, backgroundSize: "7px 7px" }} />
                        {nome}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldName}>Tema</span>
                  <span className={styles.seg} style={{ marginLeft: "auto" }}>
                    <button type="button" data-on={prefs.tema === "claro"} onClick={() => patchPrefs({ tema: "claro" })}><Sun size={13} /> Claro</button>
                    <button type="button" data-on={prefs.tema === "escuro"} onClick={() => patchPrefs({ tema: "escuro" })}><Moon size={13} /> Escuro</button>
                  </span>
                </div>
                <button type="button" className={styles.fundoChip} onClick={() => patchPrefs({ modo: "Painel" })}><LayoutDashboard size={14} /> Voltar ao painel</button>
                {prefs.papel === "Imagem" && (
                  <button type="button" className={styles.drop} style={{ backgroundImage: wallpaper ? `url(${wallpaper})` : undefined }} onClick={() => fileRef.current?.click()}>Escolher imagem</button>
                )}
              </div>
            )}
            <div className={styles.dock}>
              {DOCK.map((id) => {
                const app = APPS.find((item) => item.id === id)!;
                const open = windows.some((win) => win.id === id);
                return (
                  <button key={id} type="button" data-on={open} title={app.label} onClick={() => openWindow(id)}>
                    <span className={styles.dockGlyph}><app.icon size={19} /></span>
                    <span className={styles.dockDot} />
                  </button>
                );
              })}
              <span className={styles.sep} style={{ height: 32, margin: "0 3px" }} />
              <button type="button" title="Voltar ao painel" onClick={() => patchPrefs({ modo: "Painel" })}>
                <span className={styles.dockGlyph}><LayoutDashboard size={19} /></span>
                <span className={styles.dockDot} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, unit, note, delta, positive }: { icon: LucideIcon; label: string; value: string; unit?: string; note: string; delta?: string; positive?: boolean }) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiHead}>
        <span className={styles.iconSq}><Icon size={15} /></span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiValue}>
        <span className={styles.kpiNum}>{value}</span>
        {unit && <span className={styles.kpiUnit}>{unit}</span>}
        {delta && <span className={styles.delta} style={{ color: positive ? "var(--su-ink)" : "var(--tt)" }}>{delta}</span>}
      </div>
      <span className={styles.kpiNote}>{note}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={styles.statRow}>
      <span>{label}</span>
      <strong style={{ color: color || "var(--tp)" }}>{value}</strong>
    </div>
  );
}

function PomodoroBlock({ leftMs, progress, mode, running, onStart, onPause, onSkip }: { leftMs: number; progress: number; mode: "work" | "break"; running: boolean; onStart: () => void; onPause: () => void; onSkip: () => void }) {
  return (
    <div className={styles.pomo}>
      <span className={styles.ring} style={{ background: `conic-gradient(var(--co) 0turn ${progress}turn, var(--is) ${progress}turn 1turn)` }}>
        <span className={styles.ringInner}>
          <span className={styles.ringTime}>{formatClock(leftMs)}</span>
          <span className={styles.kpiNote}>{mode === "work" ? "foco" : "pausa"}</span>
        </span>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className={styles.sub}>{mode === "work" ? "Foco de 25 min." : "Pausa de 5 min."}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={styles.btn} style={{ height: 28, fontSize: 12 }} onClick={running ? onPause : onStart}>{running ? "Pausar" : "Iniciar"}</button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onSkip}>Pular</button>
        </div>
      </div>
    </div>
  );
}

function organizeWindows(stage: HTMLDivElement | null, windows: Win[], widgets: boolean, setWindows: (value: Win[]) => void) {
  if (!stage || windows.length === 0) return;
  const gap = 12;
  const left = 24 * 9;
  const top = 24;
  const right = widgets ? 260 : 24;
  const bottom = 84;
  const cols = windows.length <= 3 ? windows.length : windows.length === 4 ? 2 : 3;
  const rows = Math.ceil(windows.length / cols);
  const width = Math.floor((stage.clientWidth - left - right - gap * (cols - 1)) / cols);
  const height = Math.floor((stage.clientHeight - top - bottom - gap * (rows - 1)) / rows);
  setWindows(windows.map((win, index) => ({
    ...win,
    x: left + (index % cols) * (width + gap),
    y: top + Math.floor(index / cols) * (height + gap),
    w: Math.max(240, width),
    h: Math.max(160, height),
  })));
}
