"use client";

import { useState, useEffect, useRef } from "react";
import { User, Settings, Shield, Bell, CreditCard, Save, Loader2, Camera, Smile } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import CustomModal from "@/components/CustomModal";
import { formatPhone } from "@/utils/masks";

const TABS = [
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'settings', label: 'Preferências', icon: Settings },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export default function ProfilePage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({ title: '', message: '', type: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EMOJIS = ["☀️", "🌙", "🚀", "🔥", "☕", "💻", "🎨", "📈", "🎯", "✨"];

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email,
        phone: currentUser.phone ? formatPhone(currentUser.phone) : "",
        status_message: currentUser.status_message || "",
        emoji: currentUser.emoji || "☀️",
        avatar_url: currentUser.avatar_url
      });
    }
  }, [currentUser]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUser.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      showToast("Foto de perfil atualizada!", "success");
    } catch (err) {
      console.error("Erro ao subir foto:", err);
      showToast("Erro ao atualizar foto.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          username: formData.username,
          phone: formData.phone?.replace(/\D/g, ''),
          status_message: formData.status_message,
          emoji: formData.emoji,
          workspace_settings: {
            ...currentUser.workspace_settings,
            status: formData.status_message
          }
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setModalConfig({
        title: 'Sucesso!',
        message: 'Suas alterações foram salvas com sucesso no banco de dados.',
        type: 'success'
      });
      setShowModal(true);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      showToast("Erro ao salvar alterações.", "error");
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
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '140px', height: '140px', borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 0 30px rgba(217, 72, 15, 0.3)',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden'
                }}
              >
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '3rem', fontWeight: 700 }}>{currentUser.name.substring(0, 2).toUpperCase()}</span>
                )}

                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                  {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} hidden accept="image/*" />

              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{currentUser.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Shield size={14} color="var(--accent)" /> {currentUser.role}
                </p>
              </div>

              <div style={{ width: '100%', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Emoji do Dia</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setFormData({ ...formData, emoji })}
                      style={{
                        fontSize: '1.2rem', padding: '6px', borderRadius: '8px',
                        background: formData.emoji === emoji ? 'rgba(217, 72, 15, 0.2)' : 'transparent',
                        border: formData.emoji === emoji ? '1px solid var(--accent)' : '1px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </Spotlight>

            <Spotlight className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nome Completo</label>
                  <input
                    className="input-dark"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Usuário (@)</label>
                  <input
                    className="input-dark"
                    value={formData.username || ""}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                    placeholder="(00) 00000-0000"
                    value={formData.phone || ""}
                    onChange={handlePhoneChange}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Frase de Status</label>
                  <input
                    className="input-dark"
                    placeholder="O que você está fazendo agora?"
                    value={formData.status_message || ""}
                    onChange={(e) => setFormData({ ...formData, status_message: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn btn-accent"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Alterações
                </button>
              </div>
            </Spotlight>
          </div>
        )}

        <CustomModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
        />

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
