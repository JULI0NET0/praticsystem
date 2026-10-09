"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, Check, Pencil, Phone, RefreshCw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { displayName, formatPhone, nameSuggestions } from "@/lib/prospeccao/leads";
import { useProspeccao } from "./ProspeccaoProvider";
import ImageLightbox from "./ImageLightbox";
import type { Lead } from "@/types/database";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Identidade do contato. O nome principal é o da NOSSA base (editável aqui); o que veio do
 * WhatsApp (perfil ou agenda do celular) aparece como sugestão e nunca sobrescreve o nosso.
 */
export default function ContactCard({ lead }: { lead: Lead }) {
  const { showToast } = useToast();
  const { updateLead } = useProspeccao();
  const [syncing, setSyncing] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const autoTried = useRef<string | null>(null);

  const name = displayName(lead);
  const suggestions = nameSuggestions(lead);
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

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

  const saveName = async (value: string) => {
    const next = value.trim();
    setEditing(false);
    if (!next || next === lead.nome) return;
    await updateLead(lead.id, { nome: next });
    showToast("Nome atualizado.", "success");
  };

  return (
    <div className="pp-contact">
      <button type="button" className="pp-contact-avatar" onClick={() => lead.wa_avatar_url && setZoom(true)} aria-label="Ampliar foto" disabled={!lead.wa_avatar_url}>
        {lead.wa_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.wa_avatar_url} alt={name} />
        ) : (
          <span>{initials}</span>
        )}
      </button>
      <div style={{ minWidth: 0, flex: 1 }}>
        {editing ? (
          <div className="pp-name-edit">
            <input
              className="pp-input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(draft); if (e.key === "Escape") setEditing(false); }}
              aria-label="Nome do contato"
            />
            <button className="btn btn-accent btn-icon" onClick={() => saveName(draft)} aria-label="Salvar nome"><Check size={15} /></button>
            <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)} aria-label="Cancelar"><X size={15} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <strong className="pp-contact-name" title={name}>{name}</strong>
            <button className="pp-icon-link" onClick={() => { setDraft(lead.nome); setEditing(true); }} aria-label="Editar nome" title="Editar nome na nossa base"><Pencil size={13} /></button>
            {lead.wa_is_business && <span className="pp-badge" title="Conta comercial"><BadgeCheck size={11} /> Comercial</span>}
          </div>
        )}
        <div className="pp-hint" style={{ marginTop: 2 }}>Nome na nossa base. O nome do celular não substitui este.</div>
        {lead.telefone && <div className="pp-contact-line"><Phone size={11} /> {formatPhone(lead.telefone)}</div>}
        {lead.wa_business_name && <div className="pp-contact-line"><Building2 size={11} /> {lead.wa_business_name}</div>}
        {lead.wa_about && <div className="pp-contact-line">“{lead.wa_about}”</div>}
      </div>
      <button className="btn btn-ghost btn-icon" onClick={() => sync()} disabled={syncing || !lead.telefone} aria-label="Atualizar dados do contato" title="Atualizar do WhatsApp">
        <RefreshCw size={14} className={syncing ? "spin" : undefined} />
      </button>
      {zoom && lead.wa_avatar_url && <ImageLightbox src={lead.wa_avatar_url} alt={name} onClose={() => setZoom(false)} />}

      {suggestions.length > 0 && (
        <div className="pp-name-suggestions">
          <div className="pp-section-title">Nomes encontrados no WhatsApp</div>
          {suggestions.map((s) => (
            <div key={s.source} className="pp-suggestion">
              <span><span style={{ color: "var(--color-text-tertiary)" }}>{s.label} · </span>{s.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => saveName(s.name)}>Usar este nome</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
