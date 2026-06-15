"use client";

import Link from "next/link";
import { Search, Plus, MoreHorizontal, User, X, Building2, Mail, Phone, Shield, Loader2, Briefcase, Copy, Download, CheckCircle, AlertCircle } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Client } from "@/types/database";
import SearchInput from "@/components/ui/SearchInput";
import SortFilterMenu, { SortOption } from "@/components/ui/SortFilterMenu";
import { useToast } from "@/components/CustomToast";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    cnpj: "",
    contact_name: "",
    email: "",
    phone: "",
    status: "prospect"
  });
  const [clients, setClients] = useState<any[]>([]);
  const [demandsCount, setDemandsCount] = useState<Record<string, number>>({});
  const [activeServices, setActiveServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Modal: Importar cliente via Asaas
  const [asaasModalOpen, setAsaasModalOpen] = useState(false);
  const [asaasCpfCnpj, setAsaasCpfCnpj] = useState("");
  const [asaasLookupLoading, setAsaasLookupLoading] = useState(false);
  const [asaasResult, setAsaasResult] = useState<{ customer: any; payments: any[] } | null>(null);
  const [asaasImportLoading, setAsaasImportLoading] = useState(false);
  const [asaasImported, setAsaasImported] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error(`Erro ao buscar clientes: ${res.status}`);
      const data = await res.json();

      if (data) {
        setClients(data);

        // Buscar contagem de demandas ativas para cada cliente
        const { data: demandsData } = await supabase
          .from('demands')
          .select('client_id, status')
          .neq('status', 'completed');

        if (demandsData) {
          const counts: Record<string, number> = {};
          demandsData.forEach(d => {
            counts[d.client_id] = (counts[d.client_id] || 0) + 1;
          });
          setDemandsCount(counts);
        }

        // Buscar contratos ativos com nome do serviço
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('client_id, services(name)')
          .eq('status', 'active');

        if (contractsData) {
          const svcMap: Record<string, string> = {};
          contractsData.forEach((c: any) => {
            if (c.client_id && c.services?.name) {
              svcMap[c.client_id] = c.services.name;
            }
          });
          setActiveServices(svcMap);
        }
      }
    } catch (err: any) {
      console.error("Erro ao buscar clientes:", err?.message || JSON.stringify(err, null, 2) || err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.cnpj ?? "").includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Novo cliente:", newClient);
    setIsModalOpen(false);
    setNewClient({ name: "", cnpj: "", contact_name: "", email: "", phone: "", status: "prospect" });
  };

  const handleAsaasLookup = async () => {
    if (!asaasCpfCnpj.trim()) return;
    setAsaasLookupLoading(true);
    setAsaasResult(null);
    setAsaasImported(false);
    try {
      const res = await fetch('/api/financeiro/asaas/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: asaasCpfCnpj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar no Asaas');
      setAsaasResult(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAsaasLookupLoading(false);
    }
  };

  const handleAsaasImport = async () => {
    if (!asaasResult?.customer) return;
    setAsaasImportLoading(true);
    try {
      const res = await fetch('/api/clients/import-from-asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpfCnpj: asaasCpfCnpj }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar');
      setAsaasImported(true);
      showToast(`${asaasResult.customer.name} importado com ${data.paymentsSynced} pagamento(s) vinculado(s)!`, 'success');
      fetchClients();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setAsaasImportLoading(false);
    }
  };

  const statusOptions: SortOption[] = [
    { label: "Todos os status", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Prospects", value: "prospect" },
    { label: "Inativos", value: "inactive" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '8px' }}>Gestão de Clientes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>Visualize e gerencie toda a sua carteira de clientes.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              const url = `${window.location.origin}/onboarding`;
              navigator.clipboard.writeText(url);
              showToast("Link de onboarding copiado!", "success");
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Copy size={18} /> Onboarding
          </button>
          <button
            onClick={() => { setAsaasModalOpen(true); setAsaasResult(null); setAsaasCpfCnpj(""); setAsaasImported(false); }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={18} /> <span className="hide-mobile">Importar via</span> Asaas
          </button>
          <Link href="/admin/clients/create">
            <Spotlight
              as="div"
              className="btn btn-accent"
            >
              <Plus size={18} /> <span className="hide-mobile">Novo</span> Cliente
            </Spotlight>
          </Link>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="mobile-stack" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, CNPJ ou email..."
          />
          <SortFilterMenu
            label="Filtrar"
            options={statusOptions}
            selectedValue={statusFilter}
            onSelect={setStatusFilter}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Loader2 size={32} color="var(--accent)" />
            </motion.div>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="table-container hide-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Empresa</th>
                    <th>Responsável</th>
                    <th>WhatsApp</th>
                    <th>Serviço</th>
                    <th>Demandas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody style={{ position: 'relative' }}>
                  <AnimatePresence mode="popLayout">
                    {filteredClients.map((client, idx) => (
                      <motion.tr
                        key={client.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => window.location.href = `/admin/clients/${client.id}`}
                        style={{ cursor: 'pointer', position: 'relative' }}
                      >
                        <td style={{ paddingLeft: '24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>
                                {client.nome_fantasia || client.name}
                              </p>
                              <span style={{
                                fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)',
                                background: 'rgba(217, 72, 15, 0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(217, 72, 15, 0.1)',
                                flexShrink: 0
                              }}>
                                #{String(client.sequential_id || idx + 1).padStart(3, '0')}
                              </span>
                            </div>
                            {client.nome_fantasia && client.name && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                                {client.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{client.contact_name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client.email}</p>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{client.phone}</p>
                        </td>
                        <td>
                          {activeServices[client.id] ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                              background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA',
                              border: '1px solid rgba(59, 130, 246, 0.2)', whiteSpace: 'nowrap'
                            }}>
                              {activeServices[client.id].replace('Gestão de Redes Sociais', 'G. Redes')}
                            </span>
                          ) : (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {client.servico_interesse || '-'}
                            </p>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: (demandsCount[client.id] || 0) > 0 ? 'rgba(217, 72, 15, 0.2)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 600, color: (demandsCount[client.id] || 0) > 0 ? 'var(--accent)' : 'var(--text-secondary)'
                            }}>
                              {demandsCount[client.id] || 0}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ativas</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${client.status === 'active' ? 'badge-success' :
                            client.status === 'prospect' ? 'badge-warning' : 'badge-danger'
                            }`}>
                            {client.status === 'active' ? 'Ativo' : client.status === 'prospect' ? 'Prospect' : 'Inativo'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile: Card List */}
            <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <AnimatePresence mode="popLayout">
                {filteredClients.map((client, idx) => (
                  <motion.div
                    key={client.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => window.location.href = `/admin/clients/${client.id}`}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {client.nome_fantasia || client.name}
                          </p>
                          <span style={{
                            fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', opacity: 0.8
                          }}>
                            #{String(client.sequential_id || idx + 1).padStart(3, '0')}
                          </span>
                        </div>
                        {client.nome_fantasia && client.name && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {client.name}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${client.status === 'active' ? 'badge-success' :
                        client.status === 'prospect' ? 'badge-warning' : 'badge-danger'
                        }`} style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                        {client.status === 'active' ? 'Ativo' : client.status === 'prospect' ? 'Prospect' : 'Inativo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>{client.contact_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {activeServices[client.id] && (
                          <span style={{
                            padding: '2px 7px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.12)', color: '#60A5FA',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                          }}>
                            {activeServices[client.id].replace('Gestão de Redes Sociais', 'G. Redes')}
                          </span>
                        )}
                        {(demandsCount[client.id] || 0) > 0 && (
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {demandsCount[client.id]} demandas
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Modal: Importar cliente inativo via Asaas */}
      <AnimatePresence>
        {asaasModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setAsaasModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card"
              style={{ width: '100%', maxWidth: '520px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Importar cliente via Asaas</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Busca o cliente pelo CPF ou CNPJ e importa o histórico de cobranças.
                  </p>
                </div>
                <button onClick={() => setAsaasModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="CPF ou CNPJ (somente números)"
                  value={asaasCpfCnpj}
                  onChange={(e) => setAsaasCpfCnpj(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsaasLookup()}
                  style={{ flex: 1 }}
                  maxLength={14}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleAsaasLookup}
                  disabled={asaasLookupLoading || asaasCpfCnpj.length < 11}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  {asaasLookupLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                  Buscar
                </button>
              </div>

              {asaasResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {asaasResult.customer ? (
                    <>
                      <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                        <p style={{ fontWeight: 600, marginBottom: '4px' }}>{asaasResult.customer.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {asaasResult.customer.email} · {asaasResult.customer.mobilePhone || asaasResult.customer.phone || '—'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          ID Asaas: {asaasResult.customer.id}
                        </p>
                      </div>

                      <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                          {asaasResult.payments.length} cobrança(s) encontrada(s)
                        </p>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {asaasResult.payments.map((p: any) => {
                            const isPaid = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(p.status);
                            const isOverdue = p.status === 'OVERDUE';
                            return (
                              <div key={p.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.03)',
                                fontSize: '0.8rem',
                              }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{p.dueDate}</span>
                                <span style={{ fontWeight: 500 }}>R$ {p.value?.toFixed(2)}</span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
                                  background: isPaid ? 'rgba(34,197,94,0.15)' : isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                                  color: isPaid ? '#4ade80' : isOverdue ? '#f87171' : '#facc15',
                                }}>
                                  {isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {asaasImported ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>
                          <CheckCircle size={18} /> Importado com sucesso!
                        </div>
                      ) : (
                        <button
                          className="btn btn-accent"
                          onClick={handleAsaasImport}
                          disabled={asaasImportLoading}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          {asaasImportLoading
                            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                            : <><Download size={16} /> Importar como cliente inativo</>
                          }
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <AlertCircle size={18} /> Nenhum cliente encontrado no Asaas com este CPF/CNPJ.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
