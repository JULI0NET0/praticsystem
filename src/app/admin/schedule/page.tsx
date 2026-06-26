"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Shield, ShieldOff, Trash2, X, CheckCircle2, Clock,
  Calendar as CalendarIcon, Info, Users, MapPin, ExternalLink, Edit2
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
import SearchInput from "@/components/ui/SearchInput";

const CATEGORIES = [
  { id: 'meeting', label: 'Reunião', color: '#3B82F6', icon: Users },
  { id: 'prospecting', label: 'Captação', color: '#EAB308', icon: MapPin },
  { id: 'task', label: 'Tarefa Interna', color: '#A8A8A8', icon: CheckCircle2 },
  { id: 'social_media', label: 'Social Media', color: '#EC4899', icon: ExternalLink },
  { id: 'ads', label: 'Tráfego Pago', color: '#8B5CF6', icon: ExternalLink },
  { id: 'launch', label: 'Lançamento', color: '#F97316', icon: ExternalLink },
  { id: 'payment', label: 'Pagamento', color: '#22C55E', icon: Clock },
];

const toLocalISOString = (dateInput: any) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

export default function SchedulePage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const calendarRef = useRef<any>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [isMobile, setIsMobile] = useState(false);
  const [popover, setPopover] = useState<{
    isOpen: boolean;
    type: 'details' | 'form';
    x: number;
    y: number;
  }>({
    isOpen: false,
    type: 'details',
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    date: toLocalISOString(new Date()),
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
    if (!currentUser) return;
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
        const [invoicesRes, clientsRes] = await Promise.all([
          supabase.from('invoices').select('*').order('due_date'),
          supabase.from('clients').select('id, name, nome_fantasia')
        ]);

        if (invoicesRes.error) throw invoicesRes.error;

        const localClients = clientsRes.data || [];

        if (invoicesRes.data) {
          invoiceEvents = invoicesRes.data.map(inv => {
            const client = localClients.find(c => c.id === inv.client_id);
            return {
              id: `inv-${inv.id}`,
              title: `Pagamento: ${client?.nome_fantasia || client?.name || 'Cliente'}`,
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
            };
          });
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
    } catch (err: any) {
      console.error("Erro ao buscar agenda:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        error: err
      });
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
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (arg.jsEvent && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      x = arg.jsEvent.clientX - rect.left;
      y = arg.jsEvent.clientY - rect.top;
    }

    const localString = toLocalISOString(arg.date);
    const dateVal = localString.endsWith('T00:00') ? localString.replace('T00:00', 'T10:00') : localString;

    setFormData({
      title: '',
      type: 'meeting',
      date: dateVal,
      client_id: '',
      visibility: 'public',
      status: 'scheduled',
      description: ''
    });
    setSelectedEvent(null);
    setPopover({
      isOpen: true,
      type: 'form',
      x,
      y
    });
  };

  const handleEventClick = (arg: any) => {
    const event = arg.event;
    setSelectedEvent(event);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (arg.jsEvent && pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      x = arg.jsEvent.clientX - rect.left;
      y = arg.jsEvent.clientY - rect.top;
    }

    setFormData({
      title: event.extendedProps.title || event.title,
      type: event.extendedProps.type,
      date: toLocalISOString(event.start),
      client_id: event.extendedProps.client_id || '',
      visibility: event.extendedProps.visibility || 'public',
      status: event.extendedProps.status || 'scheduled',
      description: event.extendedProps.description || ''
    });

    setPopover({
      isOpen: true,
      type: 'details',
      x,
      y
    });
  };

  const handleEventDrop = async (arg: any) => {
    const { event } = arg;
    if (event.id.startsWith('inv-')) {
      arg.revert();
      showToast("Não é possível mover faturas pelo calendário", "info");
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
        date: new Date(formData.date).toISOString(),
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

      setPopover(prev => ({ ...prev, isOpen: false }));
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
    try {
      const { error } = await supabase
        .from('agenda_events')
        .delete()
        .eq('id', selectedEvent.id);
      if (error) throw error;
      showToast("Compromisso excluído", "success");
      setPopover(prev => ({ ...prev, isOpen: false }));
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      showToast("Erro ao excluir", "error");
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

  const toggleEventCompleteById = async (eventId: string, currentStatus: string) => {
    if (eventId.startsWith('inv-')) return;
    const nextStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ status: nextStatus })
        .eq('id', eventId);
      if (error) throw error;
      fetchEvents();
      showToast(nextStatus === 'completed' ? "Concluído! 🎉" : "Marcado como pendente", "success");
    } catch (err) {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const type = eventInfo.event.extendedProps.type;
    const category = CATEGORIES.find(c => c.id === type);
    const color = category?.color || '#A8A8A8';
    const isCompleted = eventInfo.event.extendedProps.status === 'completed';

    if (eventInfo.event.allDay) {
      return (
        <div style={{
          backgroundColor: color,
          color: 'white',
          width: '100%',
          padding: '1px 8px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          opacity: isCompleted ? 0.5 : 1,
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {eventInfo.event.title}
        </div>
      );
    }

    const isInvoice = eventInfo.event.id.startsWith('inv-');

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        overflow: 'hidden',
        padding: '1px 4px',
        width: '100%',
        opacity: isCompleted ? 0.5 : 1,
      }}>
        {!isInvoice ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleEventCompleteById(eventInfo.event.id, eventInfo.event.extendedProps.status);
            }}
            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
            style={{
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              border: isCompleted ? 'none' : `1.5px solid ${color}`,
              backgroundColor: isCompleted ? color : 'transparent',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCompleted && <CheckCircle2 size={9} color="white" />}
          </span>
        ) : (
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }} />
        )}
        {eventInfo.timeText && (
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            fontWeight: 500,
          }}>
            {eventInfo.timeText}
          </span>
        )}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  const eventCountByType = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = events.filter(e => e.extendedProps?.type === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

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
    <div id="agenda-page-container" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', flexShrink: 0 }}>Agenda</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
          {CATEGORIES.map(cat => {
            const count = eventCountByType[cat.id] ?? 0;
            const isActive = activeFilters.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleFilter(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  background: isActive ? `${cat.color}20` : 'transparent',
                  border: `1px solid ${isActive ? cat.color : 'rgba(255,255,255,0.1)'}`,
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cat.color }} />
                <span style={{ fontSize: '0.72rem', color: isActive ? 'white' : 'var(--text-secondary)', fontWeight: 600 }}>{cat.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: '2px 5px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? cat.color : 'rgba(255,255,255,0.1)',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Pesquisar..."
          />
          <Spotlight as="button" className="btn btn-accent" onClick={(e?: any) => {
            let x = window.innerWidth / 2;
            let y = window.innerHeight / 2;
            if (e && e.clientX && pageRef.current) {
              const rect = pageRef.current.getBoundingClientRect();
              x = e.clientX - rect.left;
              y = e.clientY - rect.top;
            }
            setSelectedEvent(null);
            setFormData({
              title: '',
              type: 'meeting',
              date: toLocalISOString(new Date()),
              client_id: '',
              visibility: 'public',
              status: 'scheduled',
              description: ''
            });
            setPopover({
              isOpen: true,
              type: 'form',
              x,
              y
            });
          }} style={{ height: '36px' }}>
            <Plus size={16} /> Novo
          </Spotlight>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <div className="glass-card" style={{ padding: isMobile ? '8px 0' : '16px 0', backgroundColor: 'var(--bg-secondary)' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={isMobile ? "listDay" : "dayGridMonth"}
            headerToolbar={{
              left: 'prev,today,next',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            views={{
              timeGridWeek: {
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
            dayMaxEvents={2}
            weekends={true}
            fixedWeekCount={false}
            height="auto"
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            nowIndicator={true}
            allDaySlot={true}
            slotMinTime="07:00"
            slotMaxTime="22:00"
          />
        </div>
      </div>

      <AnimatePresence>
        {popover.isOpen && (() => {
          const popoverWidth = 380;
          const isMobilePopover = isMobile;
          
          let popStyle: React.CSSProperties = isMobilePopover ? {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            zIndex: 1000,
          } : (() => {
            const containerWidth = pageRef.current ? pageRef.current.clientWidth : window.innerWidth;
            const containerHeight = pageRef.current ? pageRef.current.clientHeight : window.innerHeight;
            
            const popoverHeight = popover.type === 'form' ? 480 : 380; 

            let left = popover.x + 15;
            let top = popover.y + 15;
            
            // Se o popover for cortar na direita, abre para a esquerda do clique
            if (left + popoverWidth > containerWidth) {
              left = popover.x - popoverWidth - 15;
            }
            
            // Se o popover for cortar embaixo, abre para cima do clique
            if (top + popoverHeight > containerHeight) {
              top = popover.y - popoverHeight - 15;
            }
            
            if (left < 12) left = 12;
            if (top < 12) top = 12;
            
            return {
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${popoverWidth}px`,
              zIndex: 1000,
            };
          })();

          return (
            <>
              <div 
                onClick={() => { setPopover(prev => ({ ...prev, isOpen: false })); setSelectedEvent(null); }} 
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999,
                  backgroundColor: isMobilePopover ? 'rgba(0,0,0,0.6)' : 'transparent',
                  backdropFilter: isMobilePopover ? 'blur(4px)' : 'none',
                }} 
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="glass-card agenda-popover"
                style={{ 
                  padding: '24px', 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.45), 0 0 1px rgba(255,255,255,0.15)',
                  ...popStyle 
                }}
              >
                {popover.type === 'details' && selectedEvent ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{
                        padding: '10px',
                        borderRadius: '12px',
                        backgroundColor: `${CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color}15`,
                        color: CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color,
                      }}>
                        {(() => {
                          const Icon = CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.icon || Info;
                          return <Icon size={20} />;
                        })()}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {selectedEvent.id.startsWith('inv-') && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '20px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            backgroundColor: selectedEvent.extendedProps.status === 'paid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: selectedEvent.extendedProps.status === 'paid' ? '#22C55E' : '#EF4444',
                            border: `1px solid ${selectedEvent.extendedProps.status === 'paid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {selectedEvent.extendedProps.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                          </span>
                        )}
                        <button onClick={() => { setPopover(prev => ({ ...prev, isOpen: false })); setSelectedEvent(null); }} style={{ color: 'var(--text-tertiary)', padding: '2px' }}><X size={18} /></button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{selectedEvent.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                      {CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.label}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                        <CalendarIcon size={16} />
                        <span style={{ fontSize: '0.85rem' }}>{selectedEvent.start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>
                      {!selectedEvent.allDay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                          <Clock size={16} />
                          <span style={{ fontSize: '0.85rem' }}>
                            {selectedEvent.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {selectedEvent.end && ` - ${selectedEvent.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>
                      )}
                      {selectedEvent.extendedProps.client_id && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                          <Users size={16} />
                          <span style={{ fontSize: '0.85rem' }}>{clients.find(c => c.id === selectedEvent.extendedProps.client_id)?.nome_fantasia || 'Cliente Vinculado'}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                        {selectedEvent.extendedProps.visibility === 'public' ? <Shield size={16} color="#22C55E" /> : <ShieldOff size={16} color="#EF4444" />}
                        <span style={{ fontSize: '0.85rem' }}>{selectedEvent.extendedProps.visibility === 'public' ? 'Visível para todos' : 'Apenas para mim'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                        {selectedEvent.extendedProps.status === 'completed' ? <CheckCircle2 size={16} color="#22C55E" /> : <Clock size={16} color="#EAB308" />}
                        <span style={{ fontSize: '0.85rem' }}>{selectedEvent.extendedProps.status === 'completed' ? 'Concluído' : 'Agendado'}</span>
                      </div>
                    </div>

                    {selectedEvent.extendedProps.description && (
                      <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--card-inner-bg)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedEvent.extendedProps.description}</p>
                      </div>
                    )}

                    {!selectedEvent.id.startsWith('inv-') && (
                      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <button
                          onClick={handleToggleComplete}
                          className="btn btn-secondary"
                          style={{ flex: 1, height: '36px', fontSize: '0.8rem' }}
                        >
                          {formData.status === 'completed' ? 'Pendente' : 'Concluir'}
                        </button>
                        <button
                          onClick={() => setPopover(prev => ({ ...prev, type: 'form' }))}
                          className="btn btn-secondary"
                          style={{ padding: '8px', height: '36px' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={handleDeleteEvent}
                          className="btn btn-secondary"
                          style={{ padding: '8px', color: '#EF4444', height: '36px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedEvent ? 'Editar' : 'Novo'} Compromisso</h2>
                      <button onClick={() => { setPopover(prev => ({ ...prev, isOpen: false })); setSelectedEvent(null); }} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Título</label>
                        <input type="text" className="input-dark" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Reunião de Alinhamento..." style={{ fontSize: '0.85rem', padding: '10px' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tipo</label>
                          <select className="input-dark" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ fontSize: '0.85rem', padding: '10px' }}>
                            {CATEGORIES.filter(c => c.id !== 'payment').map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Data e Hora</label>
                          <input type="datetime-local" className="input-dark" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ fontSize: '0.85rem', padding: '10px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente (Opcional)</label>
                        <select className="input-dark" value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })} style={{ fontSize: '0.85rem', padding: '10px' }}>
                          <option value="">Nenhum</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.nome_fantasia || c.name}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Observações</label>
                        <textarea
                          className="input-dark"
                          rows={3}
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Adicione detalhes extras..."
                          style={{ fontSize: '0.85rem', padding: '10px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => setFormData({ ...formData, visibility: formData.visibility === 'public' ? 'private' : 'public' })}>
                          {formData.visibility === 'public' ? <Shield size={18} color="#22C55E" /> : <ShieldOff size={18} color="#EF4444" />}
                          <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formData.visibility === 'public' ? 'Público' : 'Privado'}</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{formData.visibility === 'public' ? 'Visível para todos' : 'Apenas para mim'}</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, height: '36px', fontSize: '0.8rem' }} onClick={() => { setPopover(prev => ({ ...prev, isOpen: false })); setSelectedEvent(null); }}>Cancelar</button>
                        <button className="btn btn-accent" style={{ flex: 1, height: '36px', fontSize: '0.8rem' }} onClick={handleSaveEvent} disabled={loading}>
                          {loading ? 'Salvando...' : selectedEvent ? 'Atualizar' : 'Criar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      <style jsx global>{`
        @media (min-width: 769px) {
          #agenda-page-container {
            height: calc(100vh - 160px) !important;
          }
          .fc {
            height: 100% !important;
          }
          .fc-view-harness {
            flex: 1 !important;
            height: 100% !important;
          }
        }
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
          box-shadow: none !important;
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
        .fc-header-toolbar {
          padding: 0 16px !important;
        }
        @media (max-width: 768px) {
          .fc-header-toolbar {
            padding: 0 8px !important;
          }
        }
        .admin-content-area {
          padding: 24px 12px calc(12px + 60px) !important;
        }
        .admin-content-area > div {
          max-width: 100% !important;
        }
        @media (max-width: 768px) {
          .admin-content-area {
            padding: 12px 6px calc(var(--mobile-nav-height) + 20px) !important;
          }
        }
        .agenda-popover {
          background: rgba(20, 20, 20, 0.97) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        [data-theme='light'] .agenda-popover {
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(0, 0, 0, 0.12) !important;
        }
        .fc-daygrid-day {
          position: relative !important;
          overflow: hidden !important;
        }
        .fc-daygrid-day-frame {
          position: absolute !important;
          inset: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .fc-daygrid-day-events {
          min-height: 0 !important;
        }
        .fc-daygrid-more-link {
          font-size: 0.68rem !important;
          font-weight: 700 !important;
          color: var(--text-secondary) !important;
          padding: 1px 8px !important;
          border-radius: 5px !important;
          background: rgba(255,255,255,0.05) !important;
          margin-top: 1px !important;
          display: block !important;
          text-decoration: none !important;
        }
        .fc-daygrid-more-link:hover {
          background: rgba(255,255,255,0.1) !important;
          color: var(--text-primary) !important;
        }
        [data-theme='light'] .fc-daygrid-more-link {
          background: rgba(0,0,0,0.05) !important;
        }
        [data-theme='light'] .fc-daygrid-more-link:hover {
          background: rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}
