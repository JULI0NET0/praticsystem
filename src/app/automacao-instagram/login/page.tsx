"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import ThemeLogo from "@/components/ThemeLogo";
import PraticLabsLogo from "@/components/PraticLabsLogo";

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)]">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-6">
          <ThemeLogo width={220} height={52} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] p-7"
        >
          <PraticLabsLogo
            variant="cobrand"
            iconStyle="eye-accent"
            size="lg"
            subtitle="Automação Instagram"
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="ig-password" className="text-[13px] font-medium text-[var(--color-text-secondary)]">
              Senha de acesso
            </label>
            <div className="relative">
              <Lock
                size={15}
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-terracotta-ink)]"
              />
              <input
                id="ig-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                aria-invalid={error ? true : undefined}
                className="w-full box-border rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] py-3 pl-10 pr-3.5 text-[15px] text-[var(--color-text-primary)] outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-info)]"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-wash)] p-3 text-[13px] text-[var(--color-danger-ink)]"
            >
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border-0 bg-[var(--color-terracotta)] px-3 py-3 text-[15px] font-semibold text-[var(--color-text-on-accent)] hover:bg-[var(--color-terracotta-hover-solid)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-info)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
