"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, AlertCircle, Search, Filter, Loader2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function ClientDemands() {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState("all");
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchDemands();
    }
  }, [currentUser]);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      // Primeiro buscamos o cliente vinculado a este usuário
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('portal_email', currentUser?.email)
        .single();

      if (client) {
        const { data } = await supabase
          .from('demands')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });

        if (data) setDemands(data);
      }
    } catch (err) {
      console.error("Erro ao buscar demandas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDemands = demands.filter(d => {
    if (filter === "all") return true;
    if (filter === "pending") return d.status !== 'completed';
    if (filter === "completed") return d.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 size={32} color="var(--accent)" />
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Minhas Demandas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Lista completa de atividades e entregas da agência.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className="input-dark"
            style={{ width: '160px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="pending">Em Aberto</option>
            <option value="completed">Concluídas</option>
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {filteredDemands.map((demand, idx) => (
          <motion.div
            key={demand.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Spotlight className="glass-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
                  textTransform: 'uppercase'
                }}>{demand.type}</span>
                <span className={`badge ${demand.status === 'completed' ? 'badge-success' :
                    demand.status === 'pending' ? 'badge-warning' : 'badge-accent'
                  }`}>
                  {demand.status === 'completed' ? 'Concluído' : demand.status === 'pending' ? 'Pendente' : 'Em Produção'}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>{demand.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {demand.description || 'A agência está trabalhando nesta demanda para entregar o melhor resultado para a Acme Corp.'}
                </p>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <Clock size={16} />
                  <span>Previsão de Entrega: <strong>{new Date(demand.due_date).toLocaleDateString('pt-BR')}</strong></span>
                </div>

                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: demand.status === 'completed' ? '100%' : '40%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ height: '100%', background: 'var(--accent)', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <button className="btn btn-secondary" style={{ width: '100%' }}>Ver Detalhes & Arquivos</button>
            </Spotlight>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
