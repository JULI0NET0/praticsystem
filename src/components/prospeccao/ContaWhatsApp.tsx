"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
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
  webhookOutdated?: boolean;
  error?: string;
}

/**
 * Pílula compacta da conta de WhatsApp (canto do cabeçalho). O detalhe — número, webhook e
 * ações — fica num popover, e a cor do ponto avisa quando algo precisa de atenção.
 */
export default function ContaWhatsApp() {
  const { showToast } = useToast();
  const [conta, setConta] = useState<Conta | null>(null);
  const [fixing, setFixing] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? "";

  const load = useCallback(async () => {
    const res = await fetch("/api/prospeccao/uazapi/status", { headers: { Authorization: `Bearer ${await token()}` } }).catch(() => null);
    setConta(res?.ok ? await res.json() : null);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

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
    showToast("Webhook atualizado.", "success");
    load();
  };

  if (!conta) return null;

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const problem = !conta.configured ? "Não configurado" : !conta.connected ? "Desconectado" : !conta.webhookRegistered ? "Webhook ausente" : conta.webhookOutdated ? "Webhook desatualizado" : null;
  const tone = !conta.configured || !conta.connected ? "danger" : problem ? "warn" : "ok";
  const name = conta.configured ? conta.profileName || "WhatsApp" : "WhatsApp";

  return (
    <div className="pp-account" ref={boxRef}>
      <button type="button" className="pp-account-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Conta WhatsApp: ${name}${problem ? `, ${problem}` : ", conectada"}`}>
        {conta.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conta.avatar} alt="" width={22} height={22} />
        ) : (
          <span className="pp-account-initial">{name[0]}</span>
        )}
        <span className="pp-dot" data-tone={tone} />
        <strong>{name}</strong>
        {problem && <AlertTriangle size={13} color={tone === "danger" ? "var(--color-danger)" : "#CA8A04"} />}
      </button>

      {open && (
        <div className="pp-account-pop" role="dialog" aria-label="Conta WhatsApp">
          <div className="pp-account-row">
            {conta.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={conta.avatar} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong>{name}</strong>
              <div className="pp-hint">{conta.number ? formatPhone(conta.number) : conta.configured ? "" : `Modo ${conta.provider}`}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={load} aria-label="Atualizar status" title="Atualizar"><RefreshCw size={14} /></button>
          </div>
          <ul className="pp-account-checks">
            <li data-ok={conta.configured && conta.connected}>{conta.configured && conta.connected ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {!conta.configured ? "UAZAPI não configurada" : conta.connected ? "Número conectado" : conta.error || "Número desconectado"}</li>
            {conta.configured && conta.connected && (
              <li data-ok={Boolean(conta.webhookRegistered && !conta.webhookOutdated)}>
                {conta.webhookRegistered && !conta.webhookOutdated ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {!conta.webhookRegistered ? "Webhook não registrado: respostas não chegam" : conta.webhookOutdated ? "Webhook desatualizado: mensagens agendadas não aparecem" : "Webhook ativo"}
              </li>
            )}
          </ul>
          {conta.configured && conta.connected && (!conta.webhookRegistered || conta.webhookOutdated) && isHttps && (
            <button className="btn btn-accent" onClick={registerWebhook} disabled={fixing}>{fixing ? "Atualizando..." : conta.webhookRegistered ? "Atualizar webhook" : "Registrar webhook"}</button>
          )}
        </div>
      )}
    </div>
  );
}
