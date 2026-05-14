"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import KPICard from "@/components/KPICard";
import RevenueChart from "@/components/RevenueChart";
import ActivityTable from "@/components/ActivityTable";
import QuickAccess from "@/components/QuickAccess";
import Spotlight from "@/components/Spotlight";
import { TrendingUp, DollarSign, PieChart, Plus, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 0,
    forecast: 0,
    activeDemands: 0
  });
  const [todayEvents, setTodayEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      const [invoicesRes, contractsRes, demandsRes, eventsRes] = await Promise.all([
        supabase.from('invoices').select('amount').eq('status', 'paid'), // Simplifying for MRR
        supabase.from('contracts').select('value').eq('status', 'active'),
        supabase.from('demands').select('id').eq('status', 'in_production'),
        supabase.from('agenda_events').select('*').eq('date', today).limit(3)
      ]);

      const mrr = contractsRes.data?.reduce((acc, c) => acc + c.value, 0) || 0;
      const activeDemands = demandsRes.data?.length || 0;

      setStats({
        mrr: mrr,
        forecast: mrr * 1.2, // Mock forecast logic
        activeDemands: activeDemands
      });

      if (eventsRes.data) setTodayEvents(eventsRes.data);

    } catch (err) {
      console.error("Erro ao buscar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--page-gap)' }}>
      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Visão geral da sua agência hoje.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: 'auto' }}>
          <button className="btn btn-secondary" style={{ minHeight: '44px' }}>Relatórios</button>
          <Spotlight as="button" className="btn btn-accent" style={{ minHeight: '44px' }}><Plus size={18} /> Novo Projeto</Spotlight>
        </div>
      </div>

      <div className="dashboard-grid-kpis">
        <KPICard
          title="MRR (Contratos Ativos)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)}
          numericValue={stats.mrr}
          prefix="R$ "
          subtitle="Receita mensal recorrente"
          icon={<DollarSign size={24} />}
          trend="up"
          trendValue="Live"
          index={0}
        />
        <KPICard
          title="Previsão Semestral"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr * 6)}
          numericValue={stats.mrr * 6}
          prefix="R$ "
          subtitle="Baseado em contratos"
          icon={<TrendingUp size={24} />}
          trend="neutral"
          index={1}
        />
        <KPICard
          title="Demandas Ativas"
          value={stats.activeDemands.toString()}
          numericValue={stats.activeDemands}
          subtitle="Em produção agora"
          icon={<PieChart size={24} />}
          trend="neutral"
          index={2}
        />
      </div>

      <div className="dashboard-grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <RevenueChart />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <ActivityTable />
          </motion.div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          >
            <QuickAccess />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            <Spotlight className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '24px' }}>Agenda de Hoje</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {todayEvents.length > 0 ? todayEvents.map(event => (
                  <div key={event.id} style={{ display: 'flex', gap: '16px', paddingLeft: '12px' }}>
                    <p style={{ fontWeight: 600, width: '48px', flexShrink: 0 }}>{event.time || 'All Day'}</p>
                    <div>
                      <p style={{ fontWeight: 500 }}>{event.title}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{event.type || 'Compromisso'}</p>
                    </div>
                  </div>
                )) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                    Sem compromissos para hoje.
                  </p>
                )}
              </div>
              <Link href="/admin/schedule" className="btn btn-secondary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>
                Ver agenda completa
              </Link>
            </Spotlight>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
