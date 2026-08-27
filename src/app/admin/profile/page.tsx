"use client";

import { useState, useEffect, useRef } from "react";
import { User, Settings, Shield, Bell, CreditCard, Save, Loader2, Camera, Smile, Sun, Moon } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserProfile } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({ title: '', message: '', type: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EMOJIS = ["☀️", "🌙", "🚀", "🔥", "☕", "💻", "🎨", "📈", "🎯", "✨"];

  useEffect(() => {
    setMounted(true);
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

  const processAvatarFile = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const size = Math.min(img.width, img.height);
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          const targetSize = 512;

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            'image/jpeg',
            0.92
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const processedBlob = await processAvatarFile(file);
      const filePath = `${currentUser.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

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
      showToast("Foto de perfil atualizada com alta resolução!", "success");
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header-info">
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '6px' }}>Configurações</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Gerencie seu perfil e preferências do sistema.</p>
      </div>

      <div className="profile-tabs-bar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="profile-tab-btn"
              style={{
                background: isActive ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
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
          <div className="profile-layout-grid">
            <Spotlight className="glass-card profile-card-spotlight" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '140px', height: '140px', borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-on-accent)', boxShadow: '0 0 30px color-mix(in oklab, var(--accent) 30%, transparent)',
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
                        background: formData.emoji === emoji ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'transparent',
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

            <Spotlight className="glass-card profile-card-spotlight" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="profile-form-grid">
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
                  className="btn btn-accent profile-save-btn"
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
          <Spotlight className="glass-card profile-card-spotlight" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Aparência do Sistema</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Alterne entre o Modo Claro (pergaminho) e Modo Escuro (carvão).</p>
              </div>
              {mounted && (
                <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-sunken)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: resolvedTheme === 'light' ? 'var(--accent)' : 'transparent',
                      color: resolvedTheme === 'light' ? 'var(--color-text-on-accent)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Sun size={16} /> Modo Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: resolvedTheme === 'dark' ? 'var(--accent)' : 'transparent',
                      color: resolvedTheme === 'dark' ? 'var(--color-text-on-accent)' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Moon size={16} /> Modo Escuro
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Notificações por E-mail</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Receba atualizações sobre novos clientes e tarefas.</p>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '40px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Som de Notificação</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tocar aviso sonoro para novas notificações.</p>
              </div>
              <input type="checkbox" defaultChecked style={{ width: '40px', height: '20px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Idioma do Sistema</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Escolha o idioma principal da interface.</p>
              </div>
              <select className="input-dark" style={{ width: '200px', maxWidth: '100%' }}>
                <option>Português (BR)</option>
                <option>English</option>
                <option>Español</option>
              </select>
            </div>
          </Spotlight>
        )}

        {activeTab === 'security' && (
          <Spotlight className="glass-card profile-card-spotlight" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              <button className="btn btn-accent profile-save-btn">Atualizar Senha</button>
            </div>
          </Spotlight>
        )}
      </div>
    </div>
  );
}
