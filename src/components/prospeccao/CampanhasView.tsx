"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { useConfirm } from "@/components/ConfirmProvider";
import { useAuth } from "@/hooks/useAuth";
import DialogShell from "@/components/DialogShell";
import EmptyState from "@/components/ui/EmptyState";
import { ORIGIN_LABEL, STAGES, campaignLabel, filterLeadsForCampaign, interpolate } from "@/lib/prospeccao/leads";
import { isOutsideBusinessHours } from "@/lib/prospeccao/schedule";
import { useProspeccao } from "./ProspeccaoProvider";
import type { Campaign, CampaignFilter, LeadOrigin, LeadStage } from "@/types/database";

function toggle<T>(arr: T[] | undefined, v: T): T[] {
  const a = arr ?? [];
  return a.includes(v) ? a.filter((x) => x !== v) : [...a, v];
}

function CampaignModal({ onClose }: { onClose: () => void }) {
  const { leads, setCampaigns } = useProspeccao();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [nome, setNome] = useState("");
  const [template, setTemplate] = useState("Oi {{nome}}! Tudo bem? ");
  const [filtro, setFiltro] = useState<CampaignFilter>({ estagios: ["novo"] });
  const [saving, setSaving] = useState(false);

  const audience = useMemo(() => filterLeadsForCampaign(leads, filtro), [leads, filtro]);
  const sample = audience[0];

  const save = async () => {
    if (!nome.trim() || !template.trim()) return showToast("Dê um nome e escreva a mensagem.", "error");
    if (!audience.length) return showToast("O público está vazio.", "error");
    setSaving(true);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ nome: nome.trim(), template, filtro, status: "draft", created_by: currentUser?.id ?? null })
      .select()
      .single();
    if (error) { setSaving(false); return showToast("Erro: " + error.message, "error"); }
    await supabase.from("campaign_recipients").insert(audience.map((l) => ({ campaign_id: data.id, lead_id: l.id })));
    setCampaigns((prev) => [data as Campaign, ...prev]);
    setSaving(false);
    showToast("Campanha salva como rascunho.", "success");
    onClose();
  };

  return (
    <DialogShell isOpen onClose={onClose} title="Nova campanha" maxWidth="720px"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-accent" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar rascunho"}</button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="pp-label">Nome<input className="pp-input" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></label>
        <div>
          <div className="pp-label" style={{ marginBottom: 6 }}>Público: estágios</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STAGES.map((s) => (
              <button key={s.id} type="button" className={`btn btn-sm ${filtro.estagios?.includes(s.id) ? "btn-accent" : "btn-secondary"}`} onClick={() => setFiltro((f) => ({ ...f, estagios: toggle<LeadStage>(f.estagios, s.id) }))}>{s.label}</button>
            ))}
          </div>
          <div className="pp-label" style={{ margin: "10px 0 6px" }}>Origem</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(Object.keys(ORIGIN_LABEL) as LeadOrigin[]).map((o) => (
              <button key={o} type="button" className={`btn btn-sm ${filtro.origens?.includes(o) ? "btn-accent" : "btn-secondary"}`} onClick={() => setFiltro((f) => ({ ...f, origens: toggle<LeadOrigin>(f.origens, o) }))}>{ORIGIN_LABEL[o]}</button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}><strong>{audience.length}</strong> lead(s) com WhatsApp neste público.</div>
        </div>
        <label className="pp-label">Mensagem<textarea className="pp-textarea" rows={5} value={template} onChange={(e) => setTemplate(e.target.value)} /></label>
        <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>Variáveis: {"{{nome}}"}, {"{{empresa}}"}</div>
        {sample && (
          <div>
            <div className="pp-label" style={{ marginBottom: 6 }}>Pré-visualização ({sample.nome})</div>
            <div className="pp-bubble out" style={{ maxWidth: "100%" }}>{interpolate(template, sample)}</div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const PACES = [
  { id: "normal", label: "Normal (20–60 s entre mensagens)", min: 20, max: 60 },
  { id: "cauteloso", label: "Cauteloso (40–120 s, menor risco de bloqueio)", min: 40, max: 120 },
] as const;

function SendModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { reload } = useProspeccao();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState("");
  const [pace, setPace] = useState<(typeof PACES)[number]["id"]>("cauteloso");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    supabase.from("campaign_recipients").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id).eq("status", "pending").then(({ count }) => setRecipients(count ?? 0));
  }, [campaign.id]);

  const p = PACES.find((x) => x.id === pace)!;
  const runAt = mode === "later" && when ? new Date(when) : null;
  const outside = isOutsideBusinessHours(runAt ?? new Date());
  const minutes = recipients ? Math.ceil((recipients * ((p.min + p.max) / 2)) / 60) : 0;

  const send = async () => {
    if (mode === "later" && (!runAt || runAt.getTime() < Date.now() + 120_000)) return showToast("Escolha um horário a partir de 2 minutos no futuro.", "error");
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/prospeccao/campaigns/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ campaignId: campaign.id, runAt: runAt?.toISOString(), delayMin: p.min, delayMax: p.max }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return showToast(json.error || "Falha ao disparar a campanha.", "error");
    showToast(`Campanha agendada para ${json.recipients} contatos.`, "success");
    await reload();
    onClose();
  };

  return (
    <DialogShell isOpen onClose={onClose} title={`Disparar "${campaign.nome}"`} maxWidth="520px"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancelar</button><button className="btn btn-accent" onClick={send} disabled={busy || !recipients}>{busy ? "Agendando..." : mode === "now" ? "Disparar agora" : "Agendar disparo"}</button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: "var(--text-ui)" }}><strong>{recipients ?? "…"}</strong> destinatário(s) com WhatsApp. Cada um recebe a mensagem personalizada, em ordem e com intervalo aleatório.</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="pp-type-chip" data-active={mode === "now"} onClick={() => setMode("now")}>Agora</button>
          <button type="button" className="pp-type-chip" data-active={mode === "later"} onClick={() => setMode("later")}>Agendar</button>
        </div>
        {mode === "later" && (
          <label className="pp-label">Data e hora
            <input className="pp-input" type="datetime-local" min={toLocalInput(new Date(nowMs + 180_000))} value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
        )}
        <label className="pp-label">Ritmo de envio
          <select className="pp-select" value={pace} onChange={(e) => setPace(e.target.value as typeof pace)}>
            {PACES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <div className="pp-sched-hint">{recipients ? `Duração estimada: cerca de ${minutes} min depois de começar.` : ""}</div>
        {outside && <div className="pp-sched-hint" data-warn="true">Fora do horário comercial (8h–20h): respostas e bloqueios tendem a piorar. Considere agendar para amanhã de manhã.</div>}
        <div className="pp-sched-hint">Quem responder sai do envio de follow-ups e conta como resposta na campanha.</div>
      </div>
    </DialogShell>
  );
}

export default function CampanhasView() {
  const { campaigns, setCampaigns } = useProspeccao();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<Campaign | null>(null);

  const remove = async (c: Campaign) => {
    if (!(await confirm({ message: `Excluir a campanha "${c.nome}"?`, confirmText: "Excluir" }))) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) return showToast("Erro: " + error.message, "error");
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-accent" onClick={() => setOpen(true)}><Plus size={14} /> Nova campanha</button>
      </div>
      {campaigns.length === 0 ? (
        <EmptyState icon={<Megaphone size={20} />} title="Nenhuma campanha" description="Monte um público por estágio ou origem, escreva a mensagem com variáveis e salve como rascunho." action={<button className="btn btn-accent" onClick={() => setOpen(true)}>Criar campanha</button>} />
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {campaigns.map((c) => (
            <div key={c.id} className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong style={{ flex: 1 }}>{c.nome}</strong>
                <span className="pp-badge">{campaignLabel(c.status)}</span>
              </div>
              <div style={{ fontSize: "var(--text-ui)", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}>{c.template.slice(0, 140)}</div>
              <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                {c.status === "draft" ? (
                  <button className="btn btn-accent btn-sm" onClick={() => setSending(c)}><Send size={13} /> Disparar</button>
                ) : (
                  <span className="pp-sched-hint">{c.agendada_para ? `Programada para ${new Date(c.agendada_para).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                )}
                <button className="btn btn-ghost btn-icon" style={{ marginLeft: "auto" }} onClick={() => remove(c)} aria-label="Excluir"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <CampaignModal onClose={() => setOpen(false)} />}
      {sending && <SendModal campaign={sending} onClose={() => setSending(null)} />}
    </>
  );
}
