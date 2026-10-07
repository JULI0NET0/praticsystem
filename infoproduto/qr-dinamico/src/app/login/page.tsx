"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase, hasPublicSupabaseEnv } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const ready = hasPublicSupabaseEnv();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setPending(true);
    try {
      const supabase = createBrowserSupabase();
      if (mode === "signup") {
        const { data, error: signError } = await supabase.auth.signUp({ email, password });
        if (signError) throw signError;
        if (!data.session) {
          setInfo("Conta criada. Confirme o e-mail ou desative a confirmação no Supabase para entrar na hora.");
          return;
        }
      } else {
        const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
        if (signError) throw signError;
      }
      router.push("/painel");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="wrap">
      <div className="card pad stack" style={{ maxWidth: 420, margin: "48px auto" }}>
        <h2>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
        <p className="muted" style={{ margin: 0 }}>
          O painel pede login. Quem escaneia o QR não precisa de conta.
        </p>
        {!ready && (
          <p className="error">Copie .env.example para .env.local e preencha a URL e a chave anônima.</p>
        )}
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {error && <p className="error">{error}</p>}
          {info && <p className="hint">{info}</p>}
          <button className="btn" type="submit" disabled={pending || !ready}>
            {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button
          className="btn-ghost"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "Criar uma conta" : "Já tenho conta"}
        </button>
      </div>
    </main>
  );
}
