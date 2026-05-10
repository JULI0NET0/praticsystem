import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import Spotlight from "./Spotlight";

export default function ActivityTable() {
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentInvoices() {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('due_date', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        if (data) setRecentInvoices(data.map(i => ({...i, dueDate: i.due_date})));
      } catch (err) {
        console.error("Erro ao buscar faturas recentes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentInvoices();
  }, []);

  return (
    <Spotlight className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Atividades Recentes</h3>
        <button style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 500 }}>Ver todas</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td style={{ fontWeight: 500 }}>{invoice.description}</td>
                <td>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                </td>
                <td>{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                <td>
                  <span className={`badge ${
                    invoice.status === 'paid' ? 'badge-success' : 
                    invoice.status === 'pending' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Atrasado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Spotlight>
  );
}
