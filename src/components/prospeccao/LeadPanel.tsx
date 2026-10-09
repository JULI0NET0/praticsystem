"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { TYPE_LABEL } from "@/lib/prospeccao/classify";
import { useProspeccao } from "./ProspeccaoProvider";
import LeadFields from "./LeadFields";
import ContactCard from "./ContactCard";
import ClientLinker from "./ClientLinker";
import { formFromLead, leadPatchFromForm, type LeadFormState } from "./leadForm";
import type { ContactType, Lead, LeadActivity } from "@/types/database";

type Tab = "cadastro" | "observacoes" | "atividade";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Gaveta de contato. Estrutura: cabeçalho, abas, corpo rolável e rodapé de salvar fora da rolagem.
 * Remonta por conversa (key), então o scroll sempre começa no topo.
 */
export default function LeadPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { updateLead, moveLead, setContactType } = useProspeccao();
  const { currentUser, users } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("cadastro");
  const [form, setForm] = useState<LeadFormState>(() => formFromLead(lead));
  const [saved, setSaved] = useState(() => JSON.stringify(formFromLead(lead)));
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [note, setNote] = useState("");

  const dirty = JSON.stringify(form) !== saved;

  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from("lead_activities").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(50);
    setActivities((data || []) as LeadActivity[]);
  }, [lead.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga do histórico
  useEffect(() => { loadActivities(); }, [loadActivities]);

  const save = useCallback(async () => {
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
  }, [form, lead.estagio, lead.id, loadActivities, moveLead, showToast, updateLead]);

  // Ctrl/Cmd+S salva o cadastro
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && dirty && !saving) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, save]);

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
  const notes = activities.filter((a) => a.tipo === "nota");
  const history = activities.filter((a) => a.tipo !== "nota");
  const ig = lead.instagram;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "cadastro", label: "Cadastro" },
    { id: "observacoes", label: "Observações", count: notes.length + (lead.notas ? 1 : 0) },
    { id: "atividade", label: "Atividade", count: history.length },
  ];

  return (
    <div className="pp-panel">
      <div className="pp-drawer-head">
        <strong>Contato</strong>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar dados do contato" title="Fechar (Esc)"><X size={16} /></button>
      </div>

      <div className="pp-panel-top">
        <div className="pp-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} data-active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}{t.count ? <span className="pp-tab-count">{t.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="pp-panel-body">
        {tab === "cadastro" && (
          <>
            <ContactCard lead={lead} />
            {ig && (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: "var(--text-caption)", marginTop: -12 }}>
                @{ig} <ExternalLink size={11} />
              </a>
            )}

            <section className="pp-section">
              <div className="pp-section-title">Tipo de contato</div>
              <select className="pp-select" value={lead.tipo ?? "lead"} onChange={(e) => setContactType(lead.id, e.target.value as ContactType)} aria-label="Tipo de contato">
                {(Object.keys(TYPE_LABEL) as ContactType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </section>

            <section className="pp-section">
              <div className="pp-section-title">Cliente</div>
              <ClientLinker lead={lead} />
            </section>

            <section className="pp-section">
              <div className="pp-section-title">Dados</div>
              <LeadFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} single isLead={(lead.tipo ?? "lead") === "lead"} />
            </section>
          </>
        )}

        {tab === "observacoes" && (
          <>
            <textarea
              className="pp-textarea"
              rows={3}
              placeholder="Escreva uma observação (Enter salva, Shift+Enter quebra linha)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(); } }}
            />
            <button className="btn btn-accent btn-sm" style={{ alignSelf: "flex-start" }} onClick={addNote} disabled={!note.trim()}>Adicionar observação</button>
            <div className="pp-notes">
              {notes.map((a) => (
                <div key={a.id} className="pp-note">
                  {a.descricao}
                  <small>{when(a.created_at)}{authorName(a.user_id) && ` · ${authorName(a.user_id)}`}</small>
                </div>
              ))}
              {lead.notas && <div className="pp-note">{lead.notas}<small>Nota anterior</small></div>}
              {!notes.length && !lead.notas && <div className="pp-empty">Nenhuma observação ainda.</div>}
            </div>
          </>
        )}

        {tab === "atividade" && (
          <div className="pp-notes">
            {history.map((a) => (
              <div key={a.id} className="pp-note" style={{ background: "transparent", borderStyle: "dashed" }}>
                {a.descricao}
                <small>{a.tipo === "estagio" ? "Status" : "Conversão"} · {when(a.created_at)}{authorName(a.user_id) && ` · ${authorName(a.user_id)}`}</small>
              </div>
            ))}
            {!history.length && <div className="pp-empty">Sem mudanças de status ainda.</div>}
          </div>
        )}
      </div>

      {tab === "cadastro" && (
        <div className="pp-panel-foot">
          <button className="btn btn-accent" style={{ flex: 1, height: 44 }} onClick={save} disabled={!dirty || saving} title="Ctrl/Cmd + S">
            <Save size={14} /> {saving ? "Salvando..." : dirty ? "Salvar alterações" : "Tudo salvo"}
          </button>
        </div>
      )}
    </div>
  );
}
