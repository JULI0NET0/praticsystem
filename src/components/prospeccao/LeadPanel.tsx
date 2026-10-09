"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Save, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { useProspeccao } from "./ProspeccaoProvider";
import LeadFields from "./LeadFields";
import ContactCard from "./ContactCard";
import { formFromLead, leadPatchFromForm, type LeadFormState } from "./leadForm";
import type { Lead, LeadActivity } from "@/types/database";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Painel de atendimento: edita cadastro, status e observações do lead sem sair da conversa. */
export default function LeadPanel({ lead }: { lead: Lead }) {
  const { updateLead, moveLead, convertToClient } = useProspeccao();
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<LeadFormState>(() => formFromLead(lead));
  const [initial] = useState(() => JSON.stringify(formFromLead(lead)));
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [note, setNote] = useState("");

  const dirty = JSON.stringify(form) !== saved;

  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from("lead_activities").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(30);
    setActivities((data || []) as LeadActivity[]);
  }, [lead.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do histórico
  useEffect(() => { loadActivities(); }, [loadActivities]);

  const save = async () => {
    const { data, error } = leadPatchFromForm(form);
    if (!data) return showToast(error ?? "Dados inválidos.", "error");
    if (data.estagio === "perdido" && !data.perdido_motivo) return showToast("Informe o motivo da perda.", "error");
    setSaving(true);
    const stageChanged = data.estagio !== lead.estagio;
    await updateLead(lead.id, data);
    if (stageChanged && data.estagio) await moveLead(lead.id, data.estagio);
    setSaved(JSON.stringify(form));
    setSaving(false);
    showToast("Cadastro atualizado.", "success");
    if (stageChanged) loadActivities();
  };

  const addNote = async () => {
    const text = note.trim();
    if (!text) return;
    const { data, error } = await supabase
      .from("lead_activities")
      .insert({ lead_id: lead.id, tipo: "nota", descricao: text, user_id: currentUser?.id ?? null })
      .select()
      .single();
    if (error) return showToast("Erro ao salvar observação: " + error.message, "error");
    setActivities((prev) => [data as LeadActivity, ...prev]);
    setNote("");
  };

  const authorName = (id?: string | null) => users.find((u) => u.id === id)?.name ?? "";
  const ig = lead.instagram;

  return (
    <>
      <ContactCard lead={lead} />
      {ig && (
        <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: "var(--text-caption)" }}>
          @{ig} <ExternalLink size={11} />
        </a>
      )}

      <LeadFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} single />

      <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 0, background: "var(--color-surface-raised)", padding: "8px 0" }}>
        <button className="btn btn-accent" style={{ flex: 1 }} onClick={save} disabled={!dirty || saving}><Save size={14} /> {saving ? "Salvando..." : dirty ? "Salvar alterações" : "Salvo"}</button>
        {!lead.client_id && <button className="btn btn-secondary btn-icon" title="Converter em cliente" aria-label="Converter em cliente" onClick={() => convertToClient(lead)}><UserCheck size={15} /></button>}
      </div>

      <div>
        <div className="pp-label" style={{ marginBottom: 6 }}>Observações</div>
        <textarea
          className="pp-textarea"
          rows={2}
          placeholder="Adicionar observação (Enter salva)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
        />
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} onClick={addNote} disabled={!note.trim()}>Adicionar</button>
      </div>

      <div className="pp-notes">
        {lead.notas && (
          <div className="pp-note">{lead.notas}<small>Nota anterior</small></div>
        )}
        {activities.map((a) => (
          <div key={a.id} className="pp-note" style={a.tipo === "nota" ? undefined : { background: "transparent", borderStyle: "dashed" }}>
            {a.descricao}
            <small>{a.tipo === "nota" ? "Observação" : a.tipo === "estagio" ? "Status" : "Conversão"} · {when(a.created_at)}{authorName(a.user_id) && ` · ${authorName(a.user_id)}`}</small>
          </div>
        ))}
        {!activities.length && !lead.notas && <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>Nenhuma observação ainda.</div>}
      </div>
    </>
  );
}
