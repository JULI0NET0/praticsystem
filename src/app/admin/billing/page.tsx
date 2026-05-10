"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [invoicesRes, clientsRes] = await Promise.all([
          supabase.from('invoices').select('*'),
          supabase.from('clients').select('*')
        ]);
        
        if (invoicesRes.data) setInvoices(invoicesRes.data);
        if (clientsRes.data) setClients(clientsRes.data);
      } catch (err) {
        console.error("Erro ao buscar faturas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, curr) => acc + Number(curr.amount), 0);

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
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Controle de faturamentos e recebimentos.</p>
        </div>
        <button className="btn btn-secondary"><Download size={18} /> Exportar Relatório</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #22C55E' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Recebido (Mês)</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}
          </h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #EAB308' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>A Receber (Pendente)</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
          </h3>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #EF4444' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Em Atraso</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOverdue)}
          </h3>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Descrição / Cliente</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const client = clients.find(c => c.id === invoice.client_id);
                return (
                  <tr key={invoice.id}>
                    <td>
                      <div>
                        <p style={{ fontWeight: 500 }}>{invoice.description}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client?.name}</p>
                      </div>
                    </td>
                    <td>{new Date(invoice.due_date).toLocaleDateString('pt-BR')}</td>
                    <td style={{ fontWeight: 500 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(invoice.amount))}
                    </td>
                    <td>
                      <span className={`badge ${
                        invoice.status === 'paid' ? 'badge-success' : 
                        invoice.status === 'pending' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Atrasado'}
                      </span>
                    </td>
                    <td>
                      {invoice.status !== 'paid' && (
                        <button style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 500 }}>
                          Confirmar Pagamento
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
