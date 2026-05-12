"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, ArrowUpRight, Loader2 } from "lucide-react";
import { ServiceStats } from "@/components/ServiceStats";

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [services, setServices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    return { clientCount, totalRevenue };
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
        <Link href="/admin/services/create" className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', textDecoration: 'none' }}>
          <Plus size={20} /> Novo Serviço
        </Link>
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
                      <button style={{ 
                        padding: '8px', 
                        borderRadius: '8px', 
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)'
                      }}>
                        <MoreHorizontal size={18} />
                      </button>
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
