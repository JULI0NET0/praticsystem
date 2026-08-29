"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white mb-1">
          Automação Instagram
        </h1>
        <p className="text-sm text-neutral-400 mb-6">
          Área pessoal — digite a senha para entrar.
        </p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-white placeholder-neutral-500 outline-none focus:border-blue-500 mb-3"
        />

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
