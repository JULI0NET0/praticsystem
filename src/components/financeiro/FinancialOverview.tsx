"use client";

import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle } from "lucide-react";

interface FinancialOverviewProps {
  invoices: any[];
  contracts: any[];
}

export function FinancialOverview({ invoices, contracts }: FinancialOverviewProps) {
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = contracts
    .filter(c => c.status === 'active')
    .reduce((acc, curr) => acc + Number(curr.value), 0);

  // Simple projection: Current Paid + Pending
  const projection = totalPaid + totalPending;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Mock data for the chart (In a real scenario, this would be grouped by month from the database)
  const monthlyData = [
    { month: 'Jan', value: 12500 },
    { month: 'Fev', value: 15800 },
    { month: 'Mar', value: 14200 },
    { month: 'Abr', value: 19500 },
    { month: 'Mai', value: 18200 },
    { month: 'Jun', value: 22000 },
  ];

  const maxValue = Math.max(...monthlyData.map(d => d.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
            <TrendingUp size={80} color="var(--accent)" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>MRR (Recorrência)</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px', color: 'var(--accent)' }}>
            {formatCurrency(mrr)}
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#22C55E', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} /> +12% vs mês anterior
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Recebido</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px' }}>
            {formatCurrency(totalPaid)}
          </h3>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '12px' }}>
            <div style={{ height: '100%', width: '75%', background: '#22C55E', borderRadius: '2px' }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Pendentes / Atrasados</p>
          <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px', color: '#EF4444' }}>
            {formatCurrency(totalPending + totalOverdue)}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {totalOverdue > 0 ? `${formatCurrency(totalOverdue)} em atraso` : 'Nenhum atraso crítico'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Simple Bar Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h4 style={{ fontWeight: 600 }}>Desempenho Semestral</h4>
            <select className="input" style={{ width: 'auto', padding: '4px 12px', fontSize: '0.875rem' }}>
              <option>Faturamento</option>
              <option>Lucro Estimado</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {monthlyData.map((data, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div 
                  style={{ 
                    width: '60%', 
                    height: `${(data.value / maxValue) * 180}px`, 
                    background: index === monthlyData.length - 1 ? 'var(--accent)' : 'rgba(var(--accent-rgb, 124, 58, 237), 0.3)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }} 
                  title={formatCurrency(data.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Due Dates / Alerts */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> Próximos Vencimentos
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices
              .filter(i => i.status === 'pending')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .slice(0, 5)
              .map((invoice, idx) => (
                <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{invoice.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vence em {new Date(invoice.due_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(Number(invoice.amount))}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
