"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Download, Loader2, LayoutDashboard, Receipt, Repeat, Users } from "lucide-react";
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

  const tabs = [
    { id: 'geral', label: 'Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'recebimentos', label: 'Recebimentos', icon: <Receipt size={18} /> },
    { id: 'recorrencia', label: 'Recorrência', icon: <Repeat size={18} /> },
    { id: 'clientes', label: 'Clientes', icon: <Users size={18} /> },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Controle de faturamentos e recebimentos da agência.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary"><Download size={18} /> Exportar Relatório</button>
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
          <FinancialOverview invoices={invoices} contracts={contracts} />
        )}
        {activeTab === 'recebimentos' && (
          <InvoicesList invoices={invoices} clients={clients} />
        )}
        {activeTab === 'recorrencia' && (
          <RecurringRevenue contracts={contracts} clients={clients} services={services} />
        )}
        {activeTab === 'clientes' && (
          <ClientFinancials invoices={invoices} clients={clients} contracts={contracts} />
        )}
      </div>
    </div>
  );
}

