"use client";

import { useState, useEffect, useCallback } from "react";
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
  ArrowLeft,
  ArrowRight,
  Loader2,
  Inbox,
  UserX,
  Save,
  Timer,
  Play,
  Square
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { usePresence } from "@/hooks/usePresence";
import { useTimeTracker } from "@/hooks/useTimeTracker";

// Definição dos Widgets Disponíveis
const AVAILABLE_WIDGETS = [
  { id: 'stats', title: 'Métricas Rápidas', icon: Zap },
  { id: 'timetracker', title: 'Meu Registro', icon: Timer },
  { id: 'demands', title: 'Minhas Demandas', icon: CheckCircle2 },
  { id: 'notes', title: 'Notas Rápidas', icon: MessageSquare },
  { id: 'links', title: 'Links Úteis', icon: Star },
  { id: 'team', title: 'Equipe Online', icon: User },
];

export default function WorkspacePage() {
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const { onlineUsers, isUserOnline } = usePresence();
  const { isTracking, todayHours, todayMinutes, currentSession, clockIn, clockOut } = useTimeTracker();
  const [status, setStatus] = useState("");
  const [greeting, setGreeting] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [myNote, setMyNote] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const EMOJIS = ["☀️", "🌙", "🚀", "🔥", "☕", "💻", "🎨", "📈", "🎯", "✨", "✅", "⚡"];
  const [demands, setDemands] = useState<any[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setMyNote(`Anotações de ${currentUser.name}`);
      setStatus(currentUser.workspace_settings?.status || "Planejando a semana...");

      // Define saudação baseada na hora
      const hour = new Date().getHours();
      let greet = "Bom dia";
      let emoji = "☀️";
      if (hour >= 12 && hour < 18) { greet = "Boa tarde"; emoji = "⛅"; }
      else if (hour >= 18 || hour < 5) { greet = "Boa noite"; emoji = "🌙"; }
      const firstName = currentUser.name?.split(' ')[0] || "";
      setGreeting(`${greet}, ${firstName}! Como estão as coisas hoje? ${emoji}`);

      if (currentUser.workspace_settings?.layout) {
        setWidgets(currentUser.workspace_settings.layout);
      }

      fetchWorkspaceData();
    }
  }, [currentUser]);

  const fetchWorkspaceData = async () => {
    try {
      setLoadingDemands(true);
      const { data, error } = await supabase
        .from('demands')
        .select('*')
        .eq('assigned_to', currentUser?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setDemands(data);
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
    try {
      const { error } = await supabase
        .from('users')
        .update({ emoji: newEmoji })
        .eq('id', currentUser.id);

      if (!error) {
        setShowEmojiPicker(false);
        showToast("Emoji do dia atualizado!", "success");
      }
    } catch (err) {
      console.error("Erro ao atualizar emoji:", err);
    }
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setWidgets(PRESETS[presetKey]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const addWidget = (id: string) => {
    if (!widgets.find(w => w.id === id)) {
      setWidgets([...widgets, { id, colSpan: 6, rowSpan: 1 }]);
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="workspace-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            WorkSpace
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <p
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                  padding: '8px 12px', borderRadius: '16px', transition: 'all 0.2s',
                  background: 'var(--card-inner-bg)', border: '1px solid var(--border)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: '1.5rem' }}>{currentUser?.emoji || "☀️"}</span> {greeting}
              </p>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="glass-card"
                    style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 100,
                      marginTop: '8px', padding: '12px', display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}
                  >
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => updateEmoji(e)}
                        style={{ fontSize: '1.2rem', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        {e}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isEditing && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--card-inner-bg)', padding: '6px 16px',
                borderRadius: '20px', border: '1px solid var(--border)',
                height: '40px'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS</span>
                <input
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateStatusInDB()}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', width: '100%', maxWidth: '250px', minWidth: '120px' }}
                  placeholder="No que você está trabalhando?"
                />
                <button
                  onClick={updateStatusInDB}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    cursor: 'pointer', display: 'flex', padding: '4px',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Save size={16} />
                </button>
              </div>
            )}

            {isEditing && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                Modo de Edição: Configure largura (↔) e altura (↕) dos seus blocos.
              </p>
            )}
          </div>
        </div>
        <div className="hide-mobile" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '32px' }}
              >
                <Plus size={16} /> Widget
              </button>
              <div style={{ width: '1px', background: 'var(--border)', margin: '4px' }} />
              <button onClick={() => applyPreset('default')} className="btn-small" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px' }}>Padrão</button>
              <button onClick={() => applyPreset('finance')} className="btn-small" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px' }}>Financeiro</button>
              <button onClick={() => applyPreset('compact')} className="btn-small" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px' }}>Compacto</button>
              <div style={{ width: '1px', background: 'var(--border)', margin: '4px' }} />
              <Spotlight as="button" onClick={() => saveLayout()} className="btn btn-accent btn-sm" style={{ padding: '6px 16px', height: '32px' }}>
                <CheckCircle2 size={16} /> Salvar
              </Spotlight>
            </div>
          ) : (
            <>
              <Spotlight as="button" onClick={() => setIsEditing(true)} className="btn btn-accent btn-sm" style={{ height: '32px', fontSize: '0.85rem' }}>
                <LayoutGrid size={16} /> Editar
              </Spotlight>
            </>
          )}
        </div>
      </div>

      {/* Grid de Widgets Configurável */}
      <div className="workspace-widget-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridAutoRows: 'minmax(120px, auto)',
        gap: '24px',
        position: 'relative'
      }}>
        <AnimatePresence mode="popLayout">
          {widgets.map((w, index) => (
            <motion.div
              layout
              key={w.id}
              drag={isEditing ? true : false}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (!isEditing) return;
                const threshold = 50;
                if (info.offset.x > threshold) moveWidget(index, 'right');
                else if (info.offset.x < -threshold) moveWidget(index, 'left');
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                gridColumn: `span ${w.colSpan}`,
                gridRow: `span ${w.rowSpan || 1}`,
                position: 'relative',
                zIndex: isEditing ? 1 : 0
              }}
            >
              <div className={`glass-card ${isEditing ? 'editing' : ''}`} style={{
                height: '100%',
                padding: '24px',
                border: isEditing ? '2px dashed var(--accent)' : '1px solid var(--border)',
                transition: 'all 0.3s ease',
                position: 'relative',
                background: isEditing ? 'rgba(217, 72, 15, 0.08)' : 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                cursor: isEditing ? 'grab' : 'default'
              }}>
                {isEditing && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '8px',
                      zIndex: 20
                    }}>
                      <div style={{ background: 'var(--accent)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={12} /> {w.colSpan}x{w.rowSpan}
                      </div>
                    </div>
                  </>
                )}

                {/* Controles de Largura (↔) */}
                {isEditing && (
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: '4px' }}>↔</span>
                      <button onClick={() => updateWidgetSize(w.id, 'colSpan', -1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '24px', height: '24px', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>-</button>
                      <button onClick={() => updateWidgetSize(w.id, 'colSpan', 1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '24px', height: '24px', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: '4px' }}>↕</span>
                      <button onClick={() => updateWidgetSize(w.id, 'rowSpan', -1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '24px', height: '24px', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>-</button>
                      <button onClick={() => updateWidgetSize(w.id, 'rowSpan', 1)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '24px', height: '24px', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => removeWidget(w.id)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    opacity: isEditing ? 1 : 0,
                    transition: 'opacity 0.2s',
                    zIndex: 11
                  }}
                >
                  <X size={16} />
                </button>

                <div style={{ opacity: isEditing ? 0.4 : 1, transition: 'opacity 0.3s', flex: 1, overflow: 'hidden' }}>
                  {w.id === 'stats' && <StatsWidget colSpan={w.colSpan} demandsCount={demands.length} todayHours={todayHours} />}
                  {w.id === 'timetracker' && <TimeTrackerWidget isTracking={isTracking} todayHours={todayHours} todayMinutes={todayMinutes} currentSession={currentSession} clockIn={clockIn} clockOut={clockOut} />}
                  {w.id === 'demands' && <DemandsWidget demands={demands} loading={loadingDemands} />}
                  {w.id === 'notes' && <NotesWidget myNote={myNote} setMyNote={setMyNote} />}
                  {w.id === 'links' && <LinksWidget />}
                  {w.id === 'team' && <TeamWidget isUserOnline={isUserOnline} onlineUsers={onlineUsers} />}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal de Adicionar Widget */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '500px', padding: '32px' }}
            >
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Adicionar Widget</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {AVAILABLE_WIDGETS.map(w => (
                  <button
                    key={w.id}
                    disabled={!!widgets.find(widget => widget.id === w.id)}
                    onClick={() => addWidget(w.id)}
                    style={{
                      padding: '20px', borderRadius: '16px', border: '1px solid var(--border)',
                      background: widgets.find(widget => widget.id === w.id) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                      color: widgets.find(widget => widget.id === w.id) ? 'var(--text-secondary)' : 'var(--text-primary)',
                      cursor: widgets.find(widget => widget.id === w.id) ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                    }}
                  >
                    <w.icon size={24} color={widgets.find(widget => widget.id === w.id) ? 'var(--text-secondary)' : 'var(--accent)'} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.title}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '24px' }}
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-componentes
function StatsWidget({ colSpan, demandsCount, todayHours }: { colSpan: number, demandsCount: number, todayHours: string }) {
  const gridCols = colSpan > 8 ? 'repeat(4, 1fr)' : colSpan > 5 ? 'repeat(3, 1fr)' : colSpan > 2 ? 'repeat(2, 1fr)' : '1fr';

  const items = [
    { label: "Demandas", value: demandsCount, color: "var(--accent)" },
    { label: "Finalizadas", value: "0", color: "#10B981" },
    { label: "Horas Hoje", value: todayHours, color: "#3B82F6" },
    { label: "Alertas", value: "0", color: "#EF4444" }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      gap: '12px',
      height: '100%',
      alignItems: 'center'
    }}>
      {items.slice(0, colSpan > 8 ? 4 : colSpan > 5 ? 3 : 2).map((item, i) => (
        <div key={i} style={{ 
          background: 'var(--card-inner-bg)',
          padding: '12px 16px',
          borderRadius: '12px',
          borderLeft: `3px solid ${item.color}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {item.label}
          </p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{item.value}</h2>
        </div>
      ))}
    </div>
  );
}

// Timer Widget com contagem ao vivo
function TimeTrackerWidget({ isTracking, todayHours, todayMinutes, currentSession, clockIn, clockOut }: any) {
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
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isTracking, currentSession]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Timer size={18} color={isTracking ? '#22C55E' : 'var(--text-secondary)'} />
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Meu Registro</span>
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 800, letterSpacing: '0.05em', color: isTracking ? '#22C55E' : 'var(--text-primary)' }}>
        {elapsed}
      </div>

      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total hoje: {todayHours}</span>

      <button
        onClick={isTracking ? clockOut : clockIn}
        style={{
          padding: '8px 24px', borderRadius: '10px', border: 'none',
          background: isTracking ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
          color: isTracking ? '#EF4444' : '#22C55E',
          fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        {isTracking ? <><Square size={14} /> Parar</> : <><Play size={14} /> Iniciar</>}
      </button>
    </div>
  );
}

function DemandsWidget({ demands, loading }: { demands: any[], loading: boolean }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CheckCircle2 size={18} color="var(--accent)" /> Minhas Demandas
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Loader2 size={24} className="animate-spin" color="var(--accent)" />
          </div>
        ) : demands.length > 0 ? demands.map(d => (
          <div key={d.id} style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--card-inner-bg)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontWeight: 600 }}>{d.title}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(d.due_date || d.created_at).toLocaleDateString()}</span>
          </div>
        )) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
          }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--card-inner-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <Inbox size={24} strokeWidth={1.5} />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tudo limpo!</p>
            <p>Você não tem demandas pendentes para hoje.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesWidget({ myNote, setMyNote }: any) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MessageSquare size={18} color="var(--accent)" /> Notas Rápidas
      </h3>
      <textarea
        value={myNote}
        onChange={(e) => setMyNote(e.target.value)}
        className="input-dark"
        style={{ flex: 1, fontSize: '0.9rem', resize: 'none', minHeight: '100px' }}
      />
    </div>
  );
}

function LinksWidget() {
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLinks() {
      // In a real app, this could be a 'links' table.
      // For now, let's keep it empty or hardcode standard real links.
      setLinks([
        { name: "Google Drive", url: "https://drive.google.com", icon: "📁" },
        { name: "Meta Ads", url: "https://adsmanager.facebook.com", icon: "📈" },
      ]);
    }
    fetchLinks();
  }, []);

  return (
    <div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Star size={18} color="#F59E0B" /> Links Úteis
      </h3>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {links.length > 0 ? links.map(link => (
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--card-inner-bg)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {link.icon} {link.name}
          </a>
        )) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nenhum link pinado.</p>
        )}
      </div>
    </div>
  );
}

function TeamWidget({ isUserOnline, onlineUsers }: { isUserOnline: (id: string) => boolean, onlineUsers: any[] }) {
  const { users, currentUser } = useAuth();
  const router = useRouter();
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const teamMembers = users.filter(u => u.id !== currentUser?.id && ['admin', 'board', 'social_media', 'filmmaker'].includes(u.role));
  // Ordena: online primeiro
  const sorted = [...teamMembers].sort((a, b) => {
    const aOnline = isUserOnline(a.id) ? 1 : 0;
    const bOnline = isUserOnline(b.id) ? 1 : 0;
    return bOnline - aOnline;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={18} color="var(--accent)" /> Equipe
        <span style={{ fontSize: '0.7rem', color: '#22C55E', fontWeight: 600, marginLeft: 'auto' }}>
          {onlineUsers.length} online
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
        {sorted.length > 0 ? sorted.map((m: any) => {
          const online = isUserOnline(m.id);
          return (
            <div key={m.id} style={{ position: 'relative' }}>
              <motion.div
                whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                onClick={() => setActivePopover(activePopover === m.id ? null : m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '8px', borderRadius: '12px', cursor: 'pointer',
                  opacity: online ? 1 : 0.5
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'var(--accent)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.75rem', color: 'white'
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : m.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px',
                    background: online ? '#22C55E' : '#6B7280', borderRadius: '50%',
                    border: '2px solid var(--bg-primary)'
                  }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</p>
                    <span style={{ fontSize: '0.9rem' }}>{m.emoji}</span>
                  </div>
                  <p style={{ fontSize: '0.65rem', color: online ? '#22C55E' : '#6B7280', fontWeight: 500 }}>
                    {online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </motion.div>

              {/* Popover de ações */}
              <AnimatePresence>
                {activePopover === m.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    style={{
                      position: 'absolute', top: '100%', left: '8px', zIndex: 50, marginTop: '4px',
                      background: 'rgba(18,18,18,0.98)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '6px', width: '180px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
                    }}
                  >
                    <button
                      onClick={() => { router.push(`/admin/chat`); setActivePopover(null); }}
                      style={{
                        width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px',
                        background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MessageSquare size={14} color="var(--accent)" /> Enviar Mensagem
                    </button>
                    <button
                      onClick={() => { router.push(`/admin/users/${m.id}`); setActivePopover(null); }}
                      style={{
                        width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px',
                        background: 'transparent', color: 'var(--text-primary)', textAlign: 'left',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <User size={14} /> Ver Perfil
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
          }}>
            <UserX size={32} strokeWidth={1.5} opacity={0.5} />
            <p>Ninguém na equipe ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
