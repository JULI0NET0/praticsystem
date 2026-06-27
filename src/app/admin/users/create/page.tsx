"use client";

// import { roles } from "@/mocks/db"; // Removido mock
import { ArrowLeft, UserPlus, AtSign, Mail, User, Shield, MessageSquare, Plus } from "lucide-react";
import Spotlight from "@/components/Spotlight";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/utils/masks";
import { useToast } from "@/components/CustomToast";
import CustomModal from "@/components/CustomModal";

export default function CreateUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "",
    statusMessage: "",
    avatarUrl: "",
    phone: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetPasswordOption, setResetPasswordOption] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase.from('roles').select('*');
      if (data) setRoles(data);
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Criar cliente temporário para não deslogar o admin atual
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });

      // Se a opção de reset de senha estiver ativa, gera uma senha temporária aleatória e segura
      const passwordToUse = resetPasswordOption
        ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        : formData.password;

      if (!passwordToUse) {
        throw new Error("Senha temporária é obrigatória.");
      }

      // 2. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: passwordToUse,
        options: {
          data: {
            full_name: formData.name,
            username: formData.username
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar credenciais de acesso.");

      // 3. Inserindo o usuário na tabela public.users vinculado ao ID do Auth
      const { error } = await supabase.from('users').insert([{
        id: authData.user.id,
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        status_message: formData.statusMessage,
        avatar_url: formData.avatarUrl,
        phone: formData.phone.replace(/\D/g, '')
      }]);

      if (error) throw error;

      // Dispara o e-mail de redefinição se a opção estiver marcada
      if (resetPasswordOption) {
        try {
          await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email }),
          });
        } catch (resetErr) {
          console.error("Erro ao enviar e-mail de redefinição:", resetErr);
        }
      }

      showToast("Membro da equipe cadastrado com sucesso!", "success");
      router.push("/admin/users");
    } catch (err: any) {
      console.error("Erro ao criar usuário:", err);
      showToast(err.message || "Erro ao criar membro da equipe. Verifique os dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/admin/users" className="btn-icon" style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '4px' }}>Criar Novo Membro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Cadastre um novo membro diretamente no sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Upload de Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '24px',
              background: 'rgba(217, 72, 15, 0.05)', border: '2px dashed rgba(217, 72, 15, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={32} color="var(--text-secondary)" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" })} // Simula upload
              style={{
                position: 'absolute', bottom: '-8px', right: '-8px',
                background: 'var(--accent)', color: 'white', border: '2px solid var(--bg-primary)',
                width: '32px', height: '32px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Nome Completo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} /> Nome Completo
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="Ex: João Silva"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Handle @usuario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AtSign size={14} /> Usuário (para menções)
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="joao.silva"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} /> Email Corporativo
            </label>
            <input
              type="email"
              className="input-dark"
              placeholder="joao@agenciapratic.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Senha Inicial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: resetPasswordOption ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> Senha Temporária
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-dark"
                placeholder={resetPasswordOption ? "Gerada automaticamente" : "••••••••"}
                required={!resetPasswordOption}
                disabled={resetPasswordOption}
                value={resetPasswordOption ? "" : formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingRight: '40px' }}
              />
              {!resetPasswordOption && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Opção de Resetar Senha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '-8px' }}>
          <input
            type="checkbox"
            id="resetPasswordOption"
            checked={resetPasswordOption}
            onChange={(e) => setResetPasswordOption(e.target.checked)}
            style={{
              width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)',
              borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)'
            }}
          />
          <label htmlFor="resetPasswordOption" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            Enviar e-mail para o usuário redefinir/criar sua própria senha (não exige senha temporária)
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Cargo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> Cargo / Função
            </label>
            <select
              className="input-dark"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="" disabled>Selecione um cargo</option>
              {roles.filter(r => r.id !== 'client').map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {/* Frase de Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={14} /> Frase de Status (Bio)
            </label>
            <input
              className="input-dark"
              placeholder="Focado em resultados 🚀"
              value={formData.statusMessage}
              onChange={(e) => setFormData({ ...formData, statusMessage: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Telefone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> Telefone / WhatsApp
            </label>
            <input
              type="text"
              className="input-dark"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
          <Link href="/admin/users" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            Cancelar
          </Link>
          <Spotlight as="button" type="submit" className="btn btn-accent" disabled={loading}>
            {loading ? "Criando..." : <><UserPlus size={18} /> Criar Novo Usuário</>}
          </Spotlight>
        </div>
      </form>
    </motion.div>
  );
}
