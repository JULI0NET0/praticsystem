"use client";

import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, MessageSquare, TrendingUp } from "lucide-react";
import KPICard from "@/components/KPICard";
import Spotlight from "@/components/Spotlight";
import { demands } from "@/mocks/db";

export default function ClientDashboard() {
  // Simulating fetching demands for Client 1 (Acme Corp)
  const clientDemands = demands.filter(d => d.clientId === '1');
  const pendingDemands = clientDemands.filter(d => d.status !== 'completed').length;
  const completedDemands = clientDemands.filter(d => d.status === 'completed').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
    >
      <header>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Bem-vindo, John Doe</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Acompanhe o progresso da Acme Corp em tempo real.</p>
      </header>

      <div className="dashboard-grid-kpis">
        <KPICard 
          title="Demandas Ativas" 
          value={pendingDemands.toString()} 
          icon={<Clock size={24} />}
          trend="neutral"
          index={0}
        />
        <KPICard 
          title="Entregas Concluídas" 
          value={completedDemands.toString()} 
          icon={<CheckCircle2 size={24} />}
          trend="up"
          trendValue="100%"
          index={1}
        />
        <KPICard 
          title="Health Score" 
          value="9.8" 
          icon={<TrendingUp size={24} />}
          trend="up"
          index={2}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Últimas Demandas</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => window.location.href='/client/demands'}>Ver todas</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {clientDemands.slice(0, 3).map((demand, idx) => (
              <Spotlight key={demand.id} className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{demand.type}</span>
                  <span className={`badge ${demand.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {demand.status === 'completed' ? 'Finalizado' : 'Em Produção'}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>{demand.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <Clock size={14} /> Previsão: {new Date(demand.dueDate).toLocaleDateString('pt-BR')}
                </div>
              </Spotlight>
            ))}
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
                  John, acabamos de subir as artes da campanha de Junho. Dê uma olhada na aba de demandas!
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
