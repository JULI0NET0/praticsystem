"use client";

import { useParams, useRouter } from "next/navigation";
// import { roles } from "@/mocks/db"; // Removido mock
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Mail, 
  AtSign, 
  Shield, 
  Clock, 
  ClipboardList, 
  CheckCircle2, 
  Calendar,
  MessageSquare,
  MoreVertical,
  Activity
} from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion } from "framer-motion";

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [userDemands, setUserDemands] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchRoles(), fetchUserDetails()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*');
    if (data) setRoles(data);
  };

  const fetchUserDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setUser({
          ...data,
          avatarUrl: data.avatar_url,
          statusMessage: data.status_message
        });
      }

      // Fetch demands for this user
      const { data: demandsData } = await supabase
        .from('demands')
        .select('*')
        .eq('assigned_to', id); // Assuming assigned_to is the field name
      
      if (demandsData) {
        setUserDemands(demandsData);
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes do usuário:", err);
    } finally {
      setLoading(false);
    }
  };

  const userRole = roles.find(r => r.id === user?.role);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(217, 72, 15, 0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Membro não encontrado</h2>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Voltar
        </button>
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
      {/* Header com Navegação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <motion.button 
          whileHover={{ x: -4 }}
          onClick={() => router.back()}
          style={{ 
            width: '40px', height: '40px', borderRadius: '12px', 
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Perfil do Membro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Detalhes e produtividade de {user.name}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary"><MoreVertical size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        {/* Lado Esquerdo: Info Cartão */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Spotlight className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent)', 
              margin: '0 auto 20px', fontSize: '3rem', fontWeight: 700, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 0 30px rgba(217, 72, 15, 0.3)', position: 'relative'
            }}>
              {user.name.substring(0, 2).toUpperCase()}
              <div style={{ 
                position: 'absolute', bottom: '5px', right: '5px', 
                width: '24px', height: '24px', borderRadius: '50%', 
                backgroundColor: '#22C55E', border: '4px solid var(--bg-secondary)' 
              }} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>{user.name}</h3>
            <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '16px' }}>{userRole?.name}</p>
            
            {user.statusMessage && (
              <div style={{ 
                padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', 
                fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' 
              }}>
                "{user.statusMessage}"
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                <AtSign size={16} color="var(--text-secondary)" />
                <span>@{user.username}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                <Mail size={16} color="var(--text-secondary)" />
                <span>{user.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                <Shield size={16} color="var(--text-secondary)" />
                <span>Nível de Acesso: {user.role}</span>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              <button 
                onClick={() => {
                  if(confirm(`Deseja realmente redefinir a senha de ${user.name}?`)) {
                    alert('Um link de redefinição foi enviado para o email corporativo ou a senha foi resetada para o padrão.');
                  }
                }}
                className="btn btn-secondary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Shield size={16} /> Redefinir Senha
              </button>
            </div>
          </Spotlight>

          <Spotlight className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent)" /> Atividade Recente
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '2px', background: 'var(--border)', margin: '4px 0' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Entrou no sistema</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hoje às 08:30</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '2px', background: 'var(--accent)', margin: '4px 0' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Atualizou demanda #452</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Há 2 horas</p>
                </div>
              </div>
            </div>
          </Spotlight>
        </div>

        {/* Lado Direito: Stats e Demandas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Grid de Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Spotlight className="glass-card" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Demandas Ativas</p>
              <h4 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{userDemands.length}</h4>
            </Spotlight>
            <Spotlight className="glass-card" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Taxa de Entrega</p>
              <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22C55E' }}>94%</h4>
            </Spotlight>
            <Spotlight className="glass-card" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Horas/Mês</p>
              <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>164h</h4>
            </Spotlight>
          </div>

          {/* Lista de Demandas */}
          <Spotlight className="glass-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ClipboardList size={22} color="var(--accent)" /> Demandas Sob Responsabilidade
              </h3>
              <button className="btn btn-secondary btn-sm">Ver Histórico</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {userDemands.length > 0 ? userDemands.map(demand => (
                <div key={demand.id} style={{ 
                  padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', 
                  background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <h5 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{demand.title}</h5>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {demand.dueDate}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> {demand.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={`badge ${demand.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                      {demand.priority === 'high' ? 'Alta' : 'Média'}
                    </span>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Nenhuma demanda ativa no momento.
                </div>
              )}
            </div>
          </Spotlight>

          {/* Agenda Individual */}
          <Spotlight className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={22} color="var(--accent)" /> Próximos Compromissos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>AMANHÃ às 14:00</p>
                <p style={{ fontWeight: 600 }}>Daily de Alinhamento</p>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>15 MAI às 10:00</p>
                <p style={{ fontWeight: 600 }}>Reunião de Feedback</p>
              </div>
            </div>
          </Spotlight>
        </div>
      </div>
    </motion.div>
  );
}
