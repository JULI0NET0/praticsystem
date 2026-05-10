"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import ThemeLogo from "@/components/ThemeLogo";
import { supabase } from "@/lib/supabase";
import Spotlight from "@/components/Spotlight";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Tenta encontrar o email se o usuário digitou um username (@...)
      let loginEmail = email;
      const cleanUsername = email.replace('@', '').toLowerCase();

      if (!email.includes('@') || email.startsWith('@')) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', cleanUsername)
          .single();

        if (userData) {
          loginEmail = userData.email;
        } else if (userError) {
          throw new Error("Usuário não encontrado.");
        }
      }

      // 2. Autentica com o Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          throw new Error("Usuário ou senha incorretos.");
        }
        throw authError;
      }

      // 3. Sucesso! Redireciona para o Workspace
      router.push("/admin/workspace");
    } catch (err: any) {
      setError(err.message || "Erro ao realizar o login.");
      setIsLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient Gradients */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(217, 72, 15, 0.15) 0%, rgba(10, 10, 10, 0) 70%)',
        top: '-200px',
        left: '-200px',
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(217, 72, 15, 0.08) 0%, rgba(10, 10, 10, 0) 70%)',
        bottom: '-150px',
        right: '-100px',
        borderRadius: '50%',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      {/* Login Card */}
      <div 
        className="glass-card animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '48px 32px',
          zIndex: 1,
          animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <ThemeLogo width={240} height={60} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            Acesso ao Sistema Integrado
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', 
              color: '#EF4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', 
              gap: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' 
            }}
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Usuário ou Email</label>
            <input 
              type="text" 
              className="input-dark" 
              placeholder="@usuario ou seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Senha</label>
              <a href="#" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Esqueci minha senha
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-dark" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setRememberMe(!rememberMe)}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: rememberMe ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              boxShadow: rememberMe ? '0 0 10px rgba(217, 72, 15, 0.3)' : 'none'
            }}>
              {rememberMe && <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '2px' }} />}
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
              Permanecer conectado
            </span>
          </div>

          <button 
            type="submit" 
            className="btn btn-accent" 
            style={{ marginTop: '8px', position: 'relative', overflow: 'hidden' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                <span>Autenticando...</span>
              </div>
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
