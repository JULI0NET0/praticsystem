"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useToast } from "@/components/CustomToast";
import type { IgAutomation, IgConfig } from "@/lib/instagram";
import AutomationEditorModal from "./automation-editor/AutomationEditorModal";
import type { AutomationFormValues } from "./automation-editor/types";
import { renderMessageVars } from "@/lib/instagramVars";
import type { AutomationStats, DailyPoint } from "@/lib/instagramStats";
import HomeDashboard, { type DashboardCounts } from "./dashboard/HomeDashboard";
import ContactsView from "./dashboard/ContactsView";
import InboxView from "./dashboard/InboxView";
import type { IgContactView } from "./dashboard/ContactAvatar";
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
  Zap,
  Smartphone,
  LogOut,
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

export interface DashboardData {
  counts: DashboardCounts;
  series: DailyPoint[];
  automationStats: Record<string, AutomationStats>;
}

interface Props {
  initialConfig: IgConfig | null;
  initialAutomations: IgAutomation[];
  initialLogs: LogRow[];
  initialContacts?: IgContactView[];
  dashboard: DashboardData;
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
    icon: <Zap className="w-4 h-4 text-[var(--color-info)]" />,
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
  initialContacts = [],
  dashboard,
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

  // Só as automações têm edição otimista no cliente; o resto vem direto das props
  // para refletir o router.refresh() (ex.: depois de "Atualizar perfis").
  const config = initialConfig;
  const [automations, setAutomations] = useState(initialAutomations);
  const logs = initialLogs;
  const contacts = initialContacts;
  const stats = queueStats;

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
  const totalComments = dashboard.counts.comments;
  const totalSent = dashboard.counts.sent;
  const totalClicks = dashboard.counts.clicks;
  const overallConversionRate = totalComments > 0 ? Math.round((totalClicks / totalComments) * 100) : 0;


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

  const automationNames = useMemo(
    () => Object.fromEntries(automations.map((a) => [a.id, a.name])),
    [automations]
  );

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
        } ${mobileMenuOpen ? "fixed inset-y-0 left-0" : "hidden md:flex"}`}
      >
        {/* Top Header & Workspace */}
        <div className="flex flex-col">
          {/* Logo Bar */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center font-black text-sm shadow-sm">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">
                      PraticChat
                    </span>
                    <span className="text-[11px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
                      PRO
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--color-text-secondary)] block -mt-0.5">
                    Automação Instagram
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center font-bold text-xs mx-auto">
                P
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn btn-ghost btn-icon hidden md:flex"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-expanded={!sidebarCollapsed}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
              className="btn btn-ghost btn-icon md:hidden"
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
          <nav aria-label="Seções da automação" className="p-2.5 space-y-1">
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
                  <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                    {displayHandle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {mounted && (
                  <button
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    title={resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                    className="btn btn-ghost btn-icon"
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  title="Sair do painel"
                  className="btn btn-ghost btn-icon"
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
                  className="btn btn-ghost btn-icon"
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={handleLogout}
                title="Sair"
                className="btn btn-ghost btn-icon"
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
          <div className="bg-[var(--color-warning-wash)] border-b border-[var(--color-warning)] text-[var(--color-warning-ink)] px-6 py-2.5 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 max-w-4xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-warning-ink)]" />
              <span>
                A conexão do Instagram com esta conta foi perdida. Para resolver isso, o administrador da conta precisa no Instagram{" "}
                <a href="/api/instagram/oauth/start" className="underline font-bold hover:opacity-80">
                  Atualizar Permissões
                </a>
              </span>
            </div>
            <a
              href="/api/instagram/oauth/start"
              className="bg-[var(--color-terracotta)] hover:bg-[var(--color-terracotta-hover-solid)] text-[var(--color-text-on-accent)] px-3 py-1 rounded-md font-bold text-xs shrink-0 transition-colors"
            >
              Conectar Conta
            </a>
          </div>
        ) : tokenExpiresInDays !== null && tokenExpiresInDays <= 7 ? (
          <div className="bg-[var(--color-warning-wash)] border-b border-[var(--color-warning)] text-[var(--color-warning-ink)] px-6 py-2 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-[var(--color-warning-ink)]" />
              <span>Seu token do Instagram expira em {tokenExpiresInDays} dias. Atualize as permissões.</span>
            </div>
            <a
              href="/api/instagram/oauth/start"
              className="underline font-bold text-xs hover:opacity-80"
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
              aria-label="Abrir menu"
              className="btn btn-secondary btn-icon md:hidden"
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
                className="btn btn-secondary btn-icon"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-[var(--color-warning)]" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={() => setShowSimulator(true)}
              className="btn btn-secondary btn-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-[var(--color-terracotta)]" />
              Testar Disparador
            </button>
            <button
              onClick={() => openCreateForm()}
              className="btn btn-accent btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova automação
            </button>
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
          <div className="w-full space-y-8">
            {/* --------------------------------------------------
                VIEW: INICIAL (Home Screen)
               -------------------------------------------------- */}
            {activeTab === "home" && (
              <HomeDashboard
                displayName={displayName}
                displayHandle={displayHandle}
                connected={!!config}
                counts={dashboard.counts}
                series={dashboard.series}
                automations={automations}
                automationStats={dashboard.automationStats}
                contacts={contacts}
                logs={logs}
                checklist={checklistItems}
                onOpenTab={setActiveTab}
                onEditAutomation={openEditForm}
                onCreateAutomation={() => openCreateForm()}
              />
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
                    className="btn btn-accent"
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

                {/* Galeria */}
                {filteredAutomations.length === 0 ? (
                  <div className="text-center py-12 bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-default)] rounded-xl p-8 space-y-2">
                    <Workflow className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Nenhuma automação encontrada.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredAutomations.map((a) => {
                      const s = dashboard.automationStats[a.id] ?? { comments: 0, sent: 0, clicks: 0 };
                      const conversion = s.comments > 0 ? Math.round((s.clicks / s.comments) * 100) : 0;
                      return (
                        <article
                          key={a.id}
                          className="surface p-4 flex flex-col gap-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-[var(--color-text-primary)] truncate">{a.name}</h4>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                {a.post_id ? "Post específico" : "Todos os posts e reels"} ·{" "}
                                {a.match_mode === "exact" ? "comentário exato" : "contém a palavra"}
                              </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                              <span
                                className={`badge ${
                                  a.is_active
                                    ? "bg-[var(--color-success-wash)] text-[var(--color-success-ink)]"
                                    : "bg-[var(--color-surface-inset)] text-[var(--color-text-secondary)]"
                                }`}
                              >
                                {a.is_active ? "Ativa" : "Pausada"}
                              </span>
                              {a.require_follow && (
                                <span className="badge bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
                                  Só seguidores
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(a.keywords || []).map((k, i) => (
                              <span key={i} className="bg-[var(--color-surface-sunken)] px-1.5 py-0.5 rounded text-[11px] font-semibold text-[var(--color-text-primary)]">
                                #{k}
                              </span>
                            ))}
                          </div>

                          <div className="rounded-lg bg-[var(--color-surface-sunken)] p-3 text-xs space-y-1.5">
                            <p className="text-[var(--color-text-primary)] line-clamp-2">{a.dm_message_text}</p>
                            {a.dm_button_text && (
                              <p className="flex items-center gap-1 text-[var(--color-info-ink)] font-medium truncate">
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  {a.dm_button_text} ·{" "}
                                  {a.cta_type === "link"
                                    ? "link direto"
                                    : a.cta_type === "quick_reply"
                                    ? "sugestão de resposta"
                                    : "botão fixo"}
                                </span>
                              </p>
                            )}
                          </div>

                          <dl className="grid grid-cols-4 gap-2 text-xs">
                            {[
                              ["Comentários", s.comments],
                              ["DMs", s.sent],
                              ["Cliques", s.clicks],
                              ["Conversão", `${conversion}%`],
                            ].map(([label, value]) => (
                              <div key={label as string}>
                                <dt className="text-[var(--color-text-secondary)]">{label}</dt>
                                <dd className="font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</dd>
                              </div>
                            ))}
                          </dl>

                          <div className="mt-auto flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                            <button onClick={() => openEditForm(a)} className="btn btn-secondary btn-sm">
                              Editar
                            </button>
                            <button onClick={() => toggleActive(a)} className="btn btn-ghost btn-sm">
                              {a.is_active ? "Pausar" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              aria-label={`Excluir ${a.name}`}
                              className="btn btn-ghost btn-icon hover-danger ml-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Modelos prontos */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Começar de um modelo</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => openCreateForm(tpl.defaultForm)}
                        className="surface p-4 text-left flex flex-col gap-2 hover:border-[var(--color-terracotta)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="p-2 rounded-lg bg-[var(--color-surface-sunken)]">{tpl.icon}</span>
                          <span className="text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">{tpl.badge}</span>
                        </div>
                        <span className="font-semibold text-[13px] text-[var(--color-text-primary)] leading-snug">{tpl.title}</span>
                        <span className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{tpl.description}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* --------------------------------------------------
                VIEW: CONTATOS
               -------------------------------------------------- */}
            {activeTab === "contacts" && (
              <ContactsView contacts={contacts} total={dashboard.counts.contacts} />
            )}

            {/* --------------------------------------------------
                VIEW: CAIXA DE ENTRADA & FILA
               -------------------------------------------------- */}
            {activeTab === "inbox" && <InboxView automationNames={automationNames} />}

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
                      <div className="absolute inset-0 bg-[var(--color-info)] rounded-full" />
                      <span className="relative z-10 text-xs font-bold text-[var(--color-text-primary)]">{totalComments} comentários (100%)</span>
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
                      <span className="relative z-10 text-xs font-bold text-[var(--color-text-primary)]">{totalSent} enviadas</span>
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
                      <span className="relative z-10 text-xs font-bold text-[var(--color-text-primary)]">{totalClicks} cliques ({overallConversionRate}%)</span>
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
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
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
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
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
                      <span className="text-xs text-[var(--color-text-secondary)]">Conta do Instagram</span>
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">
                        {displayName} ({displayHandle})
                      </p>
                    </div>
                    <a
                      href="/api/instagram/oauth/start"
                      className="btn btn-accent btn-sm"
                    >
                      {config ? "Reconectar Conta" : "Conectar Instagram"}
                    </a>
                  </div>
                </div>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Fila de envio &amp; logs</h2>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                        DMs das automações aguardando envio pela API do Instagram (até {"60"} por hora).
                      </p>
                    </div>
                    <button onClick={handleDrainQueue} disabled={drainingQueue} className="btn btn-secondary btn-sm">
                      <RefreshCw className={`w-3.5 h-3.5 ${drainingQueue ? "animate-spin" : ""}`} />
                      Processar fila agora
                    </button>
                  </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-secondary)]">Na fila</span>
                    <p className="text-xl font-bold text-[var(--color-warning-ink)] mt-1">{stats.pending}</p>
                  </div>
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-secondary)]">Enviadas</span>
                    <p className="text-xl font-bold text-[var(--color-success)] mt-1">{totalSent}</p>
                  </div>
                  <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                    <span className="text-xs text-[var(--color-text-secondary)]">Falharam</span>
                    <p className="text-xl font-bold text-[var(--color-danger)] mt-1">{stats.failed}</p>
                  </div>
                </div>

                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-5 space-y-3">
                  <h4 className="font-bold text-sm text-[var(--color-text-primary)]">Eventos recentes (técnico)</h4>
                  <div className="divide-y divide-[var(--color-border-subtle)] max-h-72 overflow-y-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className={log.level === "error" ? "text-[var(--color-danger)] font-semibold" : "text-[var(--color-text-primary)]"}>
                          {log.event}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          {new Date(log.created_at).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                </section>
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
        <div className="fixed inset-0 bg-[var(--color-scrim)] flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div role="dialog" aria-modal="true" aria-label="Simulador de Comentário" className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                Simulador de Comentário
              </h3>
              <button onClick={() => { setShowSimulator(false); setSimResult(undefined); }} aria-label="Fechar" className="btn btn-ghost btn-icon">
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
              className="btn btn-accent w-full"
            >
              Testar
            </button>

            {simResult !== undefined && (
              <div className="pt-2">
                {simResult ? (
                  <div className="p-3 bg-[var(--color-success-wash)] text-[var(--color-success-ink)] rounded-lg space-y-1">
                    <p className="font-bold">✓ Acionou: &quot;{simResult.name}&quot;</p>
                    <p className="text-[11px]">DM: {renderMessageVars(simResult.dm_message_text, { first_name: "Maria", username: "maria.exemplo" })}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-[var(--color-warning-wash)] text-[var(--color-warning-ink)] rounded-lg">
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
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "justify-between px-3"} py-2.5 rounded-xl text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--color-surface-inset)] text-[var(--color-text-primary)] font-bold shadow-xs"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"
      } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-info)]`}
    >
      <div className="flex items-center gap-2.5 truncate">
        <span className={active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
          {icon}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </div>

      {!collapsed && badge && (
        <span
          className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full ${
            badgeColor === "blue" ? "bg-[var(--color-info-wash)] text-[var(--color-info-ink)]" : "bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
