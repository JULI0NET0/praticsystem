"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, MessageSquare, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import KPICard from "@/components/KPICard";
import Spotlight from "@/components/Spotlight";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

export default function ClientDashboardWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(217, 72, 15, 0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <ClientDashboard />
    </Suspense>
  );
}

function ClientDashboard() {
  const { currentUser } = useAuth();
  const [clientData, setClientData] = useState<any>(null);
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const simulateId = searchParams.get('simulate');

  useEffect(() => {
    if (currentUser || simulateId) {
      fetchClientData();
    }
  }, [currentUser, simulateId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('clients').select('*');
      
      if (simulateId) {
        query = query.eq('id', simulateId);
      } else {
        query = query.eq('portal_email', currentUser?.email);
      }

      const { data: client } = await query.single();

      if (client) {
        setClientData(client);
        
        const { data: demandsData } = await supabase
          .from('demands')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });

        if (demandsData) setDemands(demandsData);
      }
    } catch (err) {
      console.error("Erro ao buscar dados do cliente:", err);
    } finally {
      setLoading(false);
    }
  };

  const pendingDemands = demands.filter(d => d.status !== 'completed').length;
  const completedDemands = demands.filter(d => d.status === 'completed').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(217, 72, 15, 0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      {simulateId && (
        <div style={{ 
          padding: '12px 20px', background: 'rgba(217, 72, 15, 0.1)', borderRadius: '12px', 
          border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={18} color="var(--accent)" />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent)' }}>
              Modo Simulação: Você está visualizando o portal como o cliente <strong>{clientData?.nome_fantasia || clientData?.name}</strong>.
            </p>
          </div>
          <button 
            onClick={() => window.close()} 
            style={{ 
              padding: '6px 12px', borderRadius: '8px', background: 'var(--accent)', color: 'white', 
              fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' 
            }}
          >
            Encerrar Simulação
          </button>
        </div>
      )}
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
          Bem-vindo, {simulateId ? (clientData?.contact_name || 'Cliente') : (currentUser?.name || 'Cliente')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Acompanhe o progresso da {clientData?.nome_fantasia || 'sua empresa'} em tempo real.</p>
      </header>

      <div className="dashboard-grid-kpis">
        <KPICard
          title="Demandas Ativas"
          value={pendingDemands.toString()}
          icon={<Clock size={24} />}
          subtitle="Aguardando ação"
          trend="neutral"
          index={0}
        />
        <KPICard
          title="Entregas Concluídas"
          value={completedDemands.toString()}
          icon={<CheckCircle2 size={24} />}
          subtitle="Neste mês"
          trend="up"
          trendValue="100%"
          index={1}
        />
        <KPICard
          title="Health Score"
          value="9.8"
          icon={<TrendingUp size={24} />}
          subtitle="Satisfação geral"
          trend="up"
          index={2}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Últimas Demandas</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = '/client/demands'}>Ver todas</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {demands.length > 0 ? demands.slice(0, 3).map((demand, idx) => (
              <Spotlight key={demand.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{demand.type}</span>
                  <span className={`badge ${demand.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {demand.status === 'completed' ? 'Finalizado' : 'Em Produção'}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>{demand.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <span>Previsão de Entrega: <strong>{demand.due_date ? new Date(demand.due_date).toLocaleDateString('pt-BR') : 'A definir'}</strong></span>
                </div>
              </Spotlight>
            )) : (
              <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma demanda ativa no momento.</p>
              </div>
            )}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Mensagens Recentes</h2>
          <Spotlight className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>JN</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Julio Neto</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hoje</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {clientData?.contact_name?.split(' ')[0] || 'Cliente'}, acabamos de subir as artes da campanha de Junho. Dê uma olhada na aba de demandas!
                </p>
              </div>
            </div>
            <button className="btn btn-accent" style={{ width: '100%' }}>
              <MessageSquare size={18} /> Responder Agência
            </button>
          </Spotlight>
        </section>
      </div>
    </motion.div>
  );
}
