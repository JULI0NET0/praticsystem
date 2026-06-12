"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, ArrowUpRight, Loader2, Link as LinkIcon, Copy, X, Share2, MessageSquare, FileText, DollarSign } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { ServiceStats } from "@/components/ServiceStats";
import SearchInput from "@/components/ui/SearchInput";
import { useToast } from "@/components/CustomToast";

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [services, setServices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [servicesRes, contractsRes] = await Promise.all([
          supabase.from('services').select('*'),
          supabase.from('contracts').select('*')
        ]);

        if (servicesRes.error) throw servicesRes.error;
        if (contractsRes.error) throw contractsRes.error;

        if (servicesRes.data) setServices(servicesRes.data);
        if (contractsRes.data) setContracts(contractsRes.data);
        setError(null);
      } catch (err: any) {
        console.error("Erro ao buscar serviços:", err);
        setError(err.message || "Erro desconhecido ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = ["Todos", ...new Set(services.map(s => s.category))];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "Todos" || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getServiceMetrics = (serviceId: string) => {
    const activeContracts = contracts.filter(c => c.service_id === serviceId && c.status === 'active');
    const clientCount = activeContracts.length;
    const totalRevenue = activeContracts.reduce((acc, curr) => acc + Number(curr.value), 0);
    return { clientCount, totalRevenue, contracts: activeContracts };
  };

  const handleOpenEdit = (service: any) => {
    setEditingService({ ...service });
    setIsEditModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!editingService) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: editingService.name,
          description: editingService.description,
          price: editingService.price,
          category: editingService.category,
          is_recurring: editingService.is_recurring,
          billing_cycle: editingService.billing_cycle,
          observations: editingService.observations,
          descriptive: editingService.descriptive,
          default_posts_per_week: editingService.default_posts_per_week,
          default_content_capture: editingService.default_content_capture,
          default_capture_frequency: editingService.default_capture_frequency
        })
        .eq('id', editingService.id);

      if (error) throw error;

      setServices(services.map(s => s.id === editingService.id ? editingService : s));
      setIsEditModalOpen(false);
      showToast("Serviço atualizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
      showToast("Erro ao atualizar serviço.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Serviços
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Gerencie o catálogo de soluções e acompanhe a rentabilidade operacional.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              const url = `${window.location.origin}/onboarding`;
              navigator.clipboard.writeText(url);
              showToast("Link de onboarding copiado!", "success");
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <Copy size={20} /> Onboarding
          </button>
          <Link href="/admin/services/create" className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', textDecoration: 'none' }}>
            <Plus size={20} /> Novo Serviço
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <ServiceStats />

      {/* Filters & Table Section */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Table Toolbar */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar serviço..."
          />

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--text-tertiary)' }} />
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    backgroundColor: categoryFilter === cat ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: categoryFilter === cat ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="table-container">
          {error && (
            <div style={{ padding: '20px', margin: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Serviço</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Clientes</th>
                <th>Receita</th>
                <th style={{ paddingRight: '24px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
                  </td>
                </tr>
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service) => {
                  const metrics = getServiceMetrics(service.id);
                  return (
                    <tr key={service.id} className="hover-row">
                      <td style={{ paddingLeft: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{service.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {service.description}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {service.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`badge ${service.is_recurring ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem', width: 'fit-content' }}>
                            {service.is_recurring ? 'RECORRENTE' : 'AVULSO'}
                          </span>
                          {service.is_recurring && service.billing_cycle && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingLeft: '4px' }}>
                              {service.billing_cycle === 'monthly' ? 'Mensal' :
                                service.billing_cycle === 'quarterly' ? 'Trimestral' :
                                  service.billing_cycle === 'yearly' ? 'Anual' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(service.price || 0))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{metrics.clientCount}</span>
                          {metrics.clientCount > 0 && <ArrowUpRight size={14} color="#10b981" />}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalRevenue)}
                        </div>
                      </td>
                      <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEdit(service)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--accent)',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {error ? 'Erro ao carregar dados' : 'Nenhum serviço encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Service Modal */}
      <DialogShell
        isOpen={isEditModalOpen && !!editingService}
        onClose={() => setIsEditModalOpen(false)}
        title="Gestão do Serviço"
        maxWidth="1060px"
        zIndex={110}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 18px', fontSize: '0.875rem' }}>Cancelar</button>
            <button className="btn btn-accent" onClick={handleSaveService} disabled={isSaving} style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        }
      >
        {editingService && (
            <div className="mobile-stack" style={{ display: 'flex', gap: '48px' }}>
              {/* Coluna Esquerda: Configurações */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  Configurações do Catálogo
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome do Serviço</label>
                    <input
                      type="text" className="input-dark"
                      value={editingService.name}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={14} /> Preço Base (R$)
                      </label>
                      <input
                        type="text" className="input-dark"
                        value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(editingService.price || 0)}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const numVal = Number(val) / 100;
                          setEditingService({ ...editingService, price: numVal });
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Categoria</label>
                      <input
                        type="text" className="input-dark"
                        value={editingService.category}
                        onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Novos Campos: Descritivo e Observações */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} /> Descrição Curta
                      </label>
                      <input
                        type="text" className="input-dark"
                        value={editingService.description || ""}
                        onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} /> Descritivo do Serviço
                      </label>
                      <textarea
                        className="input-dark"
                        style={{ minHeight: '100px', resize: 'vertical', padding: '16px' }}
                        placeholder="Descreva detalhadamente o serviço..."
                        value={editingService.descriptive || ""}
                        onChange={(e) => setEditingService({ ...editingService, descriptive: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={14} /> Observações Internas
                      </label>
                      <textarea
                        className="input-dark"
                        style={{ minHeight: '80px', resize: 'vertical', padding: '16px' }}
                        placeholder="Notas ou observações importantes..."
                        value={editingService.observations || ""}
                        onChange={(e) => setEditingService({ ...editingService, observations: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '24px', background: 'rgba(217, 72, 15, 0.05)', borderRadius: '20px', border: '1px solid rgba(217, 72, 15, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Share2 size={16} />
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Configurações de Entrega (Social Media)
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Posts por Semana (Padrão)</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number" className="input-dark"
                            style={{ paddingRight: '100px' }}
                            value={editingService.default_posts_per_week || 0}
                            onChange={(e) => setEditingService({ ...editingService, default_posts_per_week: Number(e.target.value) })}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                            {(editingService.default_posts_per_week || 0) * 4} / MÊS
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Captação de Conteúdo</label>
                        <select
                          className="input-dark"
                          value={editingService.default_content_capture ? 'sim' : 'nao'}
                          onChange={(e) => setEditingService({ ...editingService, default_content_capture: e.target.value === 'sim' })}
                        >
                          <option value="nao">Não incluso</option>
                          <option value="sim">Incluso no pacote</option>
                        </select>
                      </div>
                    </div>

                    {editingService.default_content_capture && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Frequência de Captação Padrão</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                          {['1 meia diária', '1 diária inteira', '2 meias diárias', '2 diárias inteiras'].map(opt => (
                            <button
                              key={opt}
                              onClick={() => setEditingService({ ...editingService, default_capture_frequency: opt })}
                              style={{
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: editingService.default_capture_frequency === opt ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                color: editingService.default_capture_frequency === opt ? 'white' : 'var(--text-secondary)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Coluna Direita: Visão Interna de Lançamentos */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Visão Interna de Lançamentos
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>
                    {getServiceMetrics(editingService.id).clientCount} ativos
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                  {getServiceMetrics(editingService.id).contracts.length > 0 ? (
                    getServiceMetrics(editingService.id).contracts.map((c: any) => (
                      <div key={c.id} style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Contrato #{c.id.slice(-6).toUpperCase()}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            Desde: {new Date(c.start_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, color: '#22C55E' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.value)}
                          </p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{c.billing_cycle === 'monthly' ? 'Mensal' : 'Avulso'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                      Nenhum lançamento ativo para este serviço.
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 'auto',
                  padding: '24px',
                  background: 'linear-gradient(135deg, rgba(217, 72, 15, 0.1) 0%, rgba(217, 72, 15, 0.02) 100%)',
                  borderRadius: '20px',
                  border: '1px solid rgba(217, 72, 15, 0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Receita Mensal Acumulada</p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getServiceMetrics(editingService.id).totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
        )}
      </DialogShell>
    </div>
  );
}
