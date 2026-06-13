"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Download } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import SortFilterMenu, { SortOption } from "@/components/ui/SortFilterMenu";
import { useToast } from "@/components/CustomToast";

interface InvoicesListProps {
  invoices: any[];
  clients: any[];
  onRefresh?: () => void;
}

export function InvoicesList({ invoices, clients, onRefresh }: InvoicesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { showToast } = useToast();

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);
      if (error) throw error;
      showToast("Fatura marcada como paga!", "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      showToast("Erro ao dar baixa na fatura.", "error");
    }
  };

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

  const statusOptions: SortOption[] = [
    { label: "Todos Status", value: "all" },
    { label: "Pagos", value: "paid" },
    { label: "Pendentes", value: "pending" },
    { label: "Atrasados", value: "overdue" },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '300px', alignItems: 'center' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por descrição ou cliente..."
          />
          <SortFilterMenu
            label="Status"
            options={statusOptions}
            selectedValue={filterStatus}
            onSelect={setFilterStatus}
          />
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => showToast("Exportando faturas em CSV...", "info")}
        >
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
                      <td>{new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 500 }}>
                        {formatCurrency(Number(invoice.amount))}
                      </td>
                      <td>
                        <span className={`badge ${invoice.status === 'paid' ? 'badge-success' :
                            invoice.status === 'pending' ? 'badge-warning' : 'badge-danger'
                          }`}>
                          {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Atrasado'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {invoice.status !== 'paid' && (
                            <button
                              style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none' }}
                              onClick={() => handleMarkAsPaid(invoice.id)}
                            >
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
