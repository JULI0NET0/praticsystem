"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Workflow, Lock } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-canvas)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-2xl p-8 shadow-xl space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center font-bold shadow-sm">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
              Automação Instagram
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Agência Prátic • Acesso Restrito
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
            Senha de acesso
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha..."
              className="w-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)] focus:border-[var(--color-terracotta)] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[var(--color-danger-wash)] border border-[var(--color-danger)]/30 rounded-xl text-xs text-[var(--color-danger-ink)] font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-[var(--color-terracotta)] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-on-accent)] font-semibold rounded-xl py-2.5 text-xs transition-all shadow-sm"
        >
          {loading ? "Entrando..." : "Entrar no Painel"}
        </button>
      </form>
    </div>
  );
}
