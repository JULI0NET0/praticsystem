"use client";

import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface FinancialOverviewProps {
  invoices: any[];
  contracts: any[];
}

export function FinancialOverview({ invoices, contracts }: FinancialOverviewProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Faturas do mês selecionado
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalOverdue = invoices.filter(i => {
    if (i.status !== 'pending') return false;
    const dueDateStr = i.due_date.includes('T') ? i.due_date : `${i.due_date}T23:59:59`;
    return new Date(dueDateStr) < new Date();
  }).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  
  // Mock data for the chart (In a real scenario, this would be grouped by month from the database)
  const monthlyData = [
    { month: 'Jan', value: 12500, label: 'Fev/24' },
    { month: 'Fev', value: 15800, label: 'Mar/24' },
    { month: 'Mar', value: 14200, label: 'Abr/24' },
    { month: 'Abr', value: 19500, label: 'Mai/24' },
    { month: 'Mai', value: 18200, label: 'Jun/24' },
    { month: 'Jun', value: 22000, label: 'Jul/24' },
  ];

  const maxValue = Math.max(...monthlyData.map(d => d.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
        {/* Simple Bar Chart */}
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>Saúde Financeira</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Histórico de faturamento bruto (6 meses)</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Realizado</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', paddingBottom: '20px' }}>
            {monthlyData.map((data, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flex: 1 }}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.value / maxValue) * 180}px` }}
                  style={{ 
                    width: '40%', 
                    background: index === monthlyData.length - 1 ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    cursor: 'pointer'
                  }} 
                  whileHover={{ scaleX: 1.1, background: 'var(--accent)', opacity: 0.8 }}
                  title={formatCurrency(data.value)}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <TrendingUp size={20} color="#22C55E" />
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#22C55E' }}>Performance do Período</p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Você já recebeu **{formatCurrency(totalPaid)}** este mês. 
              {totalPaid > 10000 ? ' Excelente ritmo de baixas!' : ' Continue acompanhando as faturas em aberto.'}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--accent)" /> Próximos Vencimentos
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invoices
                .filter(i => i.status === 'pending')
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .slice(0, 4)
                .map((invoice, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{invoice.description.slice(0, 20)}...</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{formatCurrency(Number(invoice.amount))}</span>
                  </div>
                ))}
              {invoices.filter(i => i.status === 'pending').length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>Tudo em dia para este período!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
