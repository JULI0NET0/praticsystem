"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  User,
  MessageSquare,
  CheckCircle2,
  Clock,
  Calendar,
  Star,
  Plus,
  LayoutGrid,
  Zap,
  GripVertical,
  X,
  Pencil,
  Loader2,
  Inbox,
  UserX,
  Save,
  Timer,
  Play,
  Square,
  MoreHorizontal,
  Activity,
  RotateCcw,
  SkipForward,
  Trophy,
  Award,
  Pin,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { usePresence } from "@/hooks/usePresence";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { usePomodoro, WORK_MS, BREAK_MS } from "@/hooks/usePomodoro";
import { tint } from "@/lib/tint";
import { toISODate } from "@/lib/dueDate";
import { getAgendaCategory } from "@/lib/agendaCategories";
import type { DemandListGroupBy, DemandView } from "@/types/demandas";
import DemandsWidgetImpl, {
  readStoredView as readStoredDemandsView,
  readStoredGroupBy as readStoredDemandsGroupBy,
  VIEW_STORAGE_KEY as DEMANDS_VIEW_STORAGE_KEY,
  GROUPBY_STORAGE_KEY as DEMANDS_GROUPBY_STORAGE_KEY,
} from "@/components/workspace/DemandsWidget";
import PointsWidget from "@/components/workspace/PointsWidget";

// Definição dos Widgets Disponíveis
const AVAILABLE_WIDGETS = [
  { id: 'stats', title: 'Métricas Rápidas', icon: Zap },
  { id: 'timetracker', title: 'Meu Registro', icon: Timer },
  { id: 'pomodoro', title: 'Pomodoro', icon: Trophy },
  { id: 'demands', title: 'Minhas Demandas', icon: CheckCircle2 },
  { id: 'notes', title: 'Notas Rápidas', icon: MessageSquare },
  { id: 'links', title: 'Links Úteis', icon: Star },
  { id: 'team', title: 'Equipe Online', icon: User },
  { id: 'agenda', title: 'Agenda', icon: Calendar },
  { id: 'points', title: 'Pontos & Ranking', icon: Award },
];

export default function WorkspacePage() {
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const { onlineUsers, isUserOnline } = usePresence();
  const { isTracking, todayHours, todayMinutes, currentSession, clockIn, clockOut } = useTimeTracker();
  const [status, setStatus] = useState("");
  const [greeting, setGreeting] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState("☀️");
  const [myNote, setMyNote] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const EMOJIS = ["☀️", "🌙", "🚀", "🔥", "☕", "💻", "🎨", "📈", "🎯", "✨", "✅", "⚡", "🌟", "🛠️", "📅", "💡", "🧠", "💼", "🤝", "🌈", "🍀", "💎", "🏆", "📣", "📝", "🌍", "🍕", "🦾", "💪", "🏄", "🧘", "🚲"];
  const [demands, setDemands] = useState<any[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(true);
  const [finishedCount, setFinishedCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [demandsView, setDemandsView] = useState<DemandView>(readStoredDemandsView);
  const [demandsGroupBy, setDemandsGroupBy] = useState<DemandListGroupBy>(readStoredDemandsGroupBy);
  const [activeDemandTitle, setActiveDemandTitle] = useState<string | null>(null);
  const [headerElapsed, setHeaderElapsed] = useState("00:00:00");

  // Cronômetro dinâmico para o Command Header quando em tracking
  useEffect(() => {
    if (!isTracking || !currentSession) {
      setHeaderElapsed("00:00:00");
      return;
    }
    const tick = () => {
      const start = new Date(currentSession.start_time).getTime();
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setHeaderElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isTracking, currentSession]);

  const handleStartTimerForDemand = (demand: any) => {
    setActiveDemandTitle(demand.title);
    if (!isTracking) {
      clockIn();
    }
    showToast(`⏱️ Foco iniciado em: ${demand.title}`, "success");
  };

  const changeDemandsView = (next: DemandView) => {
    setDemandsView(next);
    try {
      window.localStorage.setItem(DEMANDS_VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage indisponível
    }
  };

  const changeDemandsGroupBy = (next: DemandListGroupBy) => {
    setDemandsGroupBy(next);
    try {
      window.localStorage.setItem(DEMANDS_GROUPBY_STORAGE_KEY, next);
    } catch {
      // localStorage indisponível
    }
  };

  useEffect(() => {
    if (currentUser) {
      setMyNote(`Anotações de ${currentUser.username ? `@${currentUser.username}` : currentUser.name}`);
      setStatus(currentUser.workspace_settings?.status || "Planejando a semana...");

      // Define saudação baseada na hora
      const hour = new Date().getHours();
      let greet = "Bom dia";
      let emoji = "☀️";
      if (hour >= 12 && hour < 18) { greet = "Boa tarde"; emoji = "⛅"; }
      else if (hour >= 18 || hour < 5) { greet = "Boa noite"; emoji = "🌙"; }
      const firstName = currentUser.username ? `@${currentUser.username}` : (currentUser.name?.split(' ')[0] || "");
      setGreeting(`${greet}, ${firstName}!`);
      if (currentUser.emoji) {
        setCurrentEmoji(currentUser.emoji);
      }

      if (currentUser.workspace_settings?.layout) {
        setWidgets(currentUser.workspace_settings.layout);
      }

      fetchWorkspaceData();
    }
  }, [currentUser]);

  const fetchWorkspaceData = async () => {
    if (!currentUser) return;
    try {
      setLoadingDemands(true);
      // Demandas em aberto onde sou responsável — assignee_ids é um array
      // (uma demanda pode ter vários responsáveis) e assign_all_team marca
      // as que são do time inteiro.
      const assigneeFilter = `assignee_ids.cs.{${currentUser.id}},assign_all_team.eq.true`;
      const todayISO = toISODate(new Date());
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const [demandsRes, finishedRes, alertsRes] = await Promise.all([
        supabase
          .from('demands')
          .select('*, demand_statuses(label, color)')
          .neq('status_category', 'fechado')
          .or(assigneeFilter)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5),
        // Concluídas hoje
        supabase
          .from('demands')
          .select('id', { count: 'exact', head: true })
          .or(assigneeFilter)
          .gte('completed_at', startOfToday.toISOString())
          .lt('completed_at', startOfTomorrow.toISOString()),
        // Atrasadas — mesmo cálculo do contador de "atrasada(s)" em DemandasView.tsx
        supabase
          .from('demands')
          .select('id', { count: 'exact', head: true })
          .or(assigneeFilter)
          .neq('status_category', 'fechado')
          .lt('due_date', todayISO),
      ]);

      if (demandsRes.data) setDemands(demandsRes.data);
      setFinishedCount(finishedRes.count ?? 0);
      setAlertsCount(alertsRes.count ?? 0);
    } catch (err) {
      console.error("Erro ao buscar dados do workspace:", err);
    } finally {
      setLoadingDemands(false);
    }
  };

  // Layouts Pré-definidos (Ajustados para gridAutoRows de 120px)
  const PRESETS = {
    default: [
      { id: 'stats', colSpan: 8, rowSpan: 1 },
      { id: 'timetracker', colSpan: 4, rowSpan: 1 },
      { id: 'demands', colSpan: 6, rowSpan: 3 },
      { id: 'notes', colSpan: 3, rowSpan: 2 },
      { id: 'team', colSpan: 3, rowSpan: 2 },
      { id: 'links', colSpan: 6, rowSpan: 1 },
      { id: 'agenda', colSpan: 4, rowSpan: 2 },
      { id: 'points', colSpan: 4, rowSpan: 1 },
    ],
    finance: [
      { id: 'stats', colSpan: 12, rowSpan: 1 },
      { id: 'links', colSpan: 12, rowSpan: 1 },
      { id: 'demands', colSpan: 6, rowSpan: 3 },
      { id: 'notes', colSpan: 6, rowSpan: 3 },
    ],
    compact: [
      { id: 'stats', colSpan: 4, rowSpan: 1 },
      { id: 'demands', colSpan: 4, rowSpan: 1 },
      { id: 'team', colSpan: 4, rowSpan: 1 },
      { id: 'notes', colSpan: 4, rowSpan: 1 },
      { id: 'links', colSpan: 4, rowSpan: 1 },
    ]
  };

  const [widgets, setWidgets] = useState(PRESETS.default);

  // Persistência removida do localStorage para usar Supabase via saveLayout
  useEffect(() => {
    // A inicialização agora é feita no useEffect do [currentUser]
  }, []);

  const saveLayout = async (newWidgets?: any[]) => {
    const layoutToSave = newWidgets || widgets;
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          workspace_settings: {
            ...currentUser.workspace_settings,
            layout: layoutToSave,
            status: status
          }
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error("Erro ao salvar layout:", err);
    }
  };

  const updateStatusInDB = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status_message: status,
          workspace_settings: {
            ...currentUser.workspace_settings,
            status: status
          }
        })
        .eq('id', currentUser.id);

      if (!error) {
        showToast("Status atualizado!", "success");
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const updateEmoji = async (newEmoji: string) => {
    if (!currentUser) return;
    setCurrentEmoji(newEmoji);
    setShowEmojiPicker(false);
    try {
      const { error } = await supabase
        .from('users')
        .update({ emoji: newEmoji })
        .eq('id', currentUser.id);

      if (!error) {
        showToast("Emoji do dia atualizado!", "success");
      } else {
        setCurrentEmoji(currentUser.emoji || "☀️");
        showToast("Erro ao atualizar emoji", "error");
      }
    } catch (err) {
      console.error("Erro ao atualizar emoji:", err);
      setCurrentEmoji(currentUser.emoji || "☀️");
      showToast("Erro ao atualizar emoji", "error");
    }
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setWidgets(PRESETS[presetKey]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const WIDGET_DEFAULTS: Record<string, { colSpan: number; rowSpan: number }> = {
    pomodoro: { colSpan: 4, rowSpan: 3 },
    timetracker: { colSpan: 4, rowSpan: 2 },
    team: { colSpan: 3, rowSpan: 2 },
    agenda: { colSpan: 4, rowSpan: 2 },
    points: { colSpan: 4, rowSpan: 1 },
  };

  const addWidget = (id: string) => {
    if (!widgets.find(w => w.id === id)) {
      const defaults = WIDGET_DEFAULTS[id] ?? { colSpan: 6, rowSpan: 1 };
      setWidgets([...widgets, { id, ...defaults }]);
    }
    setIsAddModalOpen(false);
  };

  const updateWidgetSize = (id: string, dimension: 'colSpan' | 'rowSpan', delta: number) => {
    setWidgets(widgets.map(w => {
      if (w.id === id) {
        const min = 1;
        const max = dimension === 'colSpan' ? 12 : 6;
        const newVal = Math.max(min, Math.min(max, (w[dimension] || 1) + delta));
        return { ...w, [dimension]: newVal };
      }
      return w;
    }));
  };

  const moveWidget = (index: number, direction: 'left' | 'right') => {
    const newWidgets = [...widgets];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
      setWidgets(newWidgets);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {/* Header Principal */}
      <div className="workspace-header">
        {/* Emoji e Saudação */}
        <div className="workspace-greeting-group">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.button
              key={currentEmoji}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
              style={{
                fontSize: '2.2rem',
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '18px',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-border-subtle)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-sunken)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {currentEmoji}
            </motion.button>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="workspace-emoji-picker"
                  style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 99999,
                    marginTop: '12px', padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px var(--color-border-subtle)',
                    width: '320px',
                    backgroundColor: '#18181b',
                    border: '1px solid var(--color-text-muted)',
                    borderRadius: '24px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {EMOJIS.map(emojiStr => (
                      <button
                        key={emojiStr}
                        onClick={(ev) => { ev.stopPropagation(); updateEmoji(emojiStr); }}
                        style={{ 
                          fontSize: '1.5rem', 
                          height: '44px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: 'var(--color-surface-sunken)', 
                          border: '1px solid var(--color-border-subtle)', 
                          cursor: 'pointer', 
                          borderRadius: '12px', 
                          transition: 'all 0.2s' 
                        }}
                        onMouseEnter={(ev) => {
                          ev.currentTarget.style.background = 'var(--color-border-subtle)';
                          ev.currentTarget.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(ev) => {
                          ev.currentTarget.style.background = 'var(--color-surface-sunken)';
                          ev.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emojiStr}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: '1px', background: 'var(--color-border-subtle)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Qualquer Emoji</p>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Cole aqui..."
                        className="input-dark"
                        maxLength={8}
                        style={{ height: '38px', fontSize: '0.9rem', padding: '0 12px', width: '100%', borderRadius: '12px' }}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val && val.length >= 1) {
                            updateEmoji(val);
                          }
                        }}
                      />
                      <div style={{ position: 'absolute', right: '12px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        <Plus size={14} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="workspace-title" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              {greeting}
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'capitalize' }}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
          </div>
        </div>

        <div className="workspace-header-divider" />

        {/* Status Bar Integrada */}
        <div className="workspace-status-bar" style={{ minWidth: 220 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTracking ? 'var(--color-success)' : 'var(--color-success)', boxShadow: isTracking ? '0 0 10px var(--color-success)' : 'none', flexShrink: 0 }} />
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateStatusInDB()}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', fontWeight: 500 }}
            placeholder={isTracking && activeDemandTitle ? `Foco: ${activeDemandTitle}` : "No que você está trabalhando?"}
          />
          {status !== (currentUser?.workspace_settings?.status || "") && (
            <button onClick={updateStatusInDB} style={{ color: 'var(--accent)', padding: '4px' }}>
              <Save size={14} />
            </button>
          )}
        </div>

        <div className="workspace-actions">
          {/* Presets de layout — visíveis apenas em modo edição */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Presets:</span>
                {(['default', 'finance', 'compact'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                      border: '1px solid var(--border)', background: 'var(--color-surface-sunken)',
                      color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {key === 'default' ? 'Padrão' : key === 'finance' ? 'Financeiro' : 'Compacto'}
                  </button>
                ))}
                <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer de Trabalho Ativo no Header */}
          {isTracking ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 6px 3px 10px',
              borderRadius: '10px',
              background: 'var(--color-success-wash)',
              border: '1px solid color-mix(in oklab, var(--color-success) 30%, transparent)'
            }}>
              <div className="timer-live-dot" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
                  Trabalhando
                </span>
                <span className="timer-tabular" style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-success)', lineHeight: 1.2 }}>
                  {headerElapsed}
                </span>
              </div>
              <button
                onClick={() => {
                  clockOut();
                  setActiveDemandTitle(null);
                }}
                title="Finalizar sessão de trabalho"
                style={{
                  height: '28px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  background: 'var(--color-danger-wash)',
                  color: 'var(--color-danger)',
                  border: '1px solid color-mix(in oklab, var(--color-danger) 25%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: 4
                }}
              >
                <Square size={10} fill="currentColor" /> Parar
              </button>
            </div>
          ) : (
            <button
              onClick={clockIn}
              title="Iniciar medição de tempo de trabalho"
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '10px',
                background: 'var(--color-success-wash)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid color-mix(in oklab, var(--color-success) 30%, transparent)',
                cursor: 'pointer'
              }}
            >
              <Play size={13} fill="currentColor" /> Iniciar Trabalho
            </button>
          )}

          {/* Botão Personalizar / Salvar */}
          <button
            onClick={() => isEditing ? saveLayout() : setIsEditing(true)}
            className={`btn ${isEditing ? 'btn-accent' : 'btn-secondary'}`}
            style={{
              height: '36px', padding: '0 14px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.8rem', fontWeight: 600
            }}
          >
            {isEditing ? <><CheckCircle2 size={16} /> Salvar</> : <><LayoutGrid size={16} /> Personalizar</>}
          </button>

          {/* Botão Adicionar Widget */}
          {isEditing && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-secondary"
              style={{
                height: '36px', padding: '0 14px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.8rem', fontWeight: 600
              }}
            >
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Grid de Widgets Configurável */}
      <div className="workspace-widget-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridAutoRows: 'minmax(120px, auto)',
        gap: 'var(--space-4)',
        position: 'relative'
      }}>
        <AnimatePresence mode="popLayout">
          {widgets.map((w, index) => {
            // Kanban é largo — o widget de demandas força a largura cheia
            // enquanto essa visão estiver ativa. Só de renderização: o
            // colSpan salvo (e o que "Salvar" persiste) não muda.
            const effectiveColSpan = w.id === 'demands' && demandsView === 'board' ? 12 : w.colSpan;
            return (
            <motion.div
              layout
              key={w.id}
              data-widget={w.id}
              drag={isEditing}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (!isEditing) return;
                const threshold = 50;
                if (info.offset.x > threshold) moveWidget(index, 'right');
                else if (info.offset.x < -threshold) moveWidget(index, 'left');
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                gridColumn: `span ${effectiveColSpan}`,
                gridRow: `span ${w.rowSpan || 1}`,
                position: 'relative',
                zIndex: isEditing ? 1 : 0
              }}
            >
              <div className={`glass-card ${isEditing ? 'editing' : ''}`} style={{
                height: '100%',
                padding: 'var(--card-pad)',
                border: isEditing ? '2px dashed var(--accent)' : '1px solid var(--border)',
                transition: 'all 0.3s ease',
                position: 'relative',
                background: isEditing ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isEditing ? 'grab' : 'default',
                overflow: 'hidden'
              }}>
                {isEditing && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 20
                  }}>
                    <div style={{ background: 'var(--accent)', color: 'var(--color-text-on-accent)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GripVertical size={10} /> {w.colSpan}x{w.rowSpan}
                    </div>
                    <button onClick={() => removeWidget(w.id)} style={{ color: 'var(--color-danger)', padding: '4px' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div style={{ opacity: isEditing ? 0.3 : 1, transition: 'opacity 0.3s', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {w.id === 'stats' && <StatsWidget colSpan={w.colSpan} demandsCount={demands.length} finishedCount={finishedCount} alertsCount={alertsCount} todayHours={todayHours} isTracking={isTracking} onTimerToggle={isTracking ? clockOut : clockIn} />}
                  {w.id === 'timetracker' && <TimeTrackerWidget isTracking={isTracking} todayHours={todayHours} todayMinutes={todayMinutes} currentSession={currentSession} clockIn={clockIn} clockOut={clockOut} activeDemandTitle={activeDemandTitle} />}
                  {w.id === 'pomodoro' && <PomodoroWidget />}
                  {w.id === 'demands' && (
                    <DemandsWidgetImpl
                      view={demandsView}
                      onViewChange={changeDemandsView}
                      groupBy={demandsGroupBy}
                      onGroupByChange={changeDemandsGroupBy}
                      onStartTimer={handleStartTimerForDemand}
                    />
                  )}
                  {w.id === 'notes' && <NotesWidget />}
                  {w.id === 'links' && <LinksWidget />}
                  {w.id === 'team' && <TeamWidget isUserOnline={isUserOnline} onlineUsers={onlineUsers} />}
                  {w.id === 'agenda' && <AgendaWidget />}
                  {w.id === 'points' && <PointsWidget colSpan={w.colSpan} />}
                </div>

                {/* Controles de Redimensionamento */}
                {isEditing && (
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 20 }}>
                    {[{ label: 'L', dim: 'colSpan' as const }, { label: 'A', dim: 'rowSpan' as const }].map(({ label, dim }) => (
                      <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '3px 5px', border: '1px solid var(--color-border-subtle)' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', fontWeight: 700, minWidth: '10px' }}>{label}</span>
                        <button onClick={() => updateWidgetSize(w.id, dim, -1)} style={{ width: '18px', height: '18px', color: 'var(--color-text-tertiary)', fontSize: '0.9rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-border-subtle)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>−</button>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-primary)', fontWeight: 700, minWidth: '14px', textAlign: 'center' }}>{dim === 'colSpan' ? w.colSpan : (w.rowSpan || 1)}</span>
                        <button onClick={() => updateWidgetSize(w.id, dim, 1)} style={{ width: '18px', height: '18px', color: 'var(--color-text-tertiary)', fontSize: '0.9rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-border-subtle)', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>+</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal de Adicionar Widget */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--color-scrim)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--card-pad)' }}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '560px', padding: '36px', position: 'relative', background: 'var(--color-surface-raised)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
            >
              <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--color-surface-sunken)', border: '1px solid var(--border)', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={16} />
              </button>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>Adicionar Widget</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selecione um bloco para adicionar ao seu workspace.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {AVAILABLE_WIDGETS.map(widget => {
                  const isActive = !!widgets.find(w => w.id === widget.id);
                  const descriptions: Record<string, string> = {
                    stats: 'Métricas rápidas do seu dia',
                    timetracker: 'Registro de horas trabalhadas',
                    pomodoro: 'Timer de foco com gamificação',
                    demands: 'Suas tarefas e demandas ativas',
                    notes: 'Bloco de anotações rápidas',
                    links: 'Atalhos e links importantes',
                    team: 'Presença online da equipe',
                    agenda: 'Próximos compromissos da semana',
                    points: 'Seus pontos e posição no ranking',
                  };
                  return (
                    <motion.button
                      key={widget.id}
                      disabled={isActive}
                      onClick={() => addWidget(widget.id)}
                      whileHover={!isActive ? { y: -2, scale: 1.01 } : {}}
                      whileTap={!isActive ? { scale: 0.98 } : {}}
                      style={{
                        padding: '18px 16px', borderRadius: 'var(--radius-card)',
                        border: `1px solid ${isActive ? 'var(--border)' : 'var(--border)'}`,
                        background: isActive ? 'var(--color-surface-sunken)' : 'var(--color-surface-sunken)',
                        cursor: isActive ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '14px',
                        textAlign: 'left', transition: 'border-color 0.2s, background 0.2s',
                        opacity: isActive ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: isActive ? 'var(--color-surface-sunken)' : 'color-mix(in oklab, var(--accent) 12%, transparent)',
                        border: `1px solid ${isActive ? 'var(--border)' : 'color-mix(in oklab, var(--accent) 25%, transparent)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <widget.icon size={20} color={isActive ? 'var(--text-secondary)' : 'var(--accent)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isActive ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{widget.title}</span>
                          {isActive && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-wash)', border: '1px solid var(--color-success-wash)', padding: '1px 6px', borderRadius: '6px' }}>
                              ATIVO
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3, margin: 0 }}>
                          {descriptions[widget.id]}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-componentes
function StatsWidget({ colSpan, demandsCount, finishedCount, alertsCount, todayHours, isTracking, onTimerToggle }: { colSpan: number, demandsCount: number, finishedCount: number, alertsCount: number, todayHours: string, isTracking: boolean, onTimerToggle: () => void }) {
  const totalToday = demandsCount + finishedCount;
  const completionRate = totalToday > 0 ? Math.round((finishedCount / totalToday) * 100) : 0;

  const items = [
    { id: 'demands', label: "Demandas", value: demandsCount, sub: `${alertsCount} prioritárias`, icon: CheckCircle2, color: "var(--accent)", gradient: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 15%, transparent), transparent)", progress: Math.min(100, demandsCount * 10) },
    { id: 'finished', label: "Finalizadas", value: finishedCount, sub: totalToday > 0 ? `${completionRate}% concluído` : "Hoje", icon: CheckCircle2, color: "var(--color-success)", gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), transparent)", progress: completionRate },
    { id: 'timer', label: "Tempo Hoje", value: todayHours.split(' ')[0], sub: todayHours.split(' ')[1] || "0min", icon: isTracking ? Timer : Clock, color: isTracking ? "var(--color-success)" : "#3B82F6", gradient: isTracking ? "linear-gradient(135deg, var(--color-success-wash), transparent)" : "linear-gradient(135deg, rgba(59, 130, 246, 0.15), transparent)", interactive: true },
    { id: 'alerts', label: "Alertas", value: alertsCount, sub: alertsCount > 0 ? "Atenção necessária" : "Tudo em dia", icon: Zap, color: "var(--color-danger)", gradient: "linear-gradient(135deg, var(--color-danger-wash), transparent)" }
  ];

  return (
    <div className="stats-widget-grid">
      {items.slice(0, colSpan > 8 ? 4 : colSpan > 5 ? 3 : 2).map((item, i) => (
        <div
          key={i}
          className="stats-widget-card"
          onClick={item.interactive ? onTimerToggle : undefined}
          style={{
            background: 'var(--card-inner-bg)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-card)',
            border: item.id === 'timer' && isTracking ? '1px solid var(--color-success-wash)' : '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: item.interactive ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            boxShadow: item.id === 'timer' && isTracking ? '0 0 20px var(--color-success-wash)' : 'none',
          }}
          onMouseEnter={(e) => item.interactive && (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={(e) => item.interactive && (e.currentTarget.style.borderColor = item.id === 'timer' && isTracking ? 'var(--color-success-wash)' : 'var(--border)')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: item.gradient, opacity: 0.6, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '10px', background: 'var(--color-surface-sunken)', color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={14} className={item.id === 'timer' && isTracking ? 'animate-pulse' : ''} />
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {item.label}
              </p>
            </div>
            {item.interactive && isTracking && <span className="timer-live-dot" title="Timer em andamento" />}
          </div>
          <div style={{ position: 'relative', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <h2 className="timer-tabular" style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)', lineHeight: 1 }}>{item.value}</h2>
              {item.sub && <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.sub}</span>}
            </div>
            {item.progress !== undefined && (
              <div style={{ width: '100%', height: '4px', background: 'var(--color-surface-sunken)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${item.progress}%`, height: '100%', background: item.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Timer Widget com contagem ao vivo
function TimeTrackerWidget({ isTracking, todayHours, todayMinutes, currentSession, clockIn, clockOut, activeDemandTitle }: any) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!isTracking || !currentSession) {
      setElapsed('00:00:00');
      return;
    }

    const tick = () => {
      const start = new Date(currentSession.start_time).getTime();
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isTracking, currentSession]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {/* Background Pulse Animation when tracking */}
      <AnimatePresence>
        {isTracking && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.15 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              background: 'var(--color-success)',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: 'var(--radius-card)',
          background: isTracking ? 'var(--color-success-wash)' : 'var(--color-surface-sunken)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isTracking ? 'var(--color-success)' : 'var(--text-tertiary)',
          marginBottom: '4px',
          border: `1px solid ${isTracking ? 'var(--color-success-wash)' : 'var(--border)'}`
        }}>
          <Timer size={26} className={isTracking ? "animate-pulse" : ""} />
        </div>

        {activeDemandTitle && isTracking && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--color-success)',
            background: 'var(--color-success-wash)',
            padding: '2px 8px',
            borderRadius: '6px',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            🎯 {activeDemandTitle}
          </span>
        )}

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
            {isTracking ? "Sessão Ativa" : "Sessão Atual"}
          </p>
          <h2 className="timer-tabular" style={{
            fontSize: '2.4rem',
            fontWeight: 900,
            color: isTracking ? 'var(--color-success)' : 'var(--text-tertiary)',
            lineHeight: 1,
            margin: 0
          }}>
            {elapsed}
          </h2>
        </div>

        <div style={{
          marginTop: '10px',
          padding: '4px 12px',
          borderRadius: '10px',
          background: 'var(--color-surface-sunken)',
          border: '1px solid var(--border)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontWeight: 600
        }}>
          Hoje: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{todayHours}</span>
        </div>

        <button
          onClick={isTracking ? clockOut : clockIn}
          style={{
            marginTop: '20px',
            padding: '10px 28px',
            borderRadius: 'var(--radius-card)',
            background: isTracking ? 'var(--color-danger-wash)' : 'var(--accent)',
            color: isTracking ? 'var(--color-danger)' : 'white',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            border: isTracking ? '1px solid var(--color-danger-wash)' : 'none'
          }}
        >
          {isTracking ? <><Square size={16} fill="currentColor" /> Parar Sessão</> : <><Play size={16} fill="currentColor" /> Iniciar Agora</>}
        </button>
      </div>
    </div>
  );
}

const POMODORO_LEVELS = [
  { min: 0,    max: 99,   label: 'Iniciante', emoji: '🌱' },
  { min: 100,  max: 299,  label: 'Focado',    emoji: '🔥' },
  { min: 300,  max: 599,  label: 'Produtivo', emoji: '⚡' },
  { min: 600,  max: 999,  label: 'Expert',    emoji: '🏆' },
  { min: 1000, max: Infinity, label: 'Mestre', emoji: '💎' },
];

function getPomodoroLevel(points: number) {
  return POMODORO_LEVELS.find(l => points >= l.min && points <= l.max) ?? POMODORO_LEVELS[0];
}

function PomodoroWidget() {
  // All timer logic lives in the global context — runs even when this widget is unmounted
  const {
    mode, isRunning, justCompleted,
    totalPoints, sessionsToday,
    timeLeftMs, start, pause, reset, skip, switchMode,
  } = usePomodoro();

  // Local tick only for display re-rendering — does not drive timer logic
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const remainingMs = timeLeftMs();
  const totalMs     = mode === 'work' ? WORK_MS : BREAK_MS;
  const progress    = (totalMs - remainingMs) / totalMs;
  const radius      = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes  = Math.floor(remainingMs / 60000);
  const seconds  = Math.floor((remainingMs % 60000) / 1000);
  const modeColor = mode === 'work' ? 'var(--color-danger)' : 'var(--color-success)';
  const level = getPomodoroLevel(totalPoints);
  const nextLevel = POMODORO_LEVELS.find(l => l.min > totalPoints);
  const progressToNext = nextLevel ? ((totalPoints - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          🍅 Pomodoro
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'var(--color-warning-wash)', border: '1px solid var(--color-warning-wash)',
            padding: '3px 9px', borderRadius: '10px'
          }}>
            <span style={{ fontSize: '0.8rem' }}>⭐</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-warning)' }}>{totalPoints} pts</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'var(--color-surface-sunken)', border: '1px solid var(--border)',
            padding: '3px 9px', borderRadius: '10px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {sessionsToday} hoje
            </span>
          </div>
        </div>
      </div>

      {/* Level bar */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {level.emoji} {level.label}
          </span>
          {nextLevel && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              {nextLevel.min - totalPoints} pts para {nextLevel.emoji}
            </span>
          )}
        </div>
        <div style={{ height: '4px', background: 'var(--color-surface-sunken)', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progressToNext}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: 'var(--color-warning)', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['work', 'break'] as const).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
              background: mode === m ? (m === 'work' ? 'var(--color-danger-wash)' : 'var(--color-success-wash)') : 'var(--color-surface-sunken)',
              color: mode === m ? (m === 'work' ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--text-secondary)',
              border: `1px solid ${mode === m ? (m === 'work' ? 'var(--color-danger-wash)' : 'var(--color-success-wash)') : 'var(--border)'}`,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', opacity: isRunning && mode !== m ? 0.5 : 1
            }}
          >
            {m === 'work' ? '🎯 Foco 25min' : '☕ Pausa 5min'}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative' }}>
          <svg width="148" height="148" viewBox="0 0 148 148">
            <circle cx="74" cy="74" r={radius} fill="none" stroke="var(--color-surface-sunken)" strokeWidth="8" />
            <circle
              cx="74" cy="74" r={radius}
              fill="none"
              stroke={justCompleted ? 'var(--color-warning)' : modeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '74px 74px', transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
            />
          </svg>

          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              {justCompleted ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '2.2rem' }}>{mode === 'work' ? '🎉' : '💪'}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {mode === 'work' ? '+10 pts!' : 'Boa!'}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="timer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{
                    fontFamily: 'monospace', fontSize: '2rem', fontWeight: 900,
                    color: 'var(--text-primary)', lineHeight: 1
                  }}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: modeColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                    {mode === 'work' ? 'Foco' : 'Pausa'}
                    {isRunning && <span style={{ marginLeft: '4px', opacity: 0.7 }}>• ao vivo</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={reset}
            title="Reiniciar"
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'var(--color-surface-sunken)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => isRunning ? pause() : start()}
            title={isRunning ? 'Pausar' : 'Iniciar'}
            style={{
              width: '58px', height: '58px', borderRadius: '18px',
              background: modeColor, border: 'none',
              color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: `0 0 24px ${tint(modeColor, 31)}`
            }}
          >
            {isRunning ? <Square size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>

          <button
            onClick={skip}
            disabled={isRunning}
            title="Pular fase"
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'var(--color-surface-sunken)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', opacity: isRunning ? 0.4 : 1
            }}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Sessions row */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {Array.from({ length: Math.min(sessionsToday, 8) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--color-danger)', boxShadow: '0 0 6px var(--color-danger-wash)'
              }}
            />
          ))}
          {sessionsToday > 8 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, alignSelf: 'center' }}>
              +{sessionsToday - 8}
            </span>
          )}
          {sessionsToday === 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Complete sessões para ganhar pontos</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Hoje, 14:00" / "Amanhã, 10:00" / "Sex, 28/08 · 09:00" — janela fixa de 7
 * dias só pro futuro, então não reaproveita os baldes de dueDate.ts (aquilo
 * é pra due_date sem hora, com categorias tipo "atrasada" que não fazem
 * sentido aqui). */
function formatAgendaRowLabel(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(date);
  startOfTarget.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dayDiff === 0) return `Hoje, ${time}`;
  if (dayDiff === 1) return `Amanhã, ${time}`;
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
  const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}, ${dayMonth} · ${time}`;
}

function AgendaWidget() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);

        const { data } = await supabase
          .from('agenda_events')
          .select('id, title, date, type, client_id, assigned_to, visibility, status')
          .gte('date', now.toISOString())
          .lt('date', end.toISOString())
          .or(`visibility.eq.public,assigned_to.eq.${currentUser.id}`)
          .order('date', { ascending: true })
          .limit(8);

        if (data) setEvents(data);
      } catch (err) {
        console.error("Erro ao buscar agenda do workspace:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Calendar size={18} color="var(--accent)" /> Agenda
        </h3>
        <Link
          href="/admin/schedule"
          style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}
        >
          Ver tudo
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5)' }}>
            <Loader2 size={24} className="animate-spin" color="var(--accent)" />
          </div>
        ) : events.length > 0 ? events.map(ev => {
          const category = getAgendaCategory(ev.type);
          const CategoryIcon = category?.icon;
          return (
            <Link
              key={ev.id}
              href="/admin/schedule"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
                background: tint(category?.color || 'var(--text-tertiary)', 15),
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {CategoryIcon && <CategoryIcon size={14} color={category?.color} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', margin: 0 }}>
                  {formatAgendaRowLabel(ev.date)}
                </p>
              </div>
            </Link>
          );
        }) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={32} strokeWidth={1} color="var(--text-tertiary)" />
            </div>
            <div>
              <p style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Tudo em dia!</p>
              <p style={{ opacity: 0.7 }}>Nenhum evento nos próximos 7 dias.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesWidget() {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, subjects, updated_at')
          .or(`user_id.eq.${currentUser.id},shared_with.cs.{${currentUser.id}},share_all.eq.true`)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          const sorted = data.sort((a, b) => {
            const aPinned = (a.subjects ?? []).includes('_pinned:true');
            const bPinned = (b.subjects ?? []).includes('_pinned:true');
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          setNotes(sorted);
        }
      } catch (err) {
        console.error('Erro no widget de notas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [currentUser]);

  const getPreviewText = (content: any): string => {
    if (!content) return '';
    const extractText = (node: any): string => {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extractText).join('');
      return '';
    };
    const blocks: any[] = Array.isArray(content) ? content : content.content ?? [];
    for (const block of blocks) {
      const text = extractText(block).trim();
      if (text) return text.slice(0, 80);
    }
    return '';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <MessageSquare size={16} color="var(--accent)" /> Notas do Workspace
        </h3>
        <Link href="/admin/notas/create">
          <button style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'color-mix(in oklab, var(--accent) 10%, transparent)', color: 'var(--accent)',
            border: '1px solid color-mix(in oklab, var(--accent) 20%, transparent)', borderRadius: '8px',
            padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'color-mix(in oklab, var(--accent) 10%, transparent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          >
            <Plus size={12} /> Nova Nota
          </button>
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--card-pad)' }}>
            <Loader2 size={20} className="animate-spin" color="var(--accent)" />
          </div>
        ) : notes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '8px', opacity: 0.5, textAlign: 'center', padding: 'var(--card-pad)' }}>
            <FileText size={24} />
            <span style={{ fontSize: '0.8rem' }}>Nenhuma nota encontrada</span>
          </div>
        ) : (
          notes.map(note => {
            const isPinned = (note.subjects ?? []).includes('_pinned:true');
            const previewText = getPreviewText(note.content);
            return (
              <div
                key={note.id}
                onClick={() => router.push(`/admin/notas/${note.id}`)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--color-surface-sunken)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--accent) 25%, transparent)';
                  e.currentTarget.style.background = 'var(--color-surface-sunken)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--color-border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || 'Sem título'}
                  </span>
                  {isPinned && <Pin size={11} color="var(--accent)" style={{ flexShrink: 0 }} />}
                </div>
                {previewText && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                    {previewText}
                  </span>
                )}
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Atualizado em {new Date(note.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type WorkspaceLink = { id: string; name: string; url: string; icon: string };

const DEFAULT_LINKS: WorkspaceLink[] = [
  { id: "default-drive", name: "Google Drive", url: "https://drive.google.com", icon: "📁" },
  { id: "default-ads", name: "Meta Ads", url: "https://adsmanager.facebook.com", icon: "📈" },
  { id: "default-brandbook", name: "Brandbook", url: "#", icon: "🎨" },
  { id: "default-manual", name: "Manual", url: "#", icon: "📖" },
];

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "#") return trimmed || null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    try {
      const withProtocol = `https://${trimmed}`;
      new URL(withProtocol);
      return withProtocol;
    } catch {
      return null;
    }
  }
}

function LinksWidget() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const savedLinks = currentUser?.workspace_settings?.links ?? DEFAULT_LINKS;

  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [draftLinks, setDraftLinks] = useState<WorkspaceLink[]>(savedLinks);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDraftLinks(savedLinks);
    setIsEditingLinks(true);
  };

  const updateDraft = (id: string, field: "name" | "url" | "icon", value: string) => {
    setDraftLinks((current) => current.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeDraft = (id: string) => {
    setDraftLinks((current) => current.filter((l) => l.id !== id));
  };

  const addDraft = () => {
    setDraftLinks((current) => [...current, { id: crypto.randomUUID(), name: "", url: "", icon: "🔗" }]);
  };

  const saveLinks = async () => {
    if (!currentUser) return;
    const cleaned: WorkspaceLink[] = [];
    for (const link of draftLinks) {
      const name = link.name.trim();
      const rawUrl = link.url.trim();
      if (!name && !rawUrl) continue;
      if (!name) {
        showToast("Dê um nome para cada link", "error");
        return;
      }
      const url = normalizeLinkUrl(rawUrl);
      if (!url) {
        showToast(`URL inválida em "${name}"`, "error");
        return;
      }
      cleaned.push({ ...link, name, url, icon: link.icon.trim() || "🔗" });
    }

    setSaving(true);
    try {
      const { data: fresh } = await supabase
        .from('users')
        .select('workspace_settings')
        .eq('id', currentUser.id)
        .single();

      const { error } = await supabase
        .from('users')
        .update({
          workspace_settings: {
            ...(fresh?.workspace_settings ?? currentUser.workspace_settings),
            links: cleaned,
          },
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      setIsEditingLinks(false);
      showToast("Links atualizados!", "success");
    } catch (err) {
      console.error("Erro ao salvar links:", err);
      showToast("Erro ao salvar links", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Star size={18} color="var(--color-warning)" /> Links Úteis
        </h3>
        {!isEditingLinks && (
          <button
            type="button"
            onClick={openEditor}
            className="btn btn-secondary"
            style={{
              height: '28px', padding: '0 10px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.72rem', fontWeight: 700
            }}
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      {!isEditingLinks ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {savedLinks.length > 0 ? savedLinks.map(link => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -2, background: 'var(--color-surface-sunken)' }}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--color-surface-sunken)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
              {link.name}
            </motion.a>
          )) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nenhum link ainda.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {draftLinks.map((link) => (
            <div key={link.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                value={link.icon}
                onChange={(e) => updateDraft(link.id, 'icon', e.target.value)}
                maxLength={4}
                className="input-dark"
                style={{ width: '38px', height: '32px', fontSize: '0.9rem', padding: '0 6px', textAlign: 'center', borderRadius: '8px', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                <input
                  value={link.name}
                  onChange={(e) => updateDraft(link.id, 'name', e.target.value)}
                  placeholder="Nome"
                  className="input-dark"
                  style={{ height: '28px', fontSize: '0.78rem', padding: '0 8px', borderRadius: '8px' }}
                />
                <input
                  value={link.url}
                  onChange={(e) => updateDraft(link.id, 'url', e.target.value)}
                  placeholder="URL"
                  className="input-dark"
                  style={{ height: '28px', fontSize: '0.78rem', padding: '0 8px', borderRadius: '8px' }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeDraft(link.id)}
                aria-label="Remover link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 2, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addDraft}
            className="btn btn-secondary"
            style={{ height: '30px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '8px', marginTop: '4px' }}
          >
            <Plus size={13} /> Adicionar link
          </button>

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setIsEditingLinks(false)}
              className="btn btn-secondary"
              style={{ flex: 1, height: '32px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveLinks}
              disabled={saving}
              className="btn btn-accent"
              style={{ flex: 1, height: '32px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px' }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamWidget({ isUserOnline, onlineUsers }: { isUserOnline: (id: string) => boolean, onlineUsers: any[] }) {
  const { users, currentUser } = useAuth();
  const router = useRouter();
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const teamMembers = users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role));
  const sorted = [...teamMembers].sort((a, b) => {
    const aOnline = isUserOnline(a.id) ? 1 : 0;
    const bOnline = isUserOnline(b.id) ? 1 : 0;
    return bOnline - aOnline;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="var(--accent)" /> Equipe
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-success-wash)', padding: '4px 10px', borderRadius: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 800 }}>
            {onlineUsers.length} ON
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {sorted.length > 0 ? sorted.map((m: any) => {
          const online = isUserOnline(m.id);
          return (
            <div key={m.id} style={{ position: 'relative' }}>
              <motion.div
                whileHover={{ background: 'var(--color-surface-sunken)', x: 4 }}
                onClick={() => setActivePopover(activePopover === m.id ? null : m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px', borderRadius: 'var(--radius-card)', cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                  background: activePopover === m.id ? 'var(--color-surface-sunken)' : 'transparent'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-card)',
                    background: 'var(--accent)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-on-accent)',
                    border: online ? '2px solid var(--color-success)' : '2px solid transparent'
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: '-webkit-optimize-contrast', backfaceVisibility: 'hidden' }} alt="" />
                      : (m.username || m.name).substring(0, 2).toUpperCase()}
                  </div>
                  {online && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute', bottom: -2, right: -2, width: '14px', height: '14px',
                        background: 'var(--color-success)', borderRadius: '50%',
                        border: '3px solid var(--bg-primary)',
                        zIndex: 2
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: online ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {m.username ? `@${m.username}` : m.name}
                    </p>
                    <span style={{ fontSize: '1rem' }}>{m.emoji}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: online ? 'var(--color-success)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                    {online ? 'Ativo agora' : 'Indisponível'}
                  </p>
                </div>
                <MoreHorizontal size={16} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
              </motion.div>

              {/* Popover de ações */}
              <AnimatePresence>
                {activePopover === m.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    style={{
                      position: 'absolute', top: '100%', left: '0', right: '0', zIndex: 50, marginTop: '8px',
                      background: 'var(--color-surface-raised)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-card)', padding: '8px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                  >
                    <button
                      onClick={() => { router.push(`/admin/chat`); setActivePopover(null); }}
                      style={{
                        width: '100%', padding: '12px', border: 'none', borderRadius: '12px',
                        background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--accent) 10%, transparent)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MessageSquare size={16} color="var(--accent)" /> Enviar Mensagem
                    </button>
                    <button
                      onClick={() => { router.push(`/admin/users/${m.id}`); setActivePopover(null); }}
                      style={{
                        width: '100%', padding: '12px', border: 'none', borderRadius: '12px',
                        background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-sunken)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <User size={16} color="var(--text-secondary)" /> Ver Perfil Completo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <UserX size={40} strokeWidth={1} opacity={0.3} />
            <p>Ninguém na equipe no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
