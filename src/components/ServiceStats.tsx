"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Package, Users, TrendingUp, DollarSign, Loader2 } from "lucide-react";

export function ServiceStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const [servicesRes, contractsRes] = await Promise.all([
          supabase.from('services').select('*'),
          supabase.from('contracts').select('*').eq('status', 'active')
        ]);

        const services = servicesRes.data || [];
        const activeContracts = contractsRes.data || [];
        
        const totalServices = services.length;
        const totalActiveClients = new Set(activeContracts.map(c => c.client_id)).size;
        const totalMRR = activeContracts.reduce((acc, curr) => acc + Number(curr.value), 0);
        
        const serviceUsage = activeContracts.reduce((acc: Record<string, number>, curr) => {
          acc[curr.service_id] = (acc[curr.service_id] || 0) + 1;
          return acc;
        }, {});
        
        const mostPopularServiceId = Object.entries(serviceUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mostPopularService = services.find(s => s.id === mostPopularServiceId)?.name || "N/A";

        setData({
          totalServices,
          totalActiveClients,
          totalMRR,
          mostPopularService
        });
      } catch (err) {
        console.error("Erro ao calcular estatísticas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Loader2 size={24} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total de Serviços",
      value: data?.totalServices || 0,
      icon: Package,
      color: "var(--accent)",
      description: "No catálogo ativo"
    },
    {
      label: "Clientes Ativos",
      value: data?.totalActiveClients || 0,
      icon: Users,
      color: "#10b981",
      description: "Com contratos vigentes"
    },
    {
      label: "Receita Mensal (MRR)",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.totalMRR || 0),
      icon: DollarSign,
      color: "#f59e0b",
      description: "Previsão de faturamento"
    },
    {
      label: "Serviço Popular",
      value: data?.mostPopularService || "N/A",
      icon: TrendingUp,
      color: "#6366f1",
      description: "Maior número de contratos"
    }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: '20px',
      marginBottom: '32px'
    }}>
      {stats.map((stat, index) => (
        <div key={index} className="glass-card" style={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: '-10px', 
            right: '-10px', 
            opacity: 0.05,
            transform: 'rotate(-15deg)'
          }}>
            <stat.icon size={80} color={stat.color} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stat.color
            }}>
              <stat.icon size={20} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {stat.label}
            </span>
          </div>
          
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              {stat.value}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {stat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
