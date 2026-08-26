"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Plus, List, LayoutGrid, FileText, Calendar, Search } from "lucide-react";
import Spotlight from "./Spotlight";

export default function QuickAccess() {
  const [activeClients, setActiveClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveClients() {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('status', 'active')
          .limit(3);

        if (error) throw error;
        if (data) setActiveClients(data);
      } catch (err: any) {
        console.error("Erro ao buscar clientes ativos:", err?.message || JSON.stringify(err, null, 2) || err);
      } finally {
        setLoading(false);
      }
    }
    fetchActiveClients();
  }, []);

  const triggerSearch = () => {
    window.dispatchEvent(new CustomEvent('toggle-search'));
  };

  return (
    <Spotlight className="glass-card" style={{ padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Ações & Acesso Rápido</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)', padding: '3px 8px', borderRadius: '6px' }}>
          ⌘K
        </span>
      </div>

      {/* Trigger de Busca Global */}
      <button
        type="button"
        onClick={triggerSearch}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '10px 14px',
          borderRadius: 'var(--radius-input)',
          backgroundColor: 'var(--color-surface-sunken)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <Search size={15} color="var(--accent)" />
        <span style={{ flex: 1 }}>Buscar demandas, contratos, agenda...</span>
        <kbd style={{ fontSize: '0.7rem', opacity: 0.6, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>⌘K</kbd>
      </button>

      {/* Grid de Atalhos de Demandas, Contratos e Agenda */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <Link
          href="/admin/demandas?action=new"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'color-mix(in oklab, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
            color: 'var(--accent)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            gridColumn: 'span 2',
            justifyContent: 'center',
            transition: 'transform 0.15s ease, background-color 0.2s ease',
          }}
        >
          <Plus size={16} /> Lançar Nova Demanda
        </Link>

        <Link
          href="/admin/demandas?view=list"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <List size={14} color="var(--accent)" /> Ver Lista
        </Link>

        <Link
          href="/admin/demandas?view=board"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <LayoutGrid size={14} color="var(--accent)" /> Ver Kanban
        </Link>

        <Link
          href="/admin/contracts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <FileText size={14} color="var(--accent)" /> Contratos
        </Link>

        <Link
          href="/admin/schedule"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <Calendar size={14} color="var(--accent)" /> Agenda
        </Link>
      </div>

      {/* Lista de Clientes Ativos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          Clientes Ativos
        </p>

        {activeClients.map((client) => (
          <Link
            key={client.id}
            href={`/admin/clients/${client.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 'var(--radius-input)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid transparent',
              transition: 'all 0.2s',
              textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.78rem'
              }}>
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, color: 'var(--text-primary)' }}>{client.name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.725rem', margin: 0 }}>{client.contact_name || 'Contato'}</p>
              </div>
            </div>
            <ArrowRight size={14} color="var(--text-secondary)" />
          </Link>
        ))}
      </div>

      <Link href="/admin/clients" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block', fontSize: '0.85rem' }}>
        Ver todos os clientes
      </Link>
    </Spotlight>
  );
}

