"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, Phone, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { formatPhone } from "@/lib/prospeccao/leads";
import type { Lead } from "@/types/database";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** Cartão do contato no WhatsApp: foto, nome, número, conta comercial e recado. */
export default function ContactCard({ lead }: { lead: Lead }) {
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const autoTried = useRef<string | null>(null);

  const sync = async (silent = false) => {
    setSyncing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/prospeccao/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ leadId: lead.id }),
    });
    setSyncing(false);
    if (!res.ok && !silent) {
      const json = await res.json().catch(() => ({}));
      showToast(json.error || "Falha ao atualizar o contato.", "error");
    } else if (res.ok && !silent) showToast("Dados do contato atualizados.", "success");
    // o realtime de `leads` traz os campos novos para a tela
  };

  // Sincroniza sozinho na primeira abertura (ou se os dados têm mais de 7 dias).
  useEffect(() => {
    if (!lead.telefone || autoTried.current === lead.id) return;
    autoTried.current = lead.id;
    const stale = !lead.wa_synced_at || Date.now() - new Date(lead.wa_synced_at).getTime() > STALE_MS;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização inicial
    if (stale) sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const displayName = lead.wa_contact_name || lead.wa_name || lead.nome;
  const initials = displayName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  return (
    <div className="pp-contact">
      <button type="button" className="pp-contact-avatar" onClick={() => lead.wa_avatar_url && setZoom(true)} aria-label="Ampliar foto" disabled={!lead.wa_avatar_url}>
        {lead.wa_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.wa_avatar_url} alt={displayName} />
        ) : (
          <span>{initials}</span>
        )}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</strong>
          {lead.wa_is_business && <span className="pp-badge" title="Conta comercial"><BadgeCheck size={11} /> Comercial</span>}
        </div>
        {lead.wa_name && lead.wa_name !== displayName && <div className="pp-contact-line">Nome no WhatsApp: {lead.wa_name}</div>}
        {lead.telefone && <div className="pp-contact-line"><Phone size={11} /> {formatPhone(lead.telefone)}</div>}
        {lead.wa_business_name && <div className="pp-contact-line"><Building2 size={11} /> {lead.wa_business_name}</div>}
        <div className="pp-contact-line" style={{ fontStyle: lead.wa_about ? "normal" : "italic" }}>
          {lead.wa_about ? `“${lead.wa_about}”` : "Recado de status indisponível neste provedor"}
        </div>
      </div>
      <button className="btn btn-ghost btn-icon" onClick={() => sync()} disabled={syncing || !lead.telefone} aria-label="Atualizar dados do contato" title="Atualizar do WhatsApp">
        <RefreshCw size={14} className={syncing ? "spin" : undefined} />
      </button>
      {zoom && lead.wa_avatar_url && (
        <div className="pp-lightbox" onClick={() => setZoom(false)} role="dialog" aria-label="Foto do perfil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lead.wa_avatar_url} alt={displayName} />
        </div>
      )}
    </div>
  );
}
