"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Plus, Loader2, Shield, ShieldOff, Trash2, X, CheckCircle2, Clock, 
  Calendar as CalendarIcon, Filter, Info, Users, MapPin, ExternalLink,
  ChevronLeft, ChevronRight, Search, LayoutGrid, List, Edit2, Share2
} from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { motion, AnimatePresence } from "framer-motion";
import Spotlight from "@/components/Spotlight";

const CATEGORIES = [
  { id: 'meeting', label: 'Reunião', color: '#3B82F6', icon: Users },
  { id: 'prospecting', label: 'Captação', color: '#EAB308', icon: MapPin },
  { id: 'task', label: 'Tarefa Interna', color: '#A8A8A8', icon: CheckCircle2 },
  { id: 'social_media', label: 'Social Media', color: '#EC4899', icon: ExternalLink },
  { id: 'ads', label: 'Tráfego Pago', color: '#8B5CF6', icon: ExternalLink },
  { id: 'launch', label: 'Lançamento', color: '#F97316', icon: ExternalLink },
  { id: 'payment', label: 'Pagamento', color: '#22C55E', icon: Clock },
];

export default function SchedulePage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const calendarRef = useRef<any>(null);
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    date: new Date().toISOString().slice(0, 16),
    client_id: '',
    visibility: 'public',
    status: 'scheduled',
    description: ''
  });

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id, name, nome_fantasia').order('name');
    if (data) setClients(data);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('agenda_events').select('*');
      
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'board') {
        query = query.or(`visibility.eq.public,assigned_to.eq.${currentUser?.id}`);
      }
      
      const { data: agendaEvents, error: agendaError } = await query;
      if (agendaError) throw agendaError;

      let invoiceEvents: any[] = [];
      if (currentUser?.role === 'admin' || currentUser?.role === 'board') {
        const { data: invoices, error: invoiceError } = await supabase
          .from('invoices')
          .select('*, clients(name, nome_fantasia)')
          .order('due_date');
        
        if (invoiceError) throw invoiceError;
        
        if (invoices) {
          invoiceEvents = invoices.map(inv => ({
            id: `inv-${inv.id}`,
            title: `Pagamento: ${inv.clients?.nome_fantasia || inv.clients?.name || 'Cliente'}`,
            start: inv.due_date,
            allDay: true,
            type: 'payment',
            color: '#22C55E',
            extendedProps: {
              amount: inv.amount,
              status: inv.status,
              invoice_id: inv.id,
              type: 'payment'
            }
          }));
        }
      }

      const formattedAgendaEvents = (agendaEvents || []).map(event => ({
        id: event.id,
        title: event.title,
        start: event.date,
        type: event.type,
        color: CATEGORIES.find(c => c.id === event.type)?.color || '#A8A8A8',
        extendedProps: { ...event },
        className: event.status === 'completed' ? 'event-completed' : ''
      }));

      const allEvents = [...formattedAgendaEvents, ...invoiceEvents];
      setEvents(allEvents);
    } catch (err) {
      console.error("Erro ao buscar agenda:", err);
      showToast("Erro ao carregar agenda", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    fetchEvents();
    fetchClients();
  }, [fetchEvents, fetchClients]);

  const handleDateClick = (arg: any) => {
    setFormData({
      title: '',
      type: 'meeting',
      date: arg.dateStr.includes('T') ? arg.dateStr : `${arg.dateStr}T10:00`,
      client_id: '',
      visibility: 'public',
      status: 'scheduled',
      description: ''
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const event = arg.event;
    setSelectedEvent(event);
    
    setFormData({
      title: event.extendedProps.title || event.title,
      type: event.extendedProps.type,
      date: new Date(event.start).toISOString().slice(0, 16),
      client_id: event.extendedProps.client_id || '',
      visibility: event.extendedProps.visibility || 'public',
      status: event.extendedProps.status || 'scheduled',
      description: event.extendedProps.description || ''
    });
  };

  const handleEventDrop = async (arg: any) => {
    const { event } = arg;
    if (event.id.startsWith('inv-')) {
      arg.revert();
      showToast("Não é possível mover faturas pelo calendário", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ date: event.start.toISOString() })
        .eq('id', event.id);

      if (error) throw error;
      showToast("Compromisso reagendado!", "success");
      fetchEvents();
    } catch (err) {
      console.error("Erro ao mover evento:", err);
      arg.revert();
      showToast("Erro ao reagendar", "error");
    }
  };

  const syncToGoogleCalendar = async (event: any, action: 'insert' | 'update' | 'delete') => {
    console.log(`[Google Sync] ${action.toUpperCase()}:`, event.title);
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleSaveEvent = async () => {
    if (!formData.title) {
      showToast("Título é obrigatório", "error");
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        client_id: formData.client_id || null,
        visibility: formData.visibility,
        status: formData.status,
        description: formData.description,
        assigned_to: currentUser?.id
      };

      let error;
      if (selectedEvent && !selectedEvent.id.startsWith('inv-')) {
        const { error: updateError } = await supabase
          .from('agenda_events')
          .update(eventData)
          .eq('id', selectedEvent.id);
        error = updateError;
        if (!error) showToast("Compromisso atualizado!", "success");
      } else {
        const { error: insertError } = await supabase
          .from('agenda_events')
          .insert([eventData]);
        error = insertError;
        if (!error) showToast("Compromisso criado!", "success");
      }

      if (error) throw error;

      if (formData.visibility === 'public') {
        await syncToGoogleCalendar(eventData, selectedEvent ? 'update' : 'insert');
      }

      setIsModalOpen(false);
      fetchEvents();
      setSelectedEvent(null);
    } catch (err: any) {
      console.error("Erro ao salvar evento:", err);
      showToast(err.message || "Erro ao salvar compromisso", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.id.startsWith('inv-')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('agenda_events')
        .delete()
        .eq('id', selectedEvent.id);
      if (error) throw error;
      showToast("Compromisso excluído", "success");
      setIsModalOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      showToast("Erro ao excluir", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!selectedEvent || selectedEvent.id.startsWith('inv-')) return;
    const nextStatus = formData.status === 'completed' ? 'scheduled' : 'completed';
    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ status: nextStatus })
        .eq('id', selectedEvent.id);
      if (error) throw error;
      setFormData({ ...formData, status: nextStatus });
      fetchEvents();
      showToast(nextStatus === 'completed' ? "Concluído! 🎉" : "Marcado como pendente", "success");
    } catch (err) {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const type = eventInfo.event.extendedProps.type;
    const category = CATEGORIES.find(c => c.id === type);
    const Icon = category?.icon || Info;
    
    return (
      <div className="fc-event-premium" style={{ backgroundColor: `${category?.color}20`, color: category?.color, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon size={12} />
          <span style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {eventInfo.event.title}
          </span>
        </div>
        {!eventInfo.event.allDay && (
          <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '2px' }}>
            {eventInfo.timeText}
          </div>
        )}
      </div>
    );
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    activeFilters.includes(e.extendedProps.type)
  );

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Agenda</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => toggleFilter(cat.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: activeFilters.includes(cat.id) ? `${cat.color}20` : 'transparent',
                  border: `1px solid ${activeFilters.includes(cat.id) ? cat.color : 'rgba(255,255,255,0.1)'}`,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                <span style={{ fontSize: '0.75rem', color: activeFilters.includes(cat.id) ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="input-dark" 
              style={{ paddingLeft: '40px', width: '250px', height: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Spotlight as="button" className="btn btn-accent" onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }} style={{ height: '40px' }}>
            <Plus size={18} /> Novo
          </Spotlight>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="glass-card" style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? "listDay" : "dayGridMonth"}
            headerToolbar={{
              left: 'prev,today,next',
              center: 'title',
              right: isMobile ? 'dayGridMonth,dayGridWeek,listWeek' : 'dayGridMonth,dayGridWeek,listWeek'
            }}
            views={{
              dayGridWeek: {
                dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true }
              },
              dayGridMonth: {
                dayHeaderFormat: { weekday: 'short', omitCommas: true }
              }
            }}
            dayHeaderFormat={{ weekday: 'short', day: 'numeric', omitCommas: true }}
            buttonText={{
              today: 'Hoje',
              month: 'Mês',
              week: 'Semana',
              day: 'Dia',
              list: 'Lista'
            }}
            locale={ptBrLocale}
            events={filteredEvents}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            height="auto"
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            nowIndicator={true}
            allDaySlot={false}
          />
        </div>

        <div className="agenda-sidebar">
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card"
                style={{ padding: '24px', position: 'sticky', top: '24px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div style={{ 
                    padding: '12px', 
                    borderRadius: '16px', 
                    backgroundColor: `${CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color}15`,
                    color: CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color,
                    boxShadow: `0 8px 16px ${CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color}10`
                  }}>
                    {(() => {
                      const Icon = CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.icon || Info;
                      return <Icon size={28} />;
                    })()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedEvent.id.startsWith('inv-') && (
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700,
                        backgroundColor: selectedEvent.extendedProps.status === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: selectedEvent.extendedProps.status === 'paid' ? '#22C55E' : '#EF4444',
                        border: `1px solid ${selectedEvent.extendedProps.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                      }}>
                        {selectedEvent.extendedProps.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                      </span>
                    )}
                    <button onClick={() => setSelectedEvent(null)} style={{ color: 'var(--text-tertiary)', padding: '4px' }}><X size={20} /></button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{selectedEvent.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                  {CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.label}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                    <CalendarIcon size={18} />
                    <span style={{ fontSize: '0.9rem' }}>{selectedEvent.start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </div>
                  {!selectedEvent.allDay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                      <Clock size={18} />
                      <span style={{ fontSize: '0.9rem' }}>
                        {selectedEvent.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {selectedEvent.end && ` - ${selectedEvent.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                  {selectedEvent.extendedProps.client_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                      <Users size={18} />
                      <span style={{ fontSize: '0.9rem' }}>{clients.find(c => c.id === selectedEvent.extendedProps.client_id)?.nome_fantasia || 'Cliente Vinculado'}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                    {selectedEvent.extendedProps.visibility === 'public' ? <Shield size={18} color="#22C55E" /> : <ShieldOff size={18} color="#EF4444" />}
                    <span style={{ fontSize: '0.9rem' }}>{selectedEvent.extendedProps.visibility === 'public' ? 'Visível para todos' : 'Apenas para mim'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                    {selectedEvent.extendedProps.status === 'completed' ? <CheckCircle2 size={18} color="#22C55E" /> : <Clock size={18} color="#EAB308" />}
                    <span style={{ fontSize: '0.9rem' }}>{selectedEvent.extendedProps.status === 'completed' ? 'Concluído' : 'Agendado'}</span>
                  </div>
                </div>

                {selectedEvent.extendedProps.description && (
                  <div style={{ marginTop: '24px', padding: '16px', background: 'var(--card-inner-bg)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedEvent.extendedProps.description}</p>
                  </div>
                )}

                {!selectedEvent.id.startsWith('inv-') && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button 
                      onClick={handleToggleComplete}
                      className="btn btn-secondary" 
                      style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
                    >
                      {formData.status === 'completed' ? 'Pendente' : 'Concluir'}
                    </button>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="btn btn-secondary" 
                      style={{ padding: '8px' }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={handleDeleteEvent}
                      className="btn btn-secondary" 
                      style={{ padding: '8px', color: '#EF4444' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card"
                style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '300px' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--card-inner-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <CalendarIcon size={32} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>Nenhum selecionado</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecione um compromisso para ver os detalhes completos.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedEvent ? 'Editar' : 'Novo'} Compromisso</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)' }}><X size={24} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Título</label>
                  <input type="text" className="input-dark" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Reunião de Alinhamento..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tipo</label>
                    <select className="input-dark" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      {CATEGORIES.filter(c => c.id !== 'payment').map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Data e Hora</label>
                    <input type="datetime-local" className="input-dark" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cliente (Opcional)</label>
                  <select className="input-dark" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                    <option value="">Nenhum</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Observações</label>
                  <textarea 
                    className="input-dark" 
                    rows={3} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Adicione detalhes extras..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => setFormData({...formData, visibility: formData.visibility === 'public' ? 'private' : 'public'})}>
                    {formData.visibility === 'public' ? <Shield size={20} color="#22C55E" /> : <ShieldOff size={20} color="#EF4444" />}
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formData.visibility === 'public' ? 'Público' : 'Privado'}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{formData.visibility === 'public' ? 'Visível para todos' : 'Apenas para mim'}</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSaveEvent} disabled={loading}>
                    {loading ? 'Salvando...' : selectedEvent ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(255, 255, 255, 0.05);
          --fc-daygrid-event-dot-width: 8px;
          --fc-neutral-bg-color: transparent;
          --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.02);
          font-family: 'Outfit', sans-serif;
        }
        .fc-view-harness {
          background: transparent !important;
        }
        .fc-scrollgrid {
          border: none !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        .fc-header-toolbar {
          margin-bottom: 24px !important;
        }
        .fc-button-primary {
          background-color: var(--card-inner-bg) !important;
          border-color: var(--border) !important;
          color: var(--text-primary) !important;
          font-weight: 600 !important;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          text-transform: capitalize !important;
          transition: all 0.2s !important;
        }
        .fc-button-primary:hover {
          background-color: var(--accent) !important;
          border-color: var(--accent) !important;
        }
        .fc-button-active {
          background-color: var(--accent) !important;
          border-color: var(--accent) !important;
          color: white !important;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--border) !important;
          background: transparent !important;
        }
        .fc-scrollgrid {
          border-color: var(--border) !important;
          background: transparent !important;
        }
        .fc-col-header-cell {
          padding: 16px 0 !important;
          background: rgba(255, 255, 255, 0.02) !important;
          border: none !important;
        }
        .fc-col-header-cell-cushion {
          color: var(--text-tertiary) !important;
          font-size: 0.7rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em;
          text-decoration: none !important;
        }
        .fc-daygrid-day-number {
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          padding: 8px !important;
          color: var(--text-secondary) !important;
        }
        .fc-toolbar-title {
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: var(--text-primary);
        }
        .fc-event {
          background: transparent !important;
          border: none !important;
        }
        .event-completed {
          opacity: 0.5;
        }
        .event-completed .fc-event-premium {
          text-decoration: line-through;
        }
        .fc-day-today {
          background: rgba(217, 72, 15, 0.08) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          color: white !important;
          background: var(--accent) !important;
          border-radius: 8px !important;
          font-weight: 700;
        }
        .fc-list-event:hover td {
          background: rgba(255,255,255,0.02) !important;
        }
        .fc-list-day-cushion {
          background: rgba(255,255,255,0.03) !important;
        }
        @media (max-width: 768px) {
          .agenda-layout {
            grid-template-columns: 1fr;
          }
          .fc-header-toolbar {
            flex-direction: column;
            gap: 12px;
          }
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
