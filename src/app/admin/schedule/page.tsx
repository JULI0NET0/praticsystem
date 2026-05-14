"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function SchedulePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('agenda_events')
          .select('*')
          .order('date');
        
        if (error) throw error;
        if (data) setEvents(data);
      } catch (err) {
        console.error("Erro ao buscar agenda:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={48} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Agenda</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Compromissos, reuniões e tarefas da equipe.</p>
        </div>
        <button className="btn btn-accent"><Plus size={18} /> Novo Compromisso</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
        
        {/* Filtros e Lista Hoje */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Filtros</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span style={{ color: '#3B82F6' }}>●</span> Reuniões
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span style={{ color: '#22C55E' }}>●</span> Pagamentos
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span style={{ color: '#EAB308' }}>●</span> Captação
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span style={{ color: '#A8A8A8' }}>●</span> Tarefas Internas
              </label>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Próximos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {events.slice(0, 5).map(event => (
                <div key={event.id} style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <span style={{ 
                    color: event.type === 'meeting' ? '#3B82F6' : event.type === 'payment' ? '#22C55E' : '#EAB308',
                    fontSize: '1rem',
                    lineHeight: '1.2'
                  }}>●</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{new Date(event.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                    <p style={{ fontWeight: 500, marginTop: '4px' }}>{event.title}</p>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nenhum compromisso agendado.</p>}
            </div>
          </div>
        </div>

        {/* Calendário */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '8px' }}><ChevronLeft size={16} /></button>
              <button className="btn btn-secondary" style={{ padding: '8px' }}>Hoje</button>
              <button className="btn btn-secondary" style={{ padding: '8px' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Grid do Calendário */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '1px',
            backgroundColor: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
            flex: 1
          }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', textAlign: 'center', fontWeight: 500, fontSize: '0.875rem' }}>
                {day}
              </div>
            ))}
            {/* Dias simulados (para visualização do layout) */}
            {Array.from({length: 35}).map((_, i) => (
              <div key={i} style={{ backgroundColor: 'var(--bg-primary)', padding: '8px', minHeight: '100px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  {i + 1}
                </span>
                {events.filter(e => new Date(e.date).getDate() === (i + 1)).map(e => (
                  <div key={e.id} style={{ 
                    backgroundColor: e.type === 'meeting' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)', 
                    color: e.type === 'meeting' ? '#3B82F6' : '#22C55E', 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    marginTop: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {new Date(e.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} {e.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
