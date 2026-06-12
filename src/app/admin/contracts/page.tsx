"use client";

import { supabase } from "@/lib/supabase";
import { Plus, Search, FileText, Calendar, MoreVertical, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";
import KPICard from "@/components/KPICard";
import { motion, AnimatePresence } from "framer-motion";
import ContractDetailsModal from "@/components/admin/contracts/ContractDetailsModal";
import Link from "next/link";
import Spotlight from "@/components/Spotlight";
import SearchInput from "@/components/ui/SearchInput";
import { useToast } from "@/components/CustomToast";

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom'>('all');

  const handlePresetChange = (preset: 'all' | 'this_month' | 'prev_month' | 'next_month' | 'custom') => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      if (preset === 'all') {
        setDateRange({ start: "", end: "" });
      } else if (preset === 'this_month') {
        setDateRange({
          start: new Date(y, m, 1).toISOString().split('T')[0],
          end: new Date(y, m + 1, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'prev_month') {
        setDateRange({
          start: new Date(y, m - 1, 1).toISOString().split('T')[0],
          end: new Date(y, m, 0).toISOString().split('T')[0]
        });
      } else if (preset === 'next_month') {
        setDateRange({
          start: new Date(y, m + 1, 1).toISOString().split('T')[0],
          end: new Date(y, m + 2, 0).toISOString().split('T')[0]
        });
      }
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [contractsRes, clientsRes, servicesRes, invoicesRes] = await Promise.all([
          supabase.from('contracts').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('services').select('*'),
          supabase.from('invoices').select('*')
        ]);

        if (contractsRes.data) setContracts(contractsRes.data);
        if (clientsRes.data) setClients(clientsRes.data);
        if (servicesRes.data) setServices(servicesRes.data);
        if (invoicesRes.data) setInvoices(invoicesRes.data);
      } catch (err) {
        console.error("Erro ao buscar dados de contratos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleOpenDetails = (contract: any) => {
    setSelectedContract(contract);
    setIsModalOpen(true);
  };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      // Exclui as faturas associadas primeiro
      await supabase.from('invoices').delete().eq('contract_id', contractToDelete);

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete);

      if (error) throw error;

      showToast('Contrato excluído com sucesso!', 'success');
      setContracts(prev => prev.filter(c => c.id !== contractToDelete));
      setContractToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      showToast('Erro ao excluir contrato.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const rangeInvoices = invoices.filter(i => {
    // Fix timezone shift (dia -01) by ensuring local date parsing
    const dueDateStr = i.due_date.includes('T') ? i.due_date : `${i.due_date}T12:00:00`;
    const d = new Date(dueDateStr).toISOString().split('T')[0];
    const startMatch = !dateRange.start || d >= dateRange.start;
    const endMatch = !dateRange.end || d <= dateRange.end;
    return startMatch && endMatch;
  });

  const mrrTotal = rangeInvoices
    .filter(i => {
      const contract = contracts.find(c => c.id === i.contract_id);
      return contract?.billing_cycle !== 'one_time';
    })
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const activeContractsCount = contracts.filter(c => c.status === 'active').length;
  const expiringSoon = contracts.filter(c => c.status === 'expiring').length;
  const pendingInvoicesCount = rangeInvoices.filter(i => i.status === 'pending').length;

  const filteredContracts = contracts.filter(contract => {
    const client = clients.find(c => c.id === contract.client_id);
    const service = services.find(s => s.id === contract.service_id);
    const matchesSearch =
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={48} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
      {/* ... (anteriormente definido) ... */}
      <ContractDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contract={selectedContract}
        client={clients.find(c => c.id === selectedContract?.client_id)}
        service={services.find(s => s.id === selectedContract?.service_id)}
        invoices={invoices.filter(i => i.contract_id === selectedContract?.id)}
      />

      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Contratos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>
            Gerencie a receita recorrente e o ciclo de vida dos seus clientes.
          </p>
        </div>
        <div className="mobile-stack" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="client-tabs-scroll" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', maxWidth: '100%' }}>
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'this_month', label: 'Este Mês' },
              { id: 'prev_month', label: 'Mês Anterior' },
              { id: 'next_month', label: 'Próximo Mês' },
              { id: 'custom', label: 'Personalizado' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id as any)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: datePreset === preset.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: datePreset === preset.id ? 'rgba(217, 72, 15, 0.15)' : 'rgba(255,255,255,0.02)',
                  color: datePreset === preset.id ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              >
                {preset.label}
              </button>
            ))}
            <Link href="/admin/contracts/create" style={{ textDecoration: 'none' }}>
              <Spotlight as="div" className="btn btn-accent" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', minHeight: 'unset', height: 'auto', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
                <Plus size={14} /> Novo Contrato
              </Spotlight>
            </Link>
          </div>
          {(datePreset === 'custom' || dateRange.start || dateRange.end) && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Início</span>
                <input
                  type="date" className="input-dark"
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', width: '105px' }}
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, start: e.target.value });
                    setDatePreset('custom');
                  }}
                />
              </div>
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Fim</span>
                <input
                  type="date" className="input-dark"
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.85rem', width: '105px' }}
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, end: e.target.value });
                    setDatePreset('custom');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ... KPIs ... */}
      <div className="dashboard-grid-kpis" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <KPICard
          title="MRR do Período"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrTotal)}
          numericValue={mrrTotal}
          prefix="R$ "
          subtitle="Receita Recorrente no intervalo"
          icon={<TrendingUp size={24} />}
          index={0}
        />
        <KPICard
          title="Contratos Ativos"
          value={activeContractsCount.toString()}
          numericValue={activeContractsCount}
          subtitle="Total em vigência global"
          icon={<CheckCircle2 size={24} />}
          index={1}
        />
        <KPICard
          title="A Vencer"
          value={expiringSoon.toString()}
          numericValue={expiringSoon}
          subtitle="Expirações próximas"
          icon={<AlertCircle size={24} />}
          index={2}
        />
        <KPICard
          title="Faturas no Período"
          value={rangeInvoices.length.toString()}
          numericValue={rangeInvoices.length}
          subtitle={`${pendingInvoicesCount} pendentes no intervalo`}
          icon={<DollarSign size={24} />}
          index={3}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div className="mobile-stack" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px'
          }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por cliente ou serviço..."
            />

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', width: 'auto', scrollbarWidth: 'none' }} className="client-tabs-scroll">
              <select
                className="input-dark"
                style={{ width: '180px' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todos Status</option>
                <option value="active">Ativos</option>
                <option value="expiring">A Vencer</option>
                <option value="expired">Encerrados</option>
              </select>
            </div>
          </div>

          <div className="table-container hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço / Plano</th>
                  <th>Início / Fim</th>
                  <th>Valor Mensal</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredContracts.map((contract, i) => {
                    const client = clients.find(c => c.id === contract.client_id);
                    const service = services.find(s => s.id === contract.service_id);

                    return (
                      <motion.tr
                        key={contract.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {client?.nome_fantasia || client?.name}
                            </span>
                            {client?.nome_fantasia && client?.name && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '220px'
                              }} title={client?.name}>
                                {client?.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{service?.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{service?.category}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} /> {new Date(`${contract.start_date}T12:00:00`).toLocaleDateString('pt-BR')}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              Até {new Date(`${contract.end_date}T12:00:00`).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={`badge ${contract.status === 'active' ? 'badge-success' :
                              contract.status === 'expiring' ? 'badge-warning' : 'badge-danger'
                              }`} style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'fit-content' }}>
                              {contract.status === 'active' ? 'Ativo' : contract.status === 'expiring' ? 'Vencendo' : 'Encerrado'}
                            </span>
                            <span 
                              className="badge"
                              style={{ 
                                width: 'fit-content',
                                padding: '4px 12px', fontSize: '0.75rem',
                                backgroundColor: 
                                  contract.document_status === 'signed' ? 'rgba(34, 197, 94, 0.1)' : 
                                  contract.document_status === 'sent' ? 'rgba(59, 130, 246, 0.1)' : 
                                  contract.document_status === 'generated' ? 'rgba(168, 85, 247, 0.1)' : 
                                  'rgba(255, 255, 255, 0.05)',
                                color: 
                                  contract.document_status === 'signed' ? '#22C55E' : 
                                  contract.document_status === 'sent' ? '#3B82F6' : 
                                  contract.document_status === 'generated' ? '#A855F7' : 
                                  'var(--text-secondary)'
                              }}
                            >
                              {contract.document_status === 'signed' ? 'Assinado' : 
                               contract.document_status === 'sent' ? 'Enviado' : 
                               contract.document_status === 'generated' ? 'Emitido' : 
                               'Doc. Pendente'}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              className="btn-icon"
                              title="Ver detalhes"
                              onClick={() => handleOpenDetails(contract)}
                              style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--card-inner-bg)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer' }}
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              className="btn-icon hover-accent"
                              title="Excluir Contrato"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContractToDelete(contract.id);
                              }}
                              style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--card-inner-bg)', color: '#EF4444', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: Card List */}
        <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <AnimatePresence mode="popLayout">
            {filteredContracts.map((contract, i) => {
              const client = clients.find(c => c.id === contract.client_id);
              const service = services.find(s => s.id === contract.service_id);
              return (
                <motion.div
                  key={contract.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleOpenDetails(contract)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                        {client?.nome_fantasia || client?.name}
                      </p>
                      {client?.nome_fantasia && client?.name && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {client?.name}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{service?.name}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={`badge ${contract.status === 'active' ? 'badge-success' :
                        contract.status === 'expiring' ? 'badge-warning' : 'badge-danger'
                        }`} style={{ fontSize: '0.7rem' }}>
                        {contract.status === 'active' ? 'Ativo' : contract.status === 'expiring' ? 'Vencendo' : 'Encerrado'}
                      </span>
                      <span 
                        className="badge"
                        style={{ 
                          fontSize: '0.65rem', padding: '2px 8px',
                          backgroundColor: contract.document_status === 'signed' ? 'rgba(34, 197, 94, 0.1)' : 
                            contract.document_status === 'sent' ? 'rgba(59, 130, 246, 0.1)' : 
                            contract.document_status === 'generated' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: contract.document_status === 'signed' ? '#22C55E' : 
                            contract.document_status === 'sent' ? '#3B82F6' : 
                            contract.document_status === 'generated' ? '#A855F7' : 'var(--text-secondary)'
                        }}
                      >
                        {contract.document_status === 'signed' ? 'Assinado' : 
                          contract.document_status === 'sent' ? 'Enviado' : 
                          contract.document_status === 'generated' ? 'Emitido' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <p>Início: {new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
                      <p>Valor: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" style={{ backgroundColor: 'var(--card-inner-bg)' }}>
                        <FileText size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Excluir Contrato"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContractToDelete(contract.id);
                        }}
                        style={{ backgroundColor: 'var(--card-inner-bg)', color: '#EF4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

      {/* Relationship Detail Section */}
      <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} color="var(--accent)" /> Fluxo Financeiro
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Relacionamento direto entre contratos ativos e faturas geradas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.filter(i => i.status === 'pending').slice(0, 3).map(invoice => (
              <div key={invoice.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--card-inner-bg)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{invoice.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vence em {new Date(invoice.due_date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>Pendente</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent)" /> Ciclo de Vida do Cliente
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Como os contratos se conectam com o onboarding e demandas.
          </p>
          <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ position: 'absolute', left: '-7px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22C55E' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Assinatura do Contrato</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Geração automática do documento PDF e envio para assinatura.</p>
            </div>
            <div>
              <div style={{ position: 'absolute', left: '-7px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent)' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Onboarding Prátic</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Liberação de acesso ao portal do cliente e coleta de credenciais.</p>
            </div>
            <div>
              <div style={{ position: 'absolute', left: '-7px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Entrega Recorrente</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vínculo com o Workspace para gestão de demandas semanais.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Contract Modal */}
      <AnimatePresence>
        {contractToDelete && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '450px', padding: '32px', textAlign: 'center' }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 24px'
              }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Excluir Contrato?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
                Tem certeza que deseja excluir este contrato? As faturas associadas também serão excluídas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn"
                  style={{ backgroundColor: '#EF4444', color: 'white', width: '100%' }}
                  onClick={handleDeleteContract}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Excluindo..." : "Sim, Excluir"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setContractToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
