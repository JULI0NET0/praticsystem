"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, LogIn, ArrowRight } from "lucide-react";
import ThemeLogo from "@/components/ThemeLogo";
import Spotlight from "@/components/Spotlight";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const brandName = "Agência Prátic"; // Pode ser trazido de um config ou banco

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Determine if input is email or username
      let loginEmail = username.trim();

      if (!loginEmail.includes('@') || loginEmail.startsWith('@')) {
        // É um username
        const cleanUsername = loginEmail.replace('@', '').toLowerCase();

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', cleanUsername)
          .single();

        if (userError || !userData) {
          throw new Error("Usuário não encontrado.");
        }
        loginEmail = userData.email;
      }

      // 2. Authenticate with Supabase Auth using the resolved email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error("Senha incorreta ou credenciais inválidas.");
        }
        throw new Error(authError.message);
      }

      // 3. Verifica qual o tipo de usuário para redirecionar corretamente
      const { data: staffData } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user?.id)
        .single();

      if (staffData) {
        // É membro da equipe
        router.push("/admin/workspace");
      } else {
        // É cliente
        router.push("/client/dashboard");
      }

    } catch (err: any) {
      setError(err.message || "Erro ao realizar o login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(217, 72, 15, 0.15), transparent 60%)',
      padding: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <ThemeLogo />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Bem-vindo à {brandName}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Acesse o seu workspace administrativo</p>
        </div>

        <Spotlight className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.875rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                {error}
              </motion.div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} /> Usuário ou E-mail
              </label>
              <input
                type="text"
                className="input-dark"
                placeholder="@seunome ou seu@email.com"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ fontSize: '1rem', padding: '12px 16px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} /> Senha
                </label>
                <a href="#" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>Esqueci a senha</a>
              </div>
              <input
                type="password"
                className="input-dark"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: '1rem', padding: '12px 16px', letterSpacing: password ? '4px' : 'normal' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-accent"
              disabled={isLoading}
              style={{ width: '100%', marginTop: '8px', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              ) : (
                <>Entrar no Workspace <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </Spotlight>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          © 2026 {brandName}. Área restrita.
        </p>
      </motion.div>
    </div>
  );
}
