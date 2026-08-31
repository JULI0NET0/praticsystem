"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Workflow, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import ThemeLogo from "@/components/ThemeLogo";

export default function InstagramAutomationLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/instagram/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Senha incorreta.");
        setLoading(false);
        return;
      }

      router.push("/automacao-instagram");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

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
          width: "600px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(217, 119, 87, 0.16) 0%, rgba(217, 119, 87, 0) 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <ThemeLogo width={220} height={52} forceTheme="dark" />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: "rgba(26, 25, 23, 0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "32px 28px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #D97757 0%, #C96442 100%)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(217, 119, 87, 0.3)",
              }}
            >
              <Workflow size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#F5F4EF" }}>
                Automação Instagram
              </h1>
              <p style={{ fontSize: "0.8rem", color: "#96948B", margin: "2px 0 0" }}>
                Acesso ao Painel de Gatilhos
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <label style={{ fontSize: "0.825rem", fontWeight: 500, color: "#B5B2A8" }}>
              Senha de acesso
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={15}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#D97757",
                }}
              />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "#181715",
                  border: "1px solid #33312C",
                  borderRadius: "12px",
                  padding: "12px 14px 12px 38px",
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

          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(178, 59, 46, 0.15)",
                border: "1px solid rgba(178, 59, 46, 0.35)",
                borderRadius: "12px",
                color: "#E0897A",
                fontSize: "0.825rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #D97757 0%, #C96442 100%)",
              color: "#FFFFFF",
              fontSize: "0.925rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: loading || !password ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.6 : 1,
              boxShadow: "0 6px 20px -4px rgba(217, 119, 87, 0.4)",
              transition: "transform 0.15s ease, filter 0.15s ease",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
