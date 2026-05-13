"use client";

import { User, ArrowUpRight, TrendingUp } from "lucide-react";

interface ClientFinancialsProps {
  invoices: any[];
  clients: any[];
  contracts: any[];
}

export function ClientFinancials({ invoices, clients, contracts }: ClientFinancialsProps) {
  const clientStats = clients.map(client => {
    const clientInvoices = invoices.filter(i => i.client_id === client.id);
    const clientContracts = contracts.filter(c => c.client_id === client.id && c.status === 'active');
    
    const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalPending = clientInvoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const mrr = clientContracts.reduce((acc, curr) => acc + Number(curr.value), 0);

    return {
      id: client.id,
      name: client.name,
      totalPaid,
      totalPending,
      mrr,
      health: totalPending > 0 ? 'warning' : 'healthy'
    };
  }).sort((a, b) => (b.totalPaid + b.mrr) - (a.totalPaid + a.mrr));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {clientStats.slice(0, 6).map((stat) => (
          <div key={stat.id} className="glass-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{stat.name}</h4>
                <span className={`badge ${stat.health === 'healthy' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                  {stat.health === 'healthy' ? 'Em dia' : 'Pendências'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Pago</p>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatCurrency(stat.totalPaid)}</p>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assinatura</p>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent)' }}>{formatCurrency(stat.mrr)}/mês</p>
                </div>
              </div>
            </div>
            <button style={{ color: 'var(--text-secondary)' }}>
              <ArrowUpRight size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--accent)" /> Ranking de Faturamento (LTV)
        </h4>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Cliente</th>
                <th>Total Pago</th>
                <th>Receita Mensal (MRR)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clientStats.map((stat, idx) => (
                <tr key={stat.id}>
                  <td style={{ width: '80px' }}>
                    <span style={{ 
                      width: '24px', 
                      height: '24px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: idx < 3 ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: idx < 3 ? 'white' : 'var(--text-primary)'
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td>{stat.name}</td>
                  <td style={{ fontWeight: 500 }}>{formatCurrency(stat.totalPaid)}</td>
                  <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{formatCurrency(stat.mrr)}</td>
                  <td>
                    <span className={`badge ${stat.health === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
                      {stat.health === 'healthy' ? 'OK' : 'Atenção'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
