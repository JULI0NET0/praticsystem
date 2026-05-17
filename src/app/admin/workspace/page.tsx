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
  Square,
  MoreHorizontal,
  Activity
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
  const [currentEmoji, setCurrentEmoji] = useState("☀️");
  const [myNote, setMyNote] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const EMOJIS = ["☀️", "🌙", "🚀", "🔥", "☕", "💻", "🎨", "📈", "🎯", "✨", "✅", "⚡", "🌟", "🛠️", "📅", "💡", "🧠", "💼", "🤝", "🌈", "🍀", "💎", "🏆", "📣", "📝", "🌍", "🍕", "🦾", "💪", "🏄", "🧘", "🚲"];
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
      {/* Header Principal - Linha Única */}
      <div style={{
        position: 'relative',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'nowrap',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '12px 20px',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Emoji e Saudação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.button
              key={currentEmoji}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
              style={{
                fontSize: '2.2rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '18px',
                width: '56px',
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
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
                  style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 99999,
                    marginTop: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    width: '320px',
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255,255,255,0.2)',
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
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          cursor: 'pointer', 
                          borderRadius: '12px', 
                          transition: 'all 0.2s' 
                        }}
                        onMouseEnter={(ev) => {
                          ev.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                          ev.currentTarget.style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={(ev) => {
                          ev.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          ev.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emojiStr}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

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
          <h1 className="workspace-title" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
            {greeting}
          </h1>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

        {/* Status Bar Integrada */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flex: 1,
          minWidth: '200px'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E', flexShrink: 0 }} />
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateStatusInDB()}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', fontWeight: 500 }}
            placeholder="No que você está trabalhando?"
          />
          {status !== (currentUser?.workspace_settings?.status || "") && (
            <button onClick={updateStatusInDB} style={{ color: 'var(--accent)', padding: '4px' }}>
              <Save size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Timer Compacto */}
          <button
            onClick={isTracking ? clockOut : clockIn}
            title={isTracking ? "Parar Timer" : "Iniciar Timer"}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isTracking ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: isTracking ? '#EF4444' : '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              border: `1px solid ${isTracking ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
            }}
          >
            {isTracking ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>

          {/* Botão Personalizar (Apenas Ícone) */}
          <button
            onClick={() => isEditing ? saveLayout() : setIsEditing(true)}
            className={`btn ${isEditing ? 'btn-accent' : 'btn-secondary'}`}
            title="Personalizar Layout"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isEditing ? <CheckCircle2 size={20} /> : <LayoutGrid size={20} />}
          </button>

          {isEditing && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-secondary"
              title="Adicionar Widget"
              style={{ width: '40px', height: '40px', borderRadius: '12px', padding: 0 }}
            >
              <Plus size={20} />
            </button>
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
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GripVertical size={10} /> {w.colSpan}x{w.rowSpan}
                    </div>
                    <button onClick={() => removeWidget(w.id)} style={{ color: '#EF4444', padding: '4px' }}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div style={{ opacity: isEditing ? 0.3 : 1, transition: 'opacity 0.3s', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {w.id === 'stats' && <StatsWidget colSpan={w.colSpan} demandsCount={demands.length} todayHours={todayHours} isTracking={isTracking} onTimerToggle={isTracking ? clockOut : clockIn} />}
                  {w.id === 'timetracker' && <TimeTrackerWidget isTracking={isTracking} todayHours={todayHours} todayMinutes={todayMinutes} currentSession={currentSession} clockIn={clockIn} clockOut={clockOut} />}
                  {w.id === 'demands' && <DemandsWidget demands={demands} loading={loadingDemands} />}
                  {w.id === 'notes' && <NotesWidget myNote={myNote} setMyNote={setMyNote} />}
                  {w.id === 'links' && <LinksWidget />}
                  {w.id === 'team' && <TeamWidget isUserOnline={isUserOnline} onlineUsers={onlineUsers} />}
                </div>

                {/* Controles de Redimensionamento */}
                {isEditing && (
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 20 }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
                      <button onClick={() => updateWidgetSize(w.id, 'colSpan', -1)} style={{ width: '24px', height: '24px', color: 'white' }}>-</button>
                      <button onClick={() => updateWidgetSize(w.id, 'colSpan', 1)} style={{ width: '24px', height: '24px', color: 'white' }}>+</button>
                    </div>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '2px' }}>
                      <button onClick={() => updateWidgetSize(w.id, 'rowSpan', -1)} style={{ width: '24px', height: '24px', color: 'white' }}>-</button>
                      <button onClick={() => updateWidgetSize(w.id, 'rowSpan', 1)} style={{ width: '24px', height: '24px', color: 'white' }}>+</button>
                    </div>
                  </div>
                )}
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
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '500px', padding: '32px', position: 'relative' }}
            >
              <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Adicionar Widget</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>Escolha um bloco para adicionar ao seu workspace.</p>

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
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => !widgets.find(widget => widget.id === w.id) && (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <w.icon size={28} color={widgets.find(widget => widget.id === w.id) ? 'var(--text-secondary)' : 'var(--accent)'} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{w.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-componentes
function StatsWidget({ colSpan, demandsCount, todayHours, isTracking, onTimerToggle }: { colSpan: number, demandsCount: number, todayHours: string, isTracking: boolean, onTimerToggle: () => void }) {
  const gridCols = colSpan > 8 ? 'repeat(4, 1fr)' : colSpan > 5 ? 'repeat(3, 1fr)' : colSpan > 2 ? 'repeat(2, 1fr)' : '1fr';

  const items = [
    { id: 'demands', label: "Demandas", value: demandsCount, icon: CheckCircle2, color: "var(--accent)", gradient: "linear-gradient(135deg, rgba(217, 72, 15, 0.2), transparent)" },
    { id: 'finished', label: "Finalizadas", value: "0", icon: CheckCircle2, color: "#10B981", gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), transparent)" },
    { id: 'timer', label: "Tempo Hoje", value: todayHours.split(' ')[0], sub: todayHours.split(' ')[1], icon: isTracking ? Timer : Clock, color: isTracking ? "#22C55E" : "#3B82F6", gradient: isTracking ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2), transparent)" : "linear-gradient(135deg, rgba(59, 130, 246, 0.2), transparent)", interactive: true },
    { id: 'alerts', label: "Alertas", value: "0", icon: Zap, color: "#EF4444", gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), transparent)" }
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      height: '100%',
    }}>
      {items.slice(0, colSpan > 8 ? 4 : colSpan > 5 ? 3 : 2).map((item, i) => (
        <div
          key={i}
          onClick={item.interactive ? onTimerToggle : undefined}
          style={{
            background: 'var(--card-inner-bg)',
            padding: '10px 14px',
            borderRadius: '16px',
            border: item.id === 'timer' && isTracking ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            cursor: item.interactive ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            boxShadow: item.id === 'timer' && isTracking ? '0 0 20px rgba(34, 197, 94, 0.1)' : 'none',
            flex: '1 1 100px',
            maxWidth: '160px'
          }}
          onMouseEnter={(e) => item.interactive && (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={(e) => item.interactive && (e.currentTarget.style.borderColor = item.id === 'timer' && isTracking ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)')}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: item.gradient, opacity: 0.5, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', position: 'relative' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={14} className={item.id === 'timer' && isTracking ? 'animate-pulse' : ''} />
            </div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {item.label}
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>{item.value}</h2>
              {item.sub && <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.sub}</span>}
            </div>
          </div>
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
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'var(--accent)',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          background: isTracking ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isTracking ? '#22C55E' : 'var(--text-tertiary)',
          marginBottom: '8px',
          border: `1px solid ${isTracking ? 'rgba(34, 197, 94, 0.2)' : 'var(--border)'}`
        }}>
          <Timer size={28} className={isTracking ? "animate-pulse" : ""} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Sessão Atual
          </p>
          <h2 style={{
            fontFamily: 'monospace',
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: isTracking ? 'var(--text-primary)' : 'var(--text-tertiary)',
            lineHeight: 1,
            margin: 0
          }}>
            {elapsed}
          </h2>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '4px 12px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          fontWeight: 600
        }}>
          Hoje: <span style={{ color: 'var(--text-primary)' }}>{todayHours}</span>
        </div>

        <button
          onClick={isTracking ? clockOut : clockIn}
          style={{
            marginTop: '20px',
            padding: '10px 28px',
            borderRadius: '14px',
            background: isTracking ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent)',
            color: isTracking ? '#EF4444' : 'white',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            border: isTracking ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
          }}
        >
          {isTracking ? <><Square size={16} fill="currentColor" /> Parar Sessão</> : <><Play size={16} fill="currentColor" /> Iniciar Agora</>}
        </button>
      </div>
    </div>
  );
}

function DemandsWidget({ demands, loading }: { demands: any[], loading: boolean }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} color="var(--accent)" /> Minhas Demandas
        </h3>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>
          {demands.length} Pendentes
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={24} className="animate-spin" color="var(--accent)" />
          </div>
        ) : demands.length > 0 ? demands.map(d => (
          <motion.div
            key={d.id}
            whileHover={{ x: 4 }}
            style={{
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{d.title}</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
                background: d.status === 'in_production' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: d.status === 'in_production' ? '#3B82F6' : '#EAB308',
                textTransform: 'uppercase'
              }}>
                {d.status === 'in_production' ? 'Em Produção' : 'Pendente'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                <Calendar size={12} />
                <span>{new Date(d.due_date || d.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                <Activity size={12} />
                <span style={{ textTransform: 'capitalize' }}>{d.type || 'Geral'}</span>
              </div>
            </div>
          </motion.div>
        )) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={32} strokeWidth={1} color="var(--text-tertiary)" />
            </div>
            <div>
              <p style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Tudo em dia!</p>
              <p style={{ opacity: 0.7 }}>Você não tem demandas pendentes para hoje.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesWidget({ myNote, setMyNote }: any) {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Aqui simularia o salvamento automático
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [myNote]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={18} color="var(--accent)" /> Notas Rápidas
        </h3>
        {isSaving && <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Salvando...</span>}
      </div>
      <textarea
        value={myNote}
        onChange={(e) => { setMyNote(e.target.value); setIsSaving(true); }}
        className="input-dark"
        style={{
          flex: 1,
          fontSize: '0.9rem',
          resize: 'none',
          minHeight: '100px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '16px',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }}
        placeholder="Escreva algo aqui..."
      />
    </div>
  );
}

function LinksWidget() {
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLinks() {
      setLinks([
        { name: "Google Drive", url: "https://drive.google.com", icon: "📁" },
        { name: "Meta Ads", url: "https://adsmanager.facebook.com", icon: "📈" },
        { name: "Brandbook", url: "#", icon: "🎨" },
        { name: "Manual", url: "#", icon: "📖" },
      ]);
    }
    fetchLinks();
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Star size={18} color="#F59E0B" /> Links Úteis
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        {links.length > 0 ? links.map(link => (
          <motion.a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2, background: 'rgba(255,255,255,0.05)' }}
            style={{
              padding: '12px 16px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: '0.7rem', color: '#22C55E', fontWeight: 800 }}>
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
                whileHover={{ background: 'rgba(255,255,255,0.04)', x: 4 }}
                onClick={() => setActivePopover(activePopover === m.id ? null : m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px', borderRadius: '16px', cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                  background: activePopover === m.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '14px',
                    background: 'var(--accent)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem', color: 'white',
                    border: online ? '2px solid #22C55E' : '2px solid transparent'
                  }}>
                    {m.avatar_url
                      ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : m.name.substring(0, 2).toUpperCase()}
                  </div>
                  {online && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        position: 'absolute', bottom: -2, right: -2, width: '14px', height: '14px',
                        background: '#22C55E', borderRadius: '50%',
                        border: '3px solid var(--bg-primary)',
                        zIndex: 2
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: online ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{m.name}</p>
                    <span style={{ fontSize: '1rem' }}>{m.emoji}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: online ? '#22C55E' : 'var(--text-tertiary)', fontWeight: 600 }}>
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
                      background: 'rgba(18,18,18,0.95)', backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px', padding: '8px',
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
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,72,15,0.1)')}
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
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
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
