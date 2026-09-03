"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useToast } from "@/components/CustomToast";
import type { IgAutomation, IgConfig } from "@/lib/instagram";
import AutomationEditorModal from "./automation-editor/AutomationEditorModal";
import type { AutomationFormValues } from "./automation-editor/types";
import {
  Home,
  Users,
  Workflow,
  Sparkles,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronRight,
  Zap,
  Smartphone,
  LogOut,
  Check,
  ChevronLeft,
  Clock,
  X,
  Menu,
  Sun,
  Moon,
  FolderOpen,
} from "lucide-react";

interface LogRow {
  id: string;
  level: "info" | "error";
  event: string;
  payload: unknown;
  created_at: string;
}

interface QueueItem {
  id: string;
  automation_id: string | null;
  igsid: string;
  comment_id?: string | null;
  message_text: string;
  button_text?: string | null;
  button_url?: string | null;
  status: "pending" | "sending" | "sent" | "failed";
  attempts?: number;
  error?: string | null;
  created_at: string;
  sent_at?: string | null;
}

interface ContactItem {
  id: string;
  igsid: string;
  username?: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

interface ClickItem {
  id: string;
  queue_id: string;
  automation_id: string | null;
  created_at: string;
}

interface Props {
  initialConfig: IgConfig | null;
  initialAutomations: IgAutomation[];
  initialLogs: LogRow[];
  initialQueue?: QueueItem[];
  initialContacts?: ContactItem[];
  initialClicks?: ClickItem[];
  queueStats: { pending: number; failed: number; sent?: number };
}

type TabType = "home" | "contacts" | "automations" | "ai" | "inbox" | "results" | "settings";

const emptyForm: AutomationFormValues = {
  name: "",
  keywords: "",
  match_mode: "contains",
  post_id: "",
  comment_reply_texts: [],
  dm_message_text: "",
  dm_button_text: "",
  dm_button_url: "",
  cta_type: "button",
  require_follow: false,
  follow_gate_message: "",
  follow_gate_button_text: "",
  is_active: true,
  linked_material_id: null,
};

const TEMPLATES = [
  {
    id: "comments_dm",
    title: "Enviar links automaticamente por DM a partir dos comentários",
    badge: "POPULAR",
    badgeType: "popular",
    icon: <MessageSquare className="w-4 h-4 text-[var(--color-terracotta)]" />,
    description: "Envie um direct com botão e link rastreável no exato segundo em que alguém comentar no seu post ou reel.",
    defaultForm: {
      name: "Envio de Link via Comentários (Reels/Posts)",
      keywords: "link, quero, eu quero, me manda, valor, preco",
      match_mode: "contains" as const,
      post_id: "",
      comment_reply_texts: ["Te enviei o link no direct! Dá uma olhada 📩✨"],
      dm_message_text: "Olá! Vi que você comentou no nosso post. Aqui está o link exclusivo que você pediu:",
      dm_button_text: "👉 Acessar Link Agora",
      dm_button_url: "https://",
      cta_type: "button" as const,
      require_follow: false,
      follow_gate_message: "",
      follow_gate_button_text: "",
      is_active: true,
      linked_material_id: null,
    },
  },
  {
    id: "stories_leads",
    title: "Gere leads com stories e materiais gratuitos",
    badge: "NOVO",
    badgeType: "new",
    icon: <Zap className="w-4 h-4 text-blue-400" />,
    description: "Converta visualizações dos Stories em contatos qualificados entregando cupons, ebooks ou materiais por direct.",
    defaultForm: {
      name: "Captura de Leads via Stories",
      keywords: "material, cupom, vip, desconto, ebook, aula",
      match_mode: "contains" as const,
      post_id: "",
      comment_reply_texts: ["Prontinho! Dá uma olhada na sua caixa de direct 🚀"],
      dm_message_text: "Oi! Aqui está o material especial dos stories que você pediu:",
      dm_button_text: "🎁 Resgatar Material",
      dm_button_url: "https://",
      cta_type: "button" as const,
      require_follow: false,
      follow_gate_message: "",
      follow_gate_button_text: "",
      is_active: true,
      linked_material_id: null,
    },
  },
  {
    id: "all_dms",
    title: "Responda todas as suas DMs instantaneamente",
    badge: "ESSENCIAL",
    badgeType: "essential",
    icon: <Sparkles className="w-4 h-4 text-[var(--color-success)]" />,
    description: "Atendimento automático 24h: responda dúvidas frequentes ou envie o link do WhatsApp para fechar negócios.",
    defaultForm: {
      name: "Atendimento Automático & Boas-Vindas",
      keywords: "oi, ola, orcamento, contato, preco, whatsapp, ajuda",
      match_mode: "contains" as const,
      post_id: "",
      comment_reply_texts: [],
      dm_message_text: "Olá! Obrigado pelo contato. Para falar diretamente com nossa equipe no WhatsApp, toque no botão abaixo:",
      dm_button_text: "💬 Falar no WhatsApp",
      dm_button_url: "https://wa.me/55",
      cta_type: "button" as const,
      require_follow: false,
      follow_gate_message: "",
      follow_gate_button_text: "",
      is_active: true,
      linked_material_id: null,
    },
  },
];

export default function AutomationsClient({
  initialConfig,
  initialAutomations,
  initialLogs,
  initialQueue = [],
  initialContacts = [],
  initialClicks = [],
  queueStats,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [config] = useState(initialConfig);
  const [automations, setAutomations] = useState(initialAutomations);
  const [logs] = useState(initialLogs);
  const [queue] = useState(initialQueue);
  const [contacts] = useState(initialContacts);
  const [clicks] = useState(initialClicks);
  const [stats] = useState(queueStats);

  // Form & Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [drainingQueue, setDrainingQueue] = useState(false);

  // Search & Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  // Simulator Modal
  const [showSimulator, setShowSimulator] = useState(false);
  const [simComment, setSimComment] = useState("");
  const [simResult, setSimResult] = useState<IgAutomation | null | undefined>(undefined);

  const [now] = useState(() => Date.now());
  const tokenExpiresInDays = config
    ? Math.max(0, Math.ceil((new Date(config.token_expires_at).getTime() - now) / 86400000))
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("ig_connected")) {
      showToast("Instagram conectado com sucesso!", "success");
      router.replace("/automacao-instagram");
    }
    const err = searchParams.get("ig_error");
    if (err) {
      showToast(`Erro ao conectar: ${decodeURIComponent(err)}`, "error");
      router.replace("/automacao-instagram");
    }
  }, [searchParams, router, showToast]);

  // Overall analytics
  const totalComments = queue.length;
  const totalSent = stats.sent ?? queue.filter((q) => q.status === "sent").length;
  const totalClicks = clicks.length;
  const overallConversionRate = totalComments > 0 ? Math.round((totalClicks / totalComments) * 100) : 0;

  const topAutomation = useMemo(() => {
    if (automations.length === 0) return null;
    const clicksByAutomation = new Map<string, number>();
    for (const click of clicks) {
      if (!click.automation_id) continue;
      clicksByAutomation.set(click.automation_id, (clicksByAutomation.get(click.automation_id) || 0) + 1);
    }
    let best: { name: string; clicks: number } | null = null;
    for (const automation of automations) {
      const count = clicksByAutomation.get(automation.id) || 0;
      if (count > 0 && (!best || count > best.clicks)) {
        best = { name: automation.name, clicks: count };
      }
    }
    return best;
  }, [automations, clicks]);

  // Onboarding Actions List (PraticChat Checklist)
  const checklistItems = useMemo(() => {
    const hasConnection = !!config;
    const hasCommentAuto = automations.length > 0;
    const hasButtonUrl = automations.some((a) => !!a.dm_button_url);

    return [
      {
        id: "step1",
        title: "Conectar conta do Instagram (@juli0net0)",
        completed: hasConnection,
        onClick: () => {
          if (!hasConnection) window.location.href = "/api/instagram/oauth/start";
          else setActiveTab("settings");
        },
      },
      {
        id: "step2",
        title: "Criar automação de comentários (DM automática)",
        completed: hasCommentAuto,
        onClick: () => {
          if (hasCommentAuto) setActiveTab("automations");
          else openCreateForm(TEMPLATES[0].defaultForm);
        },
      },
      {
        id: "step3",
        title: "Aumente seus seguidores com respostas em stories",
        completed: automations.some((a) =>
          (a.keywords || []).some((k) => ["cupom", "material", "ebook", "vip"].includes(k.toLowerCase()))
        ),
        onClick: () => openCreateForm(TEMPLATES[1].defaultForm),
      },
      {
        id: "step4",
        title: "Configurar Resposta Padrão & Botão de Destino",
        completed: hasButtonUrl,
        onClick: () => {
          if (automations.length > 0) openEditForm(automations[0]);
          else openCreateForm(TEMPLATES[2].defaultForm);
        },
      },
    ];
  }, [config, automations]);

  const completedCount = checklistItems.filter((i) => i.completed).length;

  function openCreateForm(templateData?: Partial<typeof emptyForm>) {
    setForm(templateData ? { ...emptyForm, ...templateData } : emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(automation: IgAutomation) {
    setForm({
      name: automation.name,
      keywords: (automation.keywords || []).join(", "),
      match_mode: automation.match_mode,
      post_id: automation.post_id || "",
      comment_reply_texts: automation.comment_reply_texts?.length
        ? automation.comment_reply_texts
        : automation.comment_reply_text
        ? [automation.comment_reply_text]
        : [],
      dm_message_text: automation.dm_message_text,
      dm_button_text: automation.dm_button_text || "",
      dm_button_url: automation.dm_button_url || "",
      cta_type: automation.cta_type || "button",
      require_follow: automation.require_follow ?? false,
      follow_gate_message: automation.follow_gate_message || "",
      follow_gate_button_text: automation.follow_gate_button_text || "",
      is_active: automation.is_active,
      linked_material_id: automation.linked_material_id ?? null,
    });
    setEditingId(automation.id);
    setShowForm(true);
  }

  async function handleSave() {
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (!form.name || keywords.length === 0 || !form.dm_message_text) {
      showToast("Preencha o nome, ao menos uma palavra-chave e a mensagem da DM.", "error");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      keywords,
      match_mode: form.match_mode,
      post_id: form.post_id || null,
      comment_reply_texts: form.comment_reply_texts,
      dm_message_text: form.dm_message_text,
      dm_button_text: form.dm_button_text || null,
      dm_button_url: form.dm_button_url || null,
      cta_type: form.cta_type,
      require_follow: form.require_follow,
      follow_gate_message: form.require_follow ? (form.follow_gate_message || null) : null,
      follow_gate_button_text: form.require_follow ? (form.follow_gate_button_text || null) : null,
      is_active: form.is_active,
      linked_material_id: form.linked_material_id,
    };

    try {
      const res = await fetch(
        editingId ? `/api/instagram/automations/${editingId}` : "/api/instagram/automations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");

      if (editingId) {
        setAutomations((prev) => prev.map((a) => (a.id === editingId ? data.automation : a)));
        showToast("Automação atualizada!", "success");
      } else {
        setAutomations((prev) => [data.automation, ...prev]);
        showToast("Automação criada com sucesso!", "success");
      }
      setShowForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(automation: IgAutomation) {
    const nextState = !automation.is_active;
    setAutomations((prev) =>
      prev.map((a) => (a.id === automation.id ? { ...a, is_active: nextState } : a))
    );

    try {
      const res = await fetch(`/api/instagram/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextState }),
      });
      if (!res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === automation.id ? { ...a, is_active: !nextState } : a))
        );
        showToast("Erro ao alterar status.", "error");
      } else {
        showToast(nextState ? "Automação ativada!" : "Automação pausada.", "info");
      }
    } catch {
      setAutomations((prev) =>
        prev.map((a) => (a.id === automation.id ? { ...a, is_active: !nextState } : a))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    const res = await fetch(`/api/instagram/automations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      showToast("Automação excluída.", "info");
    }
  }

  async function handleDrainQueue() {
    setDrainingQueue(true);
    try {
      const res = await fetch("/api/instagram/queue/drain", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.skipped
            ? `Fila verificada: ${data.reason}`
            : `Fila processada! ${data.sent || 0} DMs enviadas.`,
          "success"
        );
        router.refresh();
      } else {
        showToast(data.error || "Erro ao processar fila.", "error");
      }
    } catch {
      showToast("Erro de conexão.", "error");
    } finally {
      setDrainingQueue(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/instagram/auth/logout", { method: "POST" });
    router.push("/automacao-instagram/login");
  }

  function runSimulation() {
    if (!simComment.trim()) {
      setSimResult(null);
      return;
    }
    const normalized = simComment.toLowerCase().trim();
    const matched = automations.find((a) => {
      if (!a.is_active) return false;
      return (a.keywords || []).some((kw) => {
        const k = kw.toLowerCase().trim();
        if (!k) return false;
        return a.match_mode === "exact" ? normalized === k : normalized.includes(k);
      });
    });
    setSimResult(matched || null);
  }

  const filteredAutomations = useMemo(() => {
    return automations.filter((a) => {
      if (statusFilter === "active" && !a.is_active) return false;
      if (statusFilter === "paused" && a.is_active) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          (a.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
          a.dm_message_text.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [automations, statusFilter, searchFilter]);

  const tabTitleMap: Record<TabType, string> = {
    home: "Inicial",
    contacts: "Contatos",
    automations: "Automação",
    ai: "Pratic AI",
    inbox: "Caixa de Entrada",
    results: "Resultados & Insights",
    settings: "Configurações",
  };

  const displayName = config?.ig_username === "juli0net0" ? "Julio Neto" : config?.ig_username || "Julio Neto";
  const displayHandle = config?.ig_username ? `@${config.ig_username}` : "@juli0net0";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)] font-sans antialiased">
      {/* ========================================================
          LEFT SIDEBAR (PraticChat Sidebar)
         ======================================================== */}
      <aside
        className={`h-full shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex flex-col justify-between transition-all duration-200 z-30 ${
          sidebarCollapsed ? "w-16" : "w-64 min-w-[256px]"
        } ${mobileMenuOpen ? "fixed inset-y-0 left-0 shadow-2xl" : "hidden md:flex"}`}
      >
        {/* Top Header & Workspace */}
        <div className="flex flex-col">
          {/* Logo Bar */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-terracotta)] to-[#b84627] text-white flex items-center justify-center font-black text-sm shadow-sm">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">
                      PraticChat
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block -mt-0.5">
                    Automação Instagram
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--color-terracotta)] text-white flex items-center justify-center font-bold text-xs mx-auto">
                P
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-md transition-colors"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connected Instagram Account Card */}
          {!sidebarCollapsed && (
            <div className="p-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-[var(--color-terracotta)]/40">
                  <Image
                    src="/bio/avatar.jpg"
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-xs text-[var(--color-text-primary)] truncate">
                      {displayName}
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                    {displayHandle}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1">
            <NavItem
              icon={<Home className="w-4 h-4" />}
              label="Inicial"
              active={activeTab === "home"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("home");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Users className="w-4 h-4" />}
              label="Contatos"
              badge={contacts.length > 0 ? String(contacts.length) : undefined}
              active={activeTab === "contacts"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("contacts");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Workflow className="w-4 h-4" />}
              label="Automação"
              badge={automations.length > 0 ? String(automations.length) : undefined}
              active={activeTab === "automations"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("automations");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<FolderOpen className="w-4 h-4" />}
              label="Materiais"
              collapsed={sidebarCollapsed}
              onClick={() => {
                router.push("/automacao-instagram/materiais");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Sparkles className="w-4 h-4" />}
              label="Pratic AI"
              active={activeTab === "ai"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("ai");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<MessageSquare className="w-4 h-4" />}
              label="Caixa de Entrada"
              badge={stats.pending > 0 ? String(stats.pending) : undefined}
              badgeColor="blue"
              active={activeTab === "inbox"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("inbox");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<BarChart3 className="w-4 h-4" />}
              label="Resultados & Funil"
              active={activeTab === "results"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("results");
                setMobileMenuOpen(false);
              }}
            />
            <NavItem
              icon={<Settings className="w-4 h-4" />}
              label="Configurações"
              active={activeTab === "settings"}
              collapsed={sidebarCollapsed}
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
            />
          </nav>
        </div>

        {/* Sidebar Footer: Profile, Theme Switcher & Logout */}
        <div className="p-3 border-t border-[var(--color-border-subtle)] space-y-2">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[var(--color-border-default)]">
                  <Image
                    src="/bio/avatar.jpg"
                    alt="Julio Neto"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {displayHandle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {mounted && (
                  <button
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    title={resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)] transition-colors"
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  title="Sair do painel"
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  title={resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)]"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={handleLogout}
                title="Sair"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1.5 rounded-lg hover:bg-[var(--color-surface-sunken)]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================
          RIGHT MAIN CONTENT AREA
         ======================================================== */}
      <div className="flex-1 h-full min-w-0 flex flex-col overflow-hidden">
        {/* TOP NOTICE BANNER (Yellow Alert Banner) */}
        {!config ? (
          <div className="bg-[#422006] border-b border-[#713f12] text-[#fef08a] px-6 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 max-w-4xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#facc15]" />
              <span>
                A conexão do Instagram com esta conta foi perdida. Para resolver isso, o administrador da conta precisa no Instagram{" "}
                <a href="/api/instagram/oauth/start" className="underline font-bold hover:text-white">
                  Atualizar Permissões
                </a>
              </span>
            </div>
            <a
              href="/api/instagram/oauth/start"
              className="bg-[#ca8a04] hover:bg-[#eab308] text-black px-3 py-1 rounded-md font-bold text-xs shrink-0 transition-colors"
            >
              Conectar Conta
            </a>
          </div>
        ) : tokenExpiresInDays !== null && tokenExpiresInDays <= 7 ? (
          <div className="bg-[#422006] border-b border-[#713f12] text-[#fef08a] px-6 py-2 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-[#facc15]" />
              <span>Seu token do Instagram expira em {tokenExpiresInDays} dias. Atualize as permissões.</span>
            </div>
            <a
              href="/api/instagram/oauth/start"
              className="underline font-bold text-xs hover:text-white"
            >
              Renovar Token
            </a>
          </div>
        ) : null}

        {/* TOP BREADCRUMB / HEADER BAR */}
        <header className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-6 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-[var(--color-text-primary)] p-1.5 rounded-lg border border-[var(--color-border-subtle)]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-base text-[var(--color-text-primary)]">
              {tabTitleMap[activeTab]}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Dark/Light Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                title={resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                className="p-1.5 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] transition-colors"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={() => setShowSimulator(true)}
              className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-sunken)] px-3.5 py-1.5 rounded-lg font-medium text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-[var(--color-terracotta)]" />
              Testar Disparador
            </button>
            <button
              onClick={() => openCreateForm()}
              className="text-xs bg-[var(--color-terracotta)] hover:opacity-90 text-[var(--color-text-on-accent)] px-3.5 py-1.5 rounded-lg font-semibold transition-opacity flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova automação
            </button>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* --------------------------------------------------
                VIEW: INICIAL (Home Screen)
               -------------------------------------------------- */}
            {activeTab === "home" && (
              <div className="space-y-8">
                {/* Greeting Title */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                    Olá, {displayName}!
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-secondary)] font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                      1 canal conectado ({displayHandle})
                    </span>
                    <span>•</span>
                    <button
                      onClick={() => setActiveTab("results")}
                      className="text-[var(--color-terracotta)] hover:underline font-semibold flex items-center gap-0.5"
                    >
                      Ver Insights <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Section: "Comece aqui" (Quick Automations) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                      Comece aqui
                    </h3>
                    <button
                      onClick={() => setActiveTab("automations")}
                      className="text-xs text-[var(--color-terracotta)] hover:underline font-semibold"
                    >
                      Veja todos os modelos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TEMPLATES.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => openCreateForm(tpl.defaultForm)}
                        className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-terracotta)] rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md group min-h-[150px]"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="p-2 rounded-lg bg-[var(--color-surface-sunken)] w-fit">
                              {tpl.icon}
                            </div>
                            {tpl.badge && (
                              <span
                                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  tpl.badgeType === "popular"
                                    ? "bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]"
                                    : tpl.badgeType === "new"
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "bg-green-500/15 text-green-400"
                                }`}
                              >
                                {tpl.badge}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[var(--color-text-primary)] leading-snug group-hover:text-[var(--color-terracotta)] transition-colors">
                            {tpl.title}
                          </h4>
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--color-terracotta)]">
                          <span>Usar modelo</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: "Primeiros passos" — só aparece antes de conectar/criar a 1ª automação */}
                {(!config || automations.length === 0) && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                      Primeiros passos
                    </h3>

                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6 max-w-xl space-y-4 shadow-sm">
                      <div>
                        <p className="font-bold text-sm text-[var(--color-text-primary)] leading-snug">
                          Conecte sua conta e crie sua primeira automação pra começar a acompanhar os números aqui.
                        </p>

                        {/* Progress bar */}
                        <div className="mt-3 space-y-1.5">
                          <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-terracotta)] rounded-full transition-all duration-300"
                              style={{ width: `${Math.round((completedCount / checklistItems.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            {completedCount} de {checklistItems.length} completadas
                          </span>
                        </div>
                      </div>

                      {/* Checklist Rows */}
                      <div className="space-y-2 pt-1">
                        {checklistItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={item.onClick}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)]/40 hover:bg-[var(--color-surface-sunken)] text-left transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                  item.completed
                                    ? "bg-[var(--color-success-wash)] text-[var(--color-success)]"
                                    : "border border-[var(--color-border-strong)]"
                                }`}
                              >
                                {item.completed && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span
                                className={`text-xs font-medium truncate ${
                                  item.completed ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)] font-semibold"
                                }`}
                              >
                                {item.title}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section: Números da automação */}
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-[var(--color-text-primary)]">
                    Seus números
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Automações Ativas</span>
                      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                        {automations.filter((a) => a.is_active).length}
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">DMs Entregues</span>
                      <p className="text-2xl font-bold text-[var(--color-success)] mt-1">
                        {totalSent}
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Cliques no Link</span>
                      <p className="text-2xl font-bold text-[var(--color-terracotta)] mt-1">
                        {totalClicks}
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Na Fila (Pendente)</span>
                      <p className="text-2xl font-bold text-[#eab308] mt-1">
                        {stats.pending}
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Taxa de Conversão</span>
                      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                        {overallConversionRate}%
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Contatos</span>
                      <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                        {contacts.length}
                      </p>
                    </div>
                    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4 col-span-2">
                      <span className="text-xs text-[var(--color-text-muted)] font-medium">Automação com Melhor Desempenho</span>
                      <p className="text-sm font-bold text-[var(--color-text-primary)] mt-1.5 truncate">
                        {topAutomation ? topAutomation.name : "—"}
                      </p>
                      {topAutomation && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {topAutomation.clicks} clique{topAutomation.clicks === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: AUTOMAÇÕES (Flows List & Editor)
               -------------------------------------------------- */}
            {activeTab === "automations" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                      Minhas Automações ({automations.length})
                    </h1>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Regras de disparo automático acionadas por comentários e directs.
                    </p>
                  </div>
                  <button
                    onClick={() => openCreateForm()}
                    className="text-xs bg-[var(--color-terracotta)] hover:opacity-90 text-[var(--color-text-on-accent)] px-4 py-2 rounded-lg font-semibold transition-opacity flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Nova automação
                  </button>
                </div>

                {/* Filter / Search bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] p-2 rounded-xl">
                  <div className="flex items-center gap-1 w-full sm:w-auto">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        statusFilter === "all"
                          ? "bg-[var(--color-surface-inset)] text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      Todas ({automations.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter("active")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        statusFilter === "active"
                          ? "bg-[var(--color-surface-inset)] text-[var(--color-success)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      Ativas ({automations.filter((a) => a.is_active).length})
                    </button>
                    <button
                      onClick={() => setStatusFilter("paused")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        statusFilter === "paused"
                          ? "bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      Pausadas ({automations.filter((a) => !a.is_active).length})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Buscar por nome ou palavra..."
                      className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] focus:border-[var(--color-terracotta)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                  {filteredAutomations.length === 0 ? (
                    <div className="text-center py-12 bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-default)] rounded-xl p-8 space-y-2">
                      <Workflow className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        Nenhuma automação encontrada.
                      </p>
                    </div>
                  ) : (
                    filteredAutomations.map((a) => (
                      <div
                        key={a.id}
                        className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <h4 className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                              {a.name}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                a.is_active
                                  ? "bg-[var(--color-success-wash)] text-[var(--color-success-ink)]"
                                  : "bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]"
                              }`}
                            >
                              {a.is_active ? "Ativa" : "Pausada"}
                            </span>
                            {a.require_follow && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]">
                                🔒 Exclusivo seguidores
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => toggleActive(a)}
                              className="text-xs bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-inset)] px-3 py-1.5 rounded-lg font-medium text-[var(--color-text-primary)] transition-colors"
                            >
                              {a.is_active ? "Pausar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => openEditForm(a)}
                              className="text-xs bg-[var(--color-surface-sunken)] hover:bg-[var(--color-surface-inset)] px-3 py-1.5 rounded-lg font-medium text-[var(--color-text-primary)] transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="bg-[var(--color-surface-sunken)] rounded-lg p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[var(--color-text-muted)]">Palavras-chave:</span>
                            {(a.keywords || []).map((k, i) => (
                              <span key={i} className="bg-[var(--color-surface-inset)] px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                #{k}
                              </span>
                            ))}
                          </div>
                          <p className="text-[var(--color-text-secondary)]">
                            <strong className="text-[var(--color-text-primary)]">DM:</strong> {a.dm_message_text}
                          </p>
                          {a.dm_button_text && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
                              <ExternalLink className="w-3 h-3" />
                              <span>
                                {a.dm_button_text} ({a.dm_button_url}) —{" "}
                                {a.cta_type === "link"
                                  ? "link direto"
                                  : a.cta_type === "quick_reply"
                                  ? "sugestão de resposta"
                                  : "botão fixo"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: CONTATOS
               -------------------------------------------------- */}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Contatos ({contacts.length})
                  </h1>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Histórico de usuários que interagiram com as automações.
                  </p>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
                  {contacts.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[var(--color-text-muted)]">
                      Nenhum contato registrado ainda.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-border-subtle)]">
                      <div className="bg-[var(--color-surface-sunken)] px-4 py-2 text-[11px] font-bold text-[var(--color-text-muted)] uppercase grid grid-cols-12">
                        <span className="col-span-6">Usuário</span>
                        <span className="col-span-6">Última Interação</span>
                      </div>
                      {contacts.map((c) => (
                        <div key={c.id} className="px-4 py-3 text-xs grid grid-cols-12 items-center">
                          <span className="col-span-6 font-semibold text-[var(--color-text-primary)]">
                            {c.username ? `@${c.username}` : `IGSID: ${c.igsid}`}
                          </span>
                          <span className="col-span-6 text-[var(--color-text-secondary)]">
                            {new Date(c.last_seen_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: CAIXA DE ENTRADA & FILA
               -------------------------------------------------- */}
            {activeTab === "inbox" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                      Caixa de Entrada & Fila de Mensagens
                    </h1>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Status de envio e fila de processamento da API do Instagram.
                    </p>
                  </div>
                  <button
                    onClick={handleDrainQueue}
                    disabled={drainingQueue}
                    className="text-xs bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${drainingQueue ? "animate-spin" : ""}`} />
                    Drenar Fila Agora
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Na fila</span>
                    <p className="text-xl font-bold text-[#eab308] mt-1">{stats.pending}</p>
                  </div>
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Enviadas</span>
                    <p className="text-xl font-bold text-[var(--color-success)] mt-1">{totalSent}</p>
                  </div>
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-muted)]">Falharam</span>
                    <p className="text-xl font-bold text-[var(--color-danger)] mt-1">{stats.failed}</p>
                  </div>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-5 space-y-3">
                  <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Eventos Recentes</h4>
                  <div className="divide-y divide-[var(--color-border-subtle)] max-h-72 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className={log.level === "error" ? "text-[var(--color-danger)] font-semibold" : "text-[var(--color-text-primary)]"}>
                          {log.event}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {new Date(log.created_at).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: RESULTADOS
               -------------------------------------------------- */}
            {activeTab === "results" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Resultados & Funil de Conversão
                  </h1>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Métricas de entrega e cliques de todas as automações.
                  </p>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>1. Comentários Recebidos</span>
                      <span>{totalComments}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-7 relative overflow-hidden flex items-center px-3">
                      <div className="absolute inset-0 bg-blue-600 rounded-full" />
                      <span className="relative z-10 text-xs font-bold text-white">{totalComments} comentários (100%)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>2. DMs Entregues</span>
                      <span>{totalSent}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-7 relative overflow-hidden flex items-center px-3">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--color-success)] rounded-full"
                        style={{ width: `${Math.max(totalComments > 0 ? (totalSent / totalComments) * 100 : 0, 5)}%` }}
                      />
                      <span className="relative z-10 text-xs font-bold text-white">{totalSent} enviadas</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>3. Cliques no Link</span>
                      <span>{totalClicks}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-7 relative overflow-hidden flex items-center px-3">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--color-terracotta)] rounded-full"
                        style={{ width: `${Math.max(overallConversionRate, 5)}%` }}
                      />
                      <span className="relative z-10 text-xs font-bold text-white">{totalClicks} cliques ({overallConversionRate}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: PRATIC AI
               -------------------------------------------------- */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Pratic AI
                  </h1>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Modelos prontos e prompts inteligentes para responder e qualificar leads.
                  </p>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6 space-y-3">
                  <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
                    Modelos Pré-Treinados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => openCreateForm(TEMPLATES[0].defaultForm)}
                      className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] hover:border-[var(--color-terracotta)] rounded-xl cursor-pointer transition-colors"
                    >
                      <span className="font-bold text-xs text-[var(--color-text-primary)]">
                        ⚡ Disparo de Link em Lançamentos
                      </span>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Gatilho para posts de carrossel e reels convidando para evento ou oferta.
                      </p>
                    </div>
                    <div
                      onClick={() => openCreateForm(TEMPLATES[2].defaultForm)}
                      className="p-4 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] hover:border-[var(--color-terracotta)] rounded-xl cursor-pointer transition-colors"
                    >
                      <span className="font-bold text-xs text-[var(--color-text-primary)]">
                        💼 Triagem de Contato & WhatsApp
                      </span>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        Redirecionamento ágil para canal comercial sem perda de lead.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: CONFIGURAÇÕES
               -------------------------------------------------- */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Configurações
                  </h1>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Conexão oficial com Meta Graph API e credenciais.
                  </p>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)]">Conta do Instagram</span>
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">
                        {displayName} ({displayHandle})
                      </p>
                    </div>
                    <a
                      href="/api/instagram/oauth/start"
                      className="text-xs bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] px-3.5 py-2 rounded-lg font-semibold hover:opacity-90"
                    >
                      {config ? "Reconectar Conta" : "Conectar Instagram"}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================
          MODAL: CRIAR / EDITAR AUTOMAÇÃO
         ======================================================== */}
      {showForm && (
        <AutomationEditorModal
          form={form}
          onChange={(patch) => setForm({ ...form, ...patch })}
          editingId={editingId}
          saving={saving}
          displayName={displayName}
          displayHandle={displayHandle}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}

      {/* ========================================================
          MODAL: TESTAR DISPARADOR
         ======================================================== */}
      {showSimulator && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                Simulador de Comentário
              </h3>
              <button onClick={() => { setShowSimulator(false); setSimResult(undefined); }} className="text-[var(--color-text-muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-[var(--color-text-primary)] mb-1">
                Comentário de Teste
              </label>
              <input
                value={simComment}
                onChange={(e) => setSimComment(e.target.value)}
                placeholder="Ex: eu quero o link"
                className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none"
              />
            </div>

            <button
              onClick={runSimulation}
              className="w-full bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] font-semibold py-2 rounded-lg"
            >
              Testar
            </button>

            {simResult !== undefined && (
              <div className="pt-2">
                {simResult ? (
                  <div className="p-3 bg-[var(--color-success-wash)] text-[var(--color-success-ink)] rounded-lg space-y-1">
                    <p className="font-bold">✓ Acionou: &quot;{simResult.name}&quot;</p>
                    <p className="text-[11px]">DM: {simResult.dm_message_text}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-[#422006] text-[#fef08a] rounded-lg">
                    Nenhuma automação ativa correspondeu ao comentário.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  badgeColor,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  badgeColor?: string;
  collapsed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "justify-between px-3"} py-2.5 rounded-xl text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--color-surface-inset)] text-[var(--color-text-primary)] font-bold shadow-xs"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        <span className={active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
          {icon}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>

      {!collapsed && badge && (
        <span
          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
            badgeColor === "blue" ? "bg-blue-600 text-white" : "bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
