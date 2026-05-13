"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, ArrowUpRight, Loader2, Link as LinkIcon, Copy } from "lucide-react";
import { ServiceStats } from "@/components/ServiceStats";

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [services, setServices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [servicesRes, contractsRes] = await Promise.all([
          supabase.from('services').select('*'),
          supabase.from('contracts').select('*')
        ]);
        
        if (servicesRes.data) setServices(servicesRes.data);
        if (contractsRes.data) setContracts(contractsRes.data);
      } catch (err) {
        console.error("Erro ao buscar serviços:", err);
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
          default_posts_per_week: editingService.default_posts_per_week,
          default_content_capture: editingService.default_content_capture,
          default_capture_frequency: editingService.default_capture_frequency
        })
        .eq('id', editingService.id);

      if (error) throw error;
      
      setServices(services.map(s => s.id === editingService.id ? editingService : s));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
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
              alert("Link de onboarding copiado!");
            }}
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            <Copy size={20} /> Copiar Onboarding
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
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Buscar serviço..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px 12px 10px 40px', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: 'white',
                outline: 'none'
              }}
            />
          </div>
          
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
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Serviço</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Clientes Ativos</th>
                <th>Receita (Mensal)</th>
                <th style={{ paddingRight: '24px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((service) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Service Modal */}
      {isEditModalOpen && editingService && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '900px', padding: '32px', maxHeight: '95vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Gestão do Serviço</h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>
              {/* Coluna Esquerda: Configurações */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                      <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Preço Base (R$)</label>
                      <input 
                        type="number" className="input-dark" 
                        value={editingService.price}
                        onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
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

                  <div style={{ padding: '20px', background: 'rgba(217, 72, 15, 0.05)', borderRadius: '16px', border: '1px solid rgba(217, 72, 15, 0.1)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                      Pré-configurações (Personalização no Lançamento)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Posts Semanais</label>
                        <input 
                          type="number" className="input-dark" 
                          value={editingService.default_posts_per_week || 0}
                          onChange={(e) => setEditingService({ ...editingService, default_posts_per_week: Number(e.target.value) })}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Captação Ativa?</label>
                        <select 
                          className="input-dark"
                          value={editingService.default_content_capture ? 'sim' : 'nao'}
                          onChange={(e) => setEditingService({ ...editingService, default_content_capture: e.target.value === 'sim' })}
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSaveService} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>

              {/* Coluna Direita: Visão Interna de Lançamentos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

                <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Receita Mensal Acumulada</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getServiceMetrics(editingService.id).totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
