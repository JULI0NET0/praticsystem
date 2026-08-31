"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import ThemeLogo from "@/components/ThemeLogo";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Determina se é email ou username (@...)
      let loginEmail = username.trim();

      if (!loginEmail.includes("@") || loginEmail.startsWith("@")) {
        const cleanUsername = loginEmail.replace("@", "").toLowerCase();

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email")
          .eq("username", cleanUsername)
          .single();

        if (userError || !userData) {
          throw new Error("Usuário não encontrado.");
        }
        loginEmail = userData.email;
      }

      // 2. Autentica no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          throw new Error("Senha incorreta ou credenciais inválidas.");
        }
        throw new Error(authError.message);
      }

      // 3. Verifica o tipo de usuário para direcionar ao painel correto
      const { data: staffData } = await supabase
        .from("users")
        .select("id")
        .eq("id", authData.user?.id)
        .single();

      if (staffData) {
        router.push("/admin/workspace");
      } else {
        router.push("/client/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao realizar o login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-theme="dark"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#141413",
        color: "#F5F4EF",
        overflow: "hidden",
        padding: "24px",
      }}
    >
      {/* Halo de luz terracota sutil no topo */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(217, 119, 87, 0.18) 0%, rgba(217, 119, 87, 0) 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Wallpaper escuro com textura e opacidade suave */}
      {mounted && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/wallpaper-dark.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.22,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Container principal animado */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: "430px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Cabeçalho com Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "18px",
            }}
          >
            <ThemeLogo width={250} height={60} forceTheme="dark" />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "999px",
              backgroundColor: "rgba(217, 119, 87, 0.12)",
              border: "1px solid rgba(217, 119, 87, 0.25)",
              color: "#E8A98D",
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            <ShieldCheck size={13} /> Sistema de Gestão
          </div>

          <h1
            style={{
              fontSize: "1.65rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#F5F4EF",
              margin: 0,
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            Bem-vindo de volta
          </h1>
          <p
            style={{
              color: "#96948B",
              fontSize: "0.9rem",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            Acesse seu workspace integrado
          </p>
        </div>

        {/* Card Escuro de Login */}
        <div
          style={{
            position: "relative",
            backgroundColor: "rgba(26, 25, 23, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "36px 30px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Mensagem de Erro */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(178, 59, 46, 0.15)",
                    border: "1px solid rgba(178, 59, 46, 0.35)",
                    color: "#E0897A",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Campo Usuário / Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label
                style={{
                  fontSize: "0.825rem",
                  fontWeight: 500,
                  color: "#B5B2A8",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <User size={14} style={{ color: "#D97757" }} /> Usuário ou E-mail
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  placeholder="@seunome ou seu@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#181715",
                    border: "1px solid #33312C",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: "#F5F4EF",
                    fontSize: "0.95rem",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#D97757";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 87, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#33312C";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 500,
                    color: "#B5B2A8",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Lock size={14} style={{ color: "#D97757" }} /> Senha
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setError("Para redefinir sua senha, entre em contato com o administrador do sistema.");
                  }}
                  style={{
                    fontSize: "0.775rem",
                    color: "#D97757",
                    textDecoration: "none",
                    fontWeight: 500,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#E8A98D")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#D97757")}
                >
                  Esqueci a senha
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "#181715",
                    border: "1px solid #33312C",
                    borderRadius: "12px",
                    padding: "12px 46px 12px 16px",
                    color: "#F5F4EF",
                    fontSize: "0.95rem",
                    letterSpacing: password && !showPassword ? "2px" : "normal",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#D97757";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 87, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#33312C";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#7A786F",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F5F4EF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#7A786F")}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Lembrar-me */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "5px",
                  border: rememberMe ? "1px solid #D97757" : "1px solid #4A4740",
                  backgroundColor: rememberMe ? "#D97757" : "#1A1917",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: rememberMe ? "0 0 10px rgba(217, 119, 87, 0.3)" : "none",
                }}
              >
                {rememberMe && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path
                      d="M1 4.5L4 7.5L10 1.5"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.825rem", color: "#96948B" }}>
                Permanecer conectado neste dispositivo
              </span>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #D97757 0%, #C96442 100%)",
                color: "#FFFFFF",
                fontSize: "0.975rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.75 : 1,
                boxShadow: "0 8px 24px -4px rgba(217, 119, 87, 0.4)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.filter = "brightness(1.05)";
                  e.currentTarget.style.boxShadow = "0 10px 28px -4px rgba(217, 119, 87, 0.55)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.filter = "none";
                  e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(217, 119, 87, 0.4)";
                }
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Workspace</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé Seguro */}
        <div style={{ textAlign: "center", marginTop: "28px" }}>
          <p style={{ margin: 0, fontSize: "0.775rem", color: "#5E5D59" }}>
            © 2026 Agência Prátic · Todos os direitos reservados
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "0.725rem", color: "#4A4740" }}>
            Conexão segura com criptografia de ponta a ponta
          </p>
        </div>
      </motion.div>
    </div>
  );
}
