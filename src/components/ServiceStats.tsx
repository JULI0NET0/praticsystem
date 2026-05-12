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
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
      gap: '16px',
      marginBottom: '32px'
    }}>
      {stats.map((stat, index) => (
        <div key={index} className="glass-card" style={{ 
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
          minWidth: 0 // Prevents grid blowout
        }}>
          <div style={{ 
            position: 'absolute', 
            top: '-5px', 
            right: '-5px', 
            opacity: 0.03,
            transform: 'rotate(-15deg)'
          }}>
            <stat.icon size={60} color={stat.color} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              backgroundColor: `${stat.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: stat.color,
              flexShrink: 0
            }}>
              <stat.icon size={16} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stat.label}
            </span>
          </div>
          
          <div style={{ marginTop: '4px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stat.value}
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
