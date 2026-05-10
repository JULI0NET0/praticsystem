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
  ArrowLeft,
  ArrowRight,
  Loader2
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// Definição dos Widgets Disponíveis
const AVAILABLE_WIDGETS = [
  { id: 'stats', title: 'Métricas Rápidas', icon: Zap },
  { id: 'demands', title: 'Minhas Demandas', icon: CheckCircle2 },
  { id: 'notes', title: 'Notas Rápidas', icon: MessageSquare },
  { id: 'links', title: 'Links Úteis', icon: Star },
  { id: 'team', title: 'Equipe Online', icon: User },
];

export default function WorkspacePage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState("");
  const [greeting, setGreeting] = useState("");
  const [myNote, setMyNote] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
      setGreeting(`${greet}, ${currentUser.name.split(' ')[0]} como esta ${emoji}`);

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
      { id: 'stats', colSpan: 12, rowSpan: 1 },
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

  const updateStatusInDB = async (newStatus: string) => {
    if (!currentUser) return;
    try {
      await supabase
        .from('users')
        .update({
          workspace_settings: {
            ...currentUser.workspace_settings,
            status: newStatus
          }
        })
        .eq('id', currentUser.id);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            WorkSpace
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 600 }}>
              {greeting}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {isEditing ? 'Configure largura (↔) e altura (↕) dos seus blocos.' : 'Sua central de produtividade personalizada.'}
              </p>
              {!isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <input 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    onBlur={() => updateStatusInDB(status)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '200px' }}
                    placeholder="Definir status..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
      <div style={{ 
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
                  {w.id === 'stats' && <StatsWidget colSpan={w.colSpan} demandsCount={demands.length} />}
                  {w.id === 'demands' && <DemandsWidget demands={demands} loading={loadingDemands} />}
                  {w.id === 'notes' && <NotesWidget myNote={myNote} setMyNote={setMyNote} />}
                  {w.id === 'links' && <LinksWidget />}
                  {w.id === 'team' && <TeamWidget />}
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
function StatsWidget({ colSpan, demandsCount }: { colSpan: number, demandsCount: number }) {
  const gridCols = colSpan > 6 ? 'repeat(3, 1fr)' : colSpan > 3 ? 'repeat(2, 1fr)' : '1fr';
  
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: gridCols, 
      gap: '20px',
      height: '100%',
      alignItems: 'center',
      padding: '8px 0'
    }}>
      <div style={{ borderLeft: '4px solid var(--accent)', padding: '4px 12px' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Minhas Demandas</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{demandsCount}</h2>
      </div>
      <div style={{ borderLeft: '4px solid #10B981', padding: '4px 12px' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Finalizadas</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>0</h2>
      </div>
      <div style={{ borderLeft: '4px solid #3B82F6', padding: '4px 12px' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Horas Logadas</p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>0h</h2>
      </div>
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
          <div key={d.id} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontWeight: 600 }}>{d.title}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(d.due_date || d.created_at).toLocaleDateString()}</span>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nenhuma demanda atribuída.
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
          <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {link.icon} {link.name}
          </a>
        )) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nenhum link pinado.</p>
        )}
      </div>
    </div>
  );
}

function TeamWidget() {
  const { users, currentUser } = useAuth();
  // Pegando usuários que não são o atual
  const onlineMembers = users.filter(u => u.id !== currentUser?.id).slice(0, 5);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <User size={18} color="var(--accent)" /> Equipe Online
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
        {onlineMembers.map((m: any) => (
          <Link href={`/admin/users/${m.id}`} key={m.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <motion.div 
              whileHover={{ x: 4, background: 'rgba(255,255,255,0.05)' }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '12px', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'white' }}>
                  {m.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', background: '#22C55E', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</p>
                {m.statusMessage && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {m.statusMessage}
                  </p>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
