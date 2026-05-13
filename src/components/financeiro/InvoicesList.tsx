"use client";

import { Search, Filter, Download } from "lucide-react";
import { useState } from "react";

interface InvoicesListProps {
  invoices: any[];
  clients: any[];
}

export function InvoicesList({ invoices, clients }: InvoicesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredInvoices = invoices.filter(invoice => {
    const client = clients.find(c => c.id === invoice.client_id);
    const matchesSearch = 
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Buscar por descrição ou cliente..." 
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input" 
            style={{ width: '150px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos Status</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Atrasados</option>
          </select>
        </div>
        <button className="btn btn-secondary">
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
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
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const client = clients.find(c => c.id === invoice.client_id);
                  return (
                    <tr key={invoice.id}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 500 }}>{invoice.description}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client?.name || 'Cliente não encontrado'}</p>
                        </div>
                      </td>
                      <td>{new Date(invoice.due_date).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 500 }}>
                        {formatCurrency(Number(invoice.amount))}
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {invoice.status !== 'paid' && (
                            <button style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 500 }}>
                              Confirmar
                            </button>
                          )}
                          <button style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ver</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
