"use client";

import { useState, useEffect } from "react";
import { User, Settings, Shield, Bell, CreditCard, Save, Loader2 } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const TABS = [
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'settings', label: 'Preferências', icon: Settings },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email,
        phone: currentUser.phone || "",
        status_message: currentUser.status_message || "",
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          username: formData.username,
          phone: formData.phone,
          status_message: formData.status_message,
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      alert("Alterações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Loader2 size={40} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Configurações</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gerencie seu perfil e preferências do sistema.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px 12px 0 0',
                background: isActive ? 'rgba(217, 72, 15, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={18} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'var(--accent)',
                    zIndex: 1
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
            <Spotlight className="glass-card" style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent)', 
                fontSize: '3rem', fontWeight: 700, display: 'flex', alignItems: 'center', 
                justifyContent: 'center', color: '#fff', boxShadow: '0 0 30px rgba(217, 72, 15, 0.3)' 
              }}>
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentUser.name}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{currentUser.role}</p>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }}>Alterar Foto</button>
            </Spotlight>

            <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Completo</label>
                  <input 
                    className="input-dark" 
                    value={formData.name || ""} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Usuário (@)</label>
                  <input 
                    className="input-dark" 
                    value={formData.username || ""} 
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>E-mail</label>
                  <input className="input-dark" value={currentUser.email} disabled />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cargo</label>
                  <input className="input-dark" value={currentUser.role} disabled />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Telefone</label>
                  <input 
                    className="input-dark" 
                    value={formData.phone || ""} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Frase de Status</label>
                  <input 
                    className="input-dark" 
                    value={formData.status_message || ""} 
                    onChange={(e) => setFormData({...formData, status_message: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="btn btn-accent" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Alterações
                </button>
              </div>
            </Spotlight>
          </div>
        )}

        {activeTab === 'settings' && (
          <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Notificações por E-mail</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Receba atualizações sobre novos clientes e tarefas.</p>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '40px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Som de Notificação</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tocar aviso sonoro para novas notificações.</p>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '40px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Idioma do Sistema</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Escolha o idioma principal da interface.</p>
              </div>
              <select className="input-dark" style={{ width: '200px' }}>
                <option>Português (BR)</option>
                <option>English</option>
                <option>Español</option>
              </select>
            </div>
          </Spotlight>
        )}

        {activeTab === 'security' && (
          <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Alterar Senha</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Senha Atual</label>
                <input className="input-dark" type="password" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nova Senha</label>
                <input className="input-dark" type="password" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Confirmar Nova Senha</label>
                <input className="input-dark" type="password" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-accent">Atualizar Senha</button>
            </div>
          </Spotlight>
        )}
      </div>
    </div>
  );
}
