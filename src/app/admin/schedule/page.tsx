"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Shield, ShieldOff, Trash2, X, CheckCircle2, Clock,
  Calendar as CalendarIcon, Info, Users, UserCircle2, Link2, Edit2,
  RefreshCw, Check, AlertCircle, Sparkles
} from "lucide-react";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { motion, AnimatePresence } from "framer-motion";
import Spotlight from "@/components/Spotlight";
import SearchInput from "@/components/ui/SearchInput";
import { GoogleIcon } from "@/components/SocialIcons";
import { tint } from "@/lib/tint";
import { computePosition, flip, shift, offset, size } from "@floating-ui/dom";
import { AGENDA_CATEGORIES as CATEGORIES } from "@/lib/agendaCategories";
import Combobox from "@/components/ui/Combobox";
import { UserAvatar } from "@/components/demandas/AssigneePicker";
import { playSound } from "@/utils/audio";

const toLocalISOString = (dateInput: any) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

const CALENDAR_VIEW_STORAGE_KEY = "pratic-agenda-view";

function readStoredCalendarView(isMobileGuess: boolean): string {
  try {
    const stored = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage indisponível (janela privada, site data bloqueado)
  }
  return isMobileGuess ? "listDay" : "dayGridMonth";
}

export default function SchedulePage() {
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const calendarRef = useRef<any>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(CATEGORIES.map(c => c.id));
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [calendarView] = useState(() => readStoredCalendarView(window.innerWidth < 768));
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{
    oauthReady: boolean;
    accounts: {
      agenciapratic: { configured: boolean; email: string };
      praticlabs: { configured: boolean; email: string };
    };
  } | null>(null);
  // x/y são coordenadas de VIEWPORT (clientX/clientY), coerentes com o
  // `position: fixed` do popover. Antes eram relativas ao container
  // (clientX - rect.left) e aplicadas como fixed — a defasagem da
  // sidebar era o que jogava o popover para fora da tela na sexta.
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

  const popoverRef = useRef<HTMLDivElement | null>(null);
  // Começa no ponto do clique: mesmo antes do floating-ui responder, a
  // posição já é aproximadamente certa. Não uso opacity para esconder
  // porque o framer-motion anima opacity neste mesmo elemento e
  // sobrescreveria o valor.
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
  });

  // Posicionamento via floating-ui: flip resolve a borda direita,
  // shift mantém dentro da viewport e size limita a altura ao espaço
  // disponível (antes a altura era um chute de 480/380px).
  // useLayoutEffect: posiciona antes da pintura, sem flash.
  useLayoutEffect(() => {
    if (!popover.isOpen || isMobile) return;
    const el = popoverRef.current;
    if (!el) return;

    const virtualEl = {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: popover.x,
        y: popover.y,
        top: popover.y,
        left: popover.x,
        right: popover.x,
        bottom: popover.y,
      }),
    };

    let cancelled = false;
    computePosition(virtualEl, el, {
      strategy: 'fixed',
      placement: 'right-start',
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ['left-start', 'right-end', 'left-end'] }),
        shift({ padding: 12 }),
        size({
          padding: 12,
          apply({ availableHeight, elements }) {
            elements.floating.style.maxHeight = `${Math.max(240, availableHeight)}px`;
            elements.floating.style.overflowY = 'auto';
          },
        }),
      ],
    }).then(({ x, y }) => {
      if (cancelled) return;
      setPopStyle({ position: 'fixed', left: x, top: y });
    });

    return () => { cancelled = true; };
  }, [popover.isOpen, popover.x, popover.y, popover.type, isMobile]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'meeting',
    date: toLocalISOString(new Date()),
    client_id: '',
    visibility: 'public',
    status: 'scheduled',
    description: ''
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id, name, nome_fantasia, status').order('name');
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
              color: 'var(--color-success)',
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
        color: CATEGORIES.find(c => c.id === event.type)?.color || 'var(--color-text-secondary)',
        extendedProps: { ...event },
        className: event.status === 'completed' ? 'event-completed' : '',
        // Evento-espelho de uma demanda: só é editável por lá, não pelo
        // calendário (evita reconciliar edições concorrentes).
        editable: !event.demand_id,
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

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agenda/google-sync');
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch (err) {
      console.error('Erro ao verificar status do Google Agenda:', err);
    }
  }, []);

  const handlePullFromGoogle = useCallback(async (silentOption: boolean | unknown = false) => {
    const silent = typeof silentOption === 'boolean' ? silentOption : false;
    try {
      if (!silent) setIsSyncingGoogle(true);
      const res = await fetch('/api/agenda/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', account: 'agenciapratic' }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (!silent && (data.accountNotConfigured || data.error?.includes('não configurada'))) {
          setShowGoogleModal(true);
        }
        if (!silent) throw new Error(data.error || 'Erro ao sincronizar com o Google Agenda');
        return;
      }

      const totalChanges = (data.inserted || 0) + (data.updated || 0) + (data.deleted || 0);
      if (totalChanges > 0) {
        showToast(
          `Sincronizado com Google! ${data.inserted} novos, ${data.updated} atualizados.`,
          'success'
        );
        await fetchEvents();
      } else if (!silent) {
        showToast('Agenda já sincronizada com agenciapratic@gmail.com!', 'success');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na sincronização';
      console.error('Erro na sincronização:', err);
      if (!silent) {
        showToast(errorMsg, 'error');
      }
    } finally {
      if (!silent) setIsSyncingGoogle(false);
    }
  }, [fetchEvents, showToast]);

  useEffect(() => {
    fetchEvents();
    fetchClients();
    fetchGoogleStatus();
    handlePullFromGoogle(true);

    const handleFocus = () => {
      handlePullFromGoogle(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchEvents, fetchClients, fetchGoogleStatus, handlePullFromGoogle]);


  const handleDateClick = (arg: any) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (arg.jsEvent && pageRef.current) {
      x = arg.jsEvent.clientX;
      y = arg.jsEvent.clientY;
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
      x = arg.jsEvent.clientX;
      y = arg.jsEvent.clientY;
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
    if (event.extendedProps?.demand_id) {
      arg.revert();
      showToast("Este compromisso vem de uma demanda — edite a data por lá", "info");
      return;
    }

    try {
      const newDate = event.start.toISOString();
      const { error } = await supabase
        .from('agenda_events')
        .update({ date: newDate })
        .eq('id', event.id);

      if (error) throw error;
      showToast("Compromisso reagendado!", "success");
      fetchEvents();

      // Sincroniza a nova data com o Google Calendar se for visível
      if (event.extendedProps?.visibility !== 'private') {
        await syncToGoogleCalendar(event.id, 'update', {
          title: event.title,
          type: event.extendedProps?.type || 'meeting',
          date: newDate,
          description: event.extendedProps?.description || '',
        });
      }
    } catch (err: any) {
      console.error("Erro ao mover evento:", err);
      arg.revert();
      showToast(err?.message || "Erro ao reagendar", "error");
    }
  };

  const syncToGoogleCalendar = async (
    eventId: string,
    action: 'insert' | 'update' | 'delete',
    data?: { title: string; type: string; date: string; description?: string }
  ) => {
    try {
      const res = await fetch('/api/agenda/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action, ...data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar com Google Agenda:', err);
      showToast(err?.message ? `Google Agenda: ${err.message}` : 'Falha ao sincronizar com Google Agenda', 'info');
    }
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
      let savedEventId = selectedEvent && !selectedEvent.id.startsWith('inv-') ? selectedEvent.id : undefined;
      if (selectedEvent && !selectedEvent.id.startsWith('inv-')) {
        const { error: updateError } = await supabase
          .from('agenda_events')
          .update(eventData)
          .eq('id', selectedEvent.id);
        error = updateError;
        if (!error) showToast("Compromisso atualizado!", "success");
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('agenda_events')
          .insert([eventData])
          .select('id')
          .single();
        error = insertError;
        savedEventId = inserted?.id;
        if (!error) showToast("Compromisso criado!", "success");
      }

      if (error) throw error;

      if (formData.status === 'completed' && (!selectedEvent || selectedEvent.extendedProps?.status !== 'completed')) {
        playSound('task_done');
      }

      if (formData.visibility === 'public' && savedEventId) {
        await syncToGoogleCalendar(savedEventId, selectedEvent ? 'update' : 'insert', {
          title: eventData.title,
          type: eventData.type,
          date: eventData.date,
          description: eventData.description,
        });
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
    if (selectedEvent.extendedProps?.demand_id) return;
    try {
      await syncToGoogleCalendar(selectedEvent.id, 'delete');
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
    if (selectedEvent.extendedProps?.demand_id) return;
    const nextStatus = formData.status === 'completed' ? 'scheduled' : 'completed';
    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ status: nextStatus })
        .eq('id', selectedEvent.id);
      if (error) throw error;
      if (nextStatus === 'completed') {
        playSound("task_done");
      }
      setFormData({ ...formData, status: nextStatus });
      fetchEvents();
      showToast(nextStatus === 'completed' ? "Concluído! 🎉" : "Marcado como pendente", "success");
    } catch (err) {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const toggleEventCompleteById = async (eventId: string, currentStatus: string, isDemandLinked?: boolean) => {
    if (eventId.startsWith('inv-') || isDemandLinked) return;
    const nextStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ status: nextStatus })
        .eq('id', eventId);
      if (error) throw error;
      if (nextStatus === 'completed') {
        playSound("task_done");
      }
      fetchEvents();
      showToast(nextStatus === 'completed' ? "Concluído! 🎉" : "Marcado como pendente", "success");
    } catch (err) {
      showToast("Erro ao atualizar status", "error");
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const type = eventInfo.event.extendedProps.type;
    const category = CATEGORIES.find(c => c.id === type);
    const color = category?.color || 'var(--color-text-secondary)';
    const isCompleted = eventInfo.event.extendedProps.status === 'completed';

    if (eventInfo.event.allDay) {
      return (
        <div style={{
          backgroundColor: color,
          color: 'var(--color-text-primary)',
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
    const isDemandLinked = Boolean(eventInfo.event.extendedProps?.demand_id);

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
        {!isInvoice && !isDemandLinked ? (
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
        {eventInfo.event.extendedProps?.google_event_id && (
          <span
            title="Sincronizado com Google Agenda"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: 0.85,
            }}
          >
            <GoogleIcon size={11} />
          </span>
        )}
        {isDemandLinked && (
          <span
            title="Vem de uma demanda"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: 0.7,
              color: 'var(--text-secondary)',
            }}
          >
            <Link2 size={11} />
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

  const userOptions = useMemo(
    () =>
      users.map((user) => {
        const handle = user.username ? `@${user.username}` : (user.name || user.email);
        return {
          value: user.id,
          label: handle,
          description: user.name && user.username ? user.name : undefined,
          keywords: `${user.username || ""} ${user.name || ""} ${user.email || ""}`.trim(),
          icon: (
            <UserAvatar name={handle} avatarUrl={user.avatar_url ?? user.avatarUrl} size={20} ring={false} />
          ),
        };
      }),
    [users],
  );

  const eventCountByType = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = events.filter(e => e.extendedProps?.type === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    activeFilters.includes(e.extendedProps.type) &&
    (!responsibleFilter || e.extendedProps?.assigned_to === responsibleFilter)
  );

  const toggleFilter = (id: string) => {
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div id="agenda-page-container" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      <div className="glass-card" style={{ padding: isMobile ? '8px 0' : '16px 0', backgroundColor: 'var(--bg-secondary)' }}>
        {/* Cabeçalho em duas linhas: título em cima, tags + ações
            embaixo. Antes era uma row só, e o `flex: 1` do bloco de
            tags com wrap empurrava as categorias para 3 linhas ao lado
            do título. */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          padding: isMobile ? '0 12px 14px' : '0 20px 16px',
          borderBottom: '1px solid var(--color-border-subtle)',
          marginBottom: isMobile ? '10px' : '14px',
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 1.85rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}>
              Agenda
            </h1>
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              margin: '3px 0 0',
            }}>
              Compromissos, reuniões e eventos sincronizados
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            <div style={{ width: isMobile ? '100%' : '260px' }}>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Pesquisar compromisso..."
              />
            </div>
            <button
              onClick={handlePullFromGoogle}
              disabled={isSyncingGoogle}
              className="btn btn-secondary"
              style={{
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '0 12px',
                cursor: isSyncingGoogle ? 'not-allowed' : 'pointer',
              }}
              title="Sincronizar compromissos com agenciapratic@gmail.com"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isSyncingGoogle ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span>{isSyncingGoogle ? 'Sincronizando...' : isMobile ? 'Google' : 'Sincronizar'}</span>
            </button>
            <button
              onClick={() => setShowGoogleModal(true)}
              className="btn btn-secondary"
              style={{
                height: '38px',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Status da Integração com Google Agenda"
            >
              <GoogleIcon size={15} />
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: googleStatus?.accounts?.agenciapratic?.configured ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              />
            </button>
            <Spotlight as="button" className="btn btn-accent" onClick={(e?: any) => {
              let x = window.innerWidth / 2;
              let y = window.innerHeight / 2;
              if (e && e.clientX && pageRef.current) {
                x = e.clientX;
                y = e.clientY;
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
            }} style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px' }}>
              <Plus size={16} /> Novo
            </Spotlight>
          </div>
        </div>

        {/* Barra de Filtros por Assunto */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: isMobile ? '0 12px 10px' : '0 20px 12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginRight: '2px',
            }}>
              Assuntos:
            </span>
            {CATEGORIES.map(cat => {
              const count = eventCountByType[cat.id] ?? 0;
              const isActive = activeFilters.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleFilter(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: isActive ? tint(cat.color, 14) : 'var(--color-surface-sunken)',
                    border: `1px solid ${isActive ? cat.color : 'var(--color-border-subtle)'}`,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    opacity: isActive ? 1 : 0.6,
                  }}
                  title={`Filtrar por ${cat.label}`}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: isActive ? 600 : 500,
                  }}>
                    {cat.label}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      lineHeight: 1,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? cat.color : 'var(--color-border-subtle)',
                      color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
            {users.length > 0 && (
              <Combobox
                value={responsibleFilter}
                onChange={setResponsibleFilter}
                options={userOptions}
                ariaLabel="Filtrar por responsável"
                searchPlaceholder="Buscar pessoa…"
                clearOption={{ label: "Responsável", icon: <UserCircle2 size={14} /> }}
              />
            )}
            {currentUser && (
              <button
                type="button"
                onClick={() => setResponsibleFilter(prev => prev === currentUser.id ? null : currentUser.id)}
                className="btn btn-secondary"
                data-active={responsibleFilter === currentUser.id || undefined}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: responsibleFilter === currentUser.id ? 'var(--color-terracotta)' : undefined,
                }}
                title="Mostrar só os meus compromissos"
              >
                <UserCircle2 size={13} /> Minhas
              </button>
            )}

            {activeFilters.length < CATEGORIES.length && (
              <button
                onClick={() => setActiveFilters(CATEGORIES.map(c => c.id))}
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-terracotta)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 6px',
                  textDecoration: 'underline',
                }}
              >
                Mostrar todos
              </button>
            )}
          </div>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={calendarView}
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
          datesSet={(arg) => {
            try {
              window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, arg.view.type);
            } catch {
              // localStorage indisponível
            }
          }}
          eventContent={renderEventContent}
          nowIndicator={true}
          allDaySlot={true}
          slotMinTime="07:00"
          slotMaxTime="22:00"
        />
      </div>

      <AnimatePresence>
        {popover.isOpen && (() => {
          const isMobilePopover = isMobile;

          // No mobile é um modal centrado; no desktop quem posiciona é
          // o floating-ui (ver o useEffect lá em cima).
          const resolvedStyle: React.CSSProperties = isMobilePopover ? {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: '400px',
            zIndex: 1000,
          } : {
            width: '380px',
            zIndex: 1000,
            ...popStyle,
          };

          return (
            <>
              <div 
                onClick={() => { setPopover(prev => ({ ...prev, isOpen: false })); setSelectedEvent(null); }} 
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999,
                  backgroundColor: isMobilePopover ? 'rgba(0,0,0,0.6)' : 'transparent',
                }} 
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                ref={popoverRef}
                className="glass-card agenda-popover"
                style={{
                  padding: 'var(--card-pad)',
                  boxShadow: 'var(--shadow-lg)',
                  ...resolvedStyle
                }}
              >
                {popover.type === 'details' && selectedEvent ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{
                        padding: '10px',
                        borderRadius: '12px',
                        backgroundColor: `${tint(CATEGORIES.find(c => c.id === selectedEvent.extendedProps.type)?.color, 8)}`,
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
                            backgroundColor: selectedEvent.extendedProps.status === 'paid' ? 'var(--color-success-wash)' : 'var(--color-danger-wash)',
                            color: selectedEvent.extendedProps.status === 'paid' ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${selectedEvent.extendedProps.status === 'paid' ? 'var(--color-success-wash)' : 'var(--color-danger-wash)'}`
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
                        {selectedEvent.extendedProps.visibility === 'public' ? <Shield size={16} color="var(--color-success)" /> : <ShieldOff size={16} color="var(--color-danger)" />}
                        <span style={{ fontSize: '0.85rem' }}>{selectedEvent.extendedProps.visibility === 'public' ? 'Visível para todos' : 'Apenas para mim'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                        {selectedEvent.extendedProps.status === 'completed' ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Clock size={16} color="var(--color-warning)" />}
                        <span style={{ fontSize: '0.85rem' }}>{selectedEvent.extendedProps.status === 'completed' ? 'Concluído' : 'Agendado'}</span>
                      </div>
                      {selectedEvent.extendedProps?.google_event_id && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'rgba(66, 133, 244, 0.08)',
                          borderRadius: '8px',
                          border: '1px solid rgba(66, 133, 244, 0.2)',
                          marginTop: '4px'
                        }}>
                          <GoogleIcon size={14} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-info)', fontWeight: 500 }}>
                            Sincronizado com Google ({selectedEvent.extendedProps.google_account || 'agenciapratic'})
                          </span>
                        </div>
                      )}
                      {selectedEvent.extendedProps?.demand_id && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'var(--color-surface-sunken)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          marginTop: '4px'
                        }}>
                          <Link2 size={14} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Gerado a partir de uma demanda — edite por lá
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedEvent.extendedProps.description && (
                      <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--card-inner-bg)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedEvent.extendedProps.description}</p>
                      </div>
                    )}

                    {selectedEvent.extendedProps?.demand_id ? (
                      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <button
                          onClick={() => router.push(`/admin/demandas?d=${selectedEvent.extendedProps.demand_id}`)}
                          className="btn btn-accent"
                          style={{ flex: 1, height: '36px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Link2 size={14} /> Abrir demanda
                        </button>
                      </div>
                    ) : !selectedEvent.id.startsWith('inv-') && (
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
                          style={{ padding: '8px', color: 'var(--color-danger)', height: '36px' }}
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
                          {clients
                            .filter(c => !c.status || c.status === 'active' || c.status === 'prospect' || c.id === formData.client_id)
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nome_fantasia || c.name}{c.status === 'inactive' ? ' (Inativo)' : ''}
                              </option>
                            ))}
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

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => setFormData({ ...formData, visibility: formData.visibility === 'public' ? 'private' : 'public' })}>
                          {formData.visibility === 'public' ? <Shield size={18} color="var(--color-success)" /> : <ShieldOff size={18} color="var(--color-danger)" />}
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

      {/* Modal de Status e Conexão com Google Agenda */}
      <AnimatePresence>
        {showGoogleModal && (
          <>
            <div
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                zIndex: 1100,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '92%',
                maxWidth: '500px',
                padding: '24px',
                zIndex: 1101,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', background: 'rgba(66, 133, 244, 0.1)', borderRadius: '10px' }}>
                    <GoogleIcon size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Google Agenda</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Sincronização Bidirecional</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  style={{ color: 'var(--text-tertiary)', padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {/* Conta agenciapratic@gmail.com */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'var(--card-inner-bg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>agenciapratic@gmail.com</span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Reuniões, Captação, Tarefas, Social Media, Tráfego, Lançamentos
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: googleStatus?.accounts?.agenciapratic?.configured
                          ? 'var(--color-success-wash)'
                          : 'var(--color-warning-wash)',
                        color: googleStatus?.accounts?.agenciapratic?.configured ? 'var(--color-success)' : 'var(--color-warning)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: googleStatus?.accounts?.agenciapratic?.configured ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      />
                      {googleStatus?.accounts?.agenciapratic?.configured ? 'Conectado' : 'Pendente'}
                    </span>
                  </div>

                  {googleStatus?.accounts?.agenciapratic?.configured ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid var(--color-border-subtle)' }}>
                      <a
                        href="/api/agenda/google-auth?account=agenciapratic"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--color-primary)',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        Reconectar / Renovar Autorização
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Para conectar o Google Agenda desta conta, clique no botão abaixo para autorizar no Google:
                      </p>
                      <a
                        href="/api/agenda/google-auth?account=agenciapratic"
                        className="btn btn-accent"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          height: '36px',
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                        }}
                      >
                        <GoogleIcon size={14} /> Conectar agenciapratic@gmail.com
                      </a>
                    </div>
                  )}
                </div>

                {/* Info sobre sincronização */}
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <Info size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      <strong>Sincronização Bidirecional Ativa:</strong> Compromissos criados aqui são enviados para o Google Calendar. Compromissos criados no Google podem ser importados com o botão <strong>Sincronizar</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, height: '38px', fontSize: '0.82rem' }}
                  onClick={() => setShowGoogleModal(false)}
                >
                  Fechar
                </button>
                <button
                  className="btn btn-accent"
                  style={{ flex: 1, height: '38px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => {
                    setShowGoogleModal(false);
                    handlePullFromGoogle();
                  }}
                  disabled={isSyncingGoogle}
                >
                  <RefreshCw size={14} className={isSyncingGoogle ? 'animate-spin' : ''} />
                  Sincronizar Agora
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Estilos do FullCalendar extraídos para
          src/styles/vendor/fullcalendar.css — ver o cabeçalho de lá
          sobre por que ficam sem camada e com !important. */}
    </div>
  );
}
