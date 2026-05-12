"use client";

import { supabase } from "@/lib/supabase";
import { Plus, Search, FileText, Calendar, MoreVertical, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import KPICard from "@/components/KPICard";
import { motion, AnimatePresence } from "framer-motion";
import ContractDetailsModal from "@/components/admin/contracts/ContractDetailsModal";
import Link from "next/link";
import Spotlight from "@/components/Spotlight";

export default function ContractsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const activeContracts = contracts.filter(c => c.status === 'active');
  const mrrTotal = activeContracts.reduce((acc, curr) => acc + Number(curr.value), 0);
  const expiringSoon = contracts.filter(c => c.status === 'expiring').length;
  const pendingInvoicesCount = invoices.filter(i => i.status === 'pending').length;

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Contratos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Gerencie a receita recorrente e o ciclo de vida dos seus clientes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary">
            Exportar CSV
          </button>
          <Link href="/admin/contracts/create">
            <Spotlight as="div" className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Novo Contrato
            </Spotlight>
          </Link>
        </div>
      </div>
      
      {/* ... KPIs ... */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px' 
      }}>
        <KPICard 
          title="MRR Total" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrrTotal)}
          numericValue={mrrTotal}
          prefix="R$ "
          subtitle="Receita Mensal Recorrente"
          icon={<TrendingUp size={24} />}
          trend="up"
          trendValue="12%"
          index={0}
        />
        <KPICard 
          title="Contratos Ativos" 
          value={activeContracts.length.toString()}
          numericValue={activeContracts.length}
          subtitle="Em vigência no momento"
          icon={<CheckCircle2 size={24} />}
          index={1}
        />
        <KPICard 
          title="A Vencer" 
          value={expiringSoon.toString()}
          numericValue={expiringSoon}
          subtitle="Expiram em 30 dias"
          icon={<AlertCircle size={24} />}
          trend="neutral"
          index={2}
        />
        <KPICard 
          title="Faturas Pendentes" 
          value={pendingInvoicesCount.toString()}
          numericValue={pendingInvoicesCount}
          subtitle="Aguardando pagamento"
          icon={<DollarSign size={24} />}
          index={3}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente ou serviço..." 
              className="input-field"
              style={{ paddingLeft: '40px', width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'active', 'expiring', 'expired'].map((status) => (
              <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '100px', 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  backgroundColor: filterStatus === status ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                  color: filterStatus === status ? 'white' : 'var(--text-secondary)',
                  border: '1px solid transparent',
                  cursor: 'pointer'
                }}
              >
                {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : status === 'expiring' ? 'A Vencer' : 'Encerrados'}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço / Plano</th>
                <th>Início / Fim</th>
                <th>Valor Mensal</th>
                <th>Auto-Renovação</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            backgroundColor: 'rgba(217, 72, 15, 0.1)',
                            border: '1px solid rgba(217, 72, 15, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            fontSize: '0.75rem'
                          }}>
                            {client?.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{client?.name}</span>
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
                            <Calendar size={12} /> {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            Até {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          color: contract.auto_renew ? '#22C55E' : 'var(--text-secondary)',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}>
                          {contract.auto_renew ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          contract.status === 'active' ? 'badge-success' : 
                          contract.status === 'expiring' ? 'badge-warning' : 'badge-danger'
                        }`} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                          {contract.status === 'active' ? 'Ativo' : contract.status === 'expiring' ? 'Vencendo' : 'Encerrado'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            className="btn-icon" 
                            title="Ver detalhes"
                            onClick={() => handleOpenDetails(contract)}
                            style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer' }}
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            className="btn-icon"
                            title="Mais opções"
                            style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer' }}
                          >
                            <MoreVertical size={16} />
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

      {/* Relationship Detail Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} color="var(--accent)" /> Fluxo Financeiro
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Relacionamento direto entre contratos ativos e faturas geradas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.filter(i => i.status === 'pending').slice(0, 3).map(invoice => (
              <div key={invoice.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
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
          <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
    </div>
  );
}
