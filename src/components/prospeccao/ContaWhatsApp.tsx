"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { formatPhone } from "@/lib/prospeccao/leads";

interface Conta {
  provider: string;
  configured: boolean;
  connected: boolean;
  profileName?: string | null;
  number?: string | null;
  avatar?: string | null;
  webhookRegistered?: boolean;
  error?: string;
}

export default function ContaWhatsApp() {
  const { showToast } = useToast();
  const [conta, setConta] = useState<Conta | null>(null);
  const [fixing, setFixing] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? "";

  const load = useCallback(async () => {
    const res = await fetch("/api/prospeccao/uazapi/status", { headers: { Authorization: `Bearer ${await token()}` } }).catch(() => null);
    setConta(res?.ok ? await res.json() : null);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
  useEffect(() => { load(); }, [load]);

  const registerWebhook = async () => {
    setFixing(true);
    const res = await fetch("/api/prospeccao/uazapi/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ baseUrl: window.location.origin }),
    });
    const json = await res.json().catch(() => ({}));
    setFixing(false);
    if (!res.ok) return showToast(json.error || "Falha ao registrar o webhook.", "error");
    showToast("Webhook registrado. Respostas passam a chegar aqui.", "success");
    load();
  };

  if (!conta) return null;
  if (!conta.configured) {
    return (
      <div className="pp-conta"><AlertTriangle size={15} color="var(--color-danger)" />
        WhatsApp não configurado (modo {conta.provider}). Defina WA_PROVIDER=uazapi, UAZAPI_BASE_URL e UAZAPI_TOKEN.
      </div>
    );
  }
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  return (
    <div className="pp-conta">
      {conta.avatar && <img src={conta.avatar} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />}
      <span className="dot" style={{ background: conta.connected ? "var(--color-success)" : "var(--color-danger)" }} />
      <strong>{conta.profileName || "Conta WhatsApp"}</strong>
      <span style={{ color: "var(--color-text-tertiary)" }}>{conta.number ? formatPhone(conta.number) : ""} · {conta.connected ? "conectado" : conta.error || "desconectado"}</span>
      {conta.connected && !conta.webhookRegistered && (
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-danger)" }}>
          <AlertTriangle size={14} /> Respostas não chegam: webhook não registrado.
          {isHttps && <button className="btn btn-accent btn-sm" onClick={registerWebhook} disabled={fixing}>{fixing ? "Registrando..." : "Registrar agora"}</button>}
        </span>
      )}
      <button className="btn btn-ghost btn-icon" style={{ marginLeft: conta.webhookRegistered ? "auto" : 0 }} onClick={load} aria-label="Atualizar"><RefreshCw size={14} /></button>
    </div>
  );
}
