"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Download, Loader2, LayoutDashboard, Receipt, Repeat, Users, Calendar } from "lucide-react";
import { FinancialOverview } from "@/components/financeiro/FinancialOverview";
import { InvoicesList } from "@/components/financeiro/InvoicesList";
import { RecurringRevenue } from "@/components/financeiro/RecurringRevenue";
import { ClientFinancials } from "@/components/financeiro/ClientFinancials";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'geral' | 'recebimentos' | 'recorrencia' | 'clientes'>('geral');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [invoicesRes, clientsRes, contractsRes, servicesRes] = await Promise.all([
          supabase.from('invoices').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('contracts').select('*'),
          supabase.from('services').select('*')
        ]);
        
        if (invoicesRes.data) setInvoices(invoicesRes.data);
        if (clientsRes.data) setClients(clientsRes.data);
        if (contractsRes.data) setContracts(contractsRes.data);
        if (servicesRes.data) setServices(servicesRes.data);
      } catch (err) {
        console.error("Erro ao buscar dados financeiros:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={48} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  const getFinanceMetrics = () => {
    const rangeInvoices = invoices.filter(i => {
      // Fix timezone shift (dia -01) by ensuring local date parsing
      const dueDateStr = i.due_date.includes('T') ? i.due_date : `${i.due_date}T12:00:00`;
      const d = new Date(dueDateStr).toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    });

    const mrr = rangeInvoices
      .filter(i => {
        const contract = contracts.find(c => c.id === i.contract_id);
        return contract?.billing_cycle !== 'one_time';
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const avulsos = rangeInvoices
      .filter(i => {
        const contract = contracts.find(c => c.id === i.contract_id);
        return contract?.billing_cycle === 'one_time';
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const totalReceived = rangeInvoices
      .filter(i => i.status === 'paid')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const overdue = rangeInvoices
      .filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) < new Date())
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const upcoming = rangeInvoices
      .filter(i => i.status === 'pending' && new Date(`${i.due_date}T23:59:59`) >= new Date())
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return { mrr, avulsos, totalReceived, overdue, upcoming, count: rangeInvoices.length, rangeInvoices };
  };

  const metrics = getFinanceMetrics();

  const tabs = [
    { id: 'geral', label: 'Dashboard Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'recebimentos', label: 'Faturas & Baixas', icon: <Receipt size={18} /> },
    { id: 'recorrencia', label: 'Gestão de MRR', icon: <Repeat size={18} /> },
    { id: 'clientes', label: 'Análise por Cliente', icon: <Users size={18} /> },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Controle de faturamentos e saúde financeira da agência.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-glow)' }}>
            <Calendar size={18} color="var(--accent)" style={{ marginRight: '8px', opacity: 0.8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período Inicial</span>
              <input 
                type="date" className="input-dark" 
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.9rem', width: '115px', fontWeight: 600 }}
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período Final</span>
              <input 
                type="date" className="input-dark" 
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.9rem', width: '115px', fontWeight: 600 }}
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ height: '52px', borderRadius: '16px', padding: '0 20px' }}><Download size={20} /> Exportar</button>
        </div>
      </div>

      {/* Global Dashboard Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.03)' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Prev. MRR</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.03)' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Avulsos</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avulsos)}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(217, 72, 15, 0.03)' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>A Vencer</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.upcoming)}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(34, 197, 94, 0.03)' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Recebido</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#22C55E' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalReceived)}</h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.03)' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Pendentes</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.overdue)}</h3>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '2px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.2s ease',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'geral' && (
          <FinancialOverview invoices={metrics.rangeInvoices} contracts={contracts} />
        )}
        {activeTab === 'recebimentos' && (
          <InvoicesList invoices={metrics.rangeInvoices} clients={clients} />
        )}
        {activeTab === 'recorrencia' && (
          <RecurringRevenue contracts={contracts} clients={clients} services={services} />
        )}
        {activeTab === 'clientes' && (
          <ClientFinancials invoices={metrics.rangeInvoices} clients={clients} contracts={contracts} />
        )}
      </div>
    </div>
  );
}

