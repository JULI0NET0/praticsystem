"use client";

import { Repeat, ShieldCheck, Zap, MoreVertical } from "lucide-react";

interface RecurringRevenueProps {
  contracts: any[];
  clients: any[];
  services: any[];
}

export function RecurringRevenue({ contracts, clients, services }: RecurringRevenueProps) {
  const activeContracts = contracts.filter(c => c.status === 'active');
  const totalMRR = activeContracts.reduce((acc, curr) => acc + Number(curr.value), 0);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* MRR Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(var(--accent-rgb, 124, 58, 237), 0.1)', padding: '8px', borderRadius: '8px' }}>
              <Repeat size={20} color="var(--accent)" />
            </div>
            <p style={{ fontWeight: 600 }}>Receita Recorrente (MRR)</p>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(totalMRR)}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Baseado em {activeContracts.length} contratos ativos
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '8px', borderRadius: '8px' }}>
              <Zap size={20} color="#22C55E" />
            </div>
            <p style={{ fontWeight: 600 }}>LTV Estimado (Lifetime Value)</p>
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(totalMRR * 12)}</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Projeção anual baseada na receita atual
          </p>
        </div>
      </div>

      {/* Active Contracts Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontWeight: 600 }}>Contratos Ativos</h4>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Início</th>
                  <th>Valor Mensal</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.map((contract) => {
                  const client = clients.find(c => c.id === contract.client_id);
                  const service = services.find(s => s.id === contract.service_id);
                  return (
                    <tr key={contract.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{client?.name || 'Cliente'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Recorrente</span>
                          <span>{service?.name || 'Serviço'}</span>
                        </div>
                      </td>
                      <td>{new Date(`${contract.start_date || contract.created_at}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {formatCurrency(Number(contract.value))}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22C55E', fontSize: '0.875rem' }}>
                          <ShieldCheck size={14} /> Ativo
                        </div>
                      </td>
                      <td>
                        <button style={{ color: 'var(--text-secondary)' }}><MoreVertical size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
