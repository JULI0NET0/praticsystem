"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Check } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { applyMerge, buildMerge, defaultChoices, notesToImport, type MergeChoice, type MergeField } from "@/lib/prospeccao/clientMerge";
import { formatPhone, normalizePhone } from "@/lib/prospeccao/leads";
import type { Client, Lead, LeadActivity } from "@/types/database";
import type { LinkPlan } from "./ProspeccaoProvider";

interface Props {
  lead: Lead;
  client: Client;
  activities: LeadActivity[];
  author: string;
  /** Texto do botão principal (Vincular e importar / Aplicar). */
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (plan: LinkPlan) => void;
}

const show = (f: MergeField, v: string) => {
  if (!v) return "—";
  if (f.key === "telefone") return formatPhone(normalizePhone(v)) || v;
  if (f.key === "cnpj" && v.length === 14) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return v;
};

/** "Conferir dados": vazios são preenchidos sozinhos; conflitos aparecem lado a lado para escolher. */
export default function ClientMergeDialog({ lead, client, activities, author, confirmLabel, busy, onCancel, onConfirm }: Props) {
  const fields = useMemo(() => buildMerge(lead, client), [lead, client]);
  const [choices, setChoices] = useState<Record<string, MergeChoice>>(() => defaultChoices(fields));
  const noteList = useMemo(() => notesToImport(lead, activities, client.notes, author), [lead, activities, client.notes, author]);
  const [importNotes, setImportNotes] = useState(true);

  const set = (key: string, c: MergeChoice) => setChoices((prev) => ({ ...prev, [key]: c }));
  const conflicts = fields.filter((f) => f.state === "conflict").length;
  const fills = fields.filter((f) => f.state === "fill_client" || f.state === "fill_lead").length;
  const label = client.nome_fantasia?.trim() || client.name;

  const confirm = () => {
    const { clientPatch, leadPatch, changed } = applyMerge(client, fields, choices);
    onConfirm({ clientPatch, leadPatch, changed, notes: importNotes ? noteList : [] });
  };

  return (
    <DialogShell
      isOpen
      onClose={onCancel}
      title={`Conferir dados · ${label}`}
      maxWidth="760px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button className="btn btn-accent" onClick={confirm} disabled={busy}>{busy ? "Aplicando..." : confirmLabel}</button>
        </>
      }
    >
      <div className="pp-merge">
        <p className="pp-hint" style={{ margin: 0 }}>
          O contato passa a ser <strong>Cliente</strong> e sai do funil. Campos vazios são preenchidos nos dois cadastros;
          onde os valores diferem, escolha qual vale. {fills ? `${fills} campo(s) a preencher` : "Nada a preencher"}{conflicts ? `, ${conflicts} conflito(s)` : ""}.
        </p>

        <div className="pp-merge-table" role="table" aria-label="Comparação de dados">
          <div className="pp-merge-head" role="row">
            <span>Campo</span><span>Lead / contato</span><span>Cadastro do cliente</span>
          </div>
          {fields.map((f) => (
            <div key={f.key} className="pp-merge-row" role="row" data-state={f.state}>
              <span className="pp-merge-label">{f.label}</span>

              {f.state === "same" ? (
                <span className="pp-merge-same" style={{ gridColumn: "2 / 4" }}><Check size={13} /> {show(f, f.leadValue)} <em>igual nos dois</em></span>
              ) : (
                <>
                  <button
                    type="button"
                    className="pp-merge-cell"
                    data-picked={choices[f.key] === "lead"}
                    data-empty={!f.leadValue}
                    disabled={!f.leadValue}
                    onClick={() => set(f.key, choices[f.key] === "lead" ? "skip" : "lead")}
                    aria-pressed={choices[f.key] === "lead"}
                    title={f.state === "fill_client" ? "Copiar para o cadastro do cliente" : "Usar o valor do lead nos dois"}
                  >
                    {show(f, f.leadValue)}
                    {f.state === "fill_client" && <small>copiar para o cliente</small>}
                  </button>
                  <button
                    type="button"
                    className="pp-merge-cell"
                    data-picked={choices[f.key] === "client"}
                    data-empty={!f.clientValue}
                    disabled={!f.clientValue}
                    onClick={() => set(f.key, choices[f.key] === "client" ? "skip" : "client")}
                    aria-pressed={choices[f.key] === "client"}
                    title={f.state === "fill_lead" ? "Copiar para o lead" : "Usar o valor do cliente nos dois"}
                  >
                    {show(f, f.clientValue)}
                    {f.state === "fill_lead" && <small>copiar para o lead</small>}
                  </button>
                </>
              )}
            </div>
          ))}
          {!fields.length && <div className="pp-empty" style={{ padding: 16 }}>Nenhum dado para comparar. O vínculo será criado direto.</div>}
        </div>

        <label className="pp-check">
          <input type="checkbox" checked={importNotes} disabled={!noteList.length} onChange={(e) => setImportNotes(e.target.checked)} />
          {noteList.length ? `Importar ${noteList.length} observação(ões) do atendimento como notas do cliente` : "Nenhuma observação nova para importar"}
        </label>
        <div className="pp-hint" style={{ display: "flex", gap: 6, alignItems: "center" }}><ArrowLeftRight size={12} /> Clique em um valor para escolher; clicar de novo desmarca (o campo fica como está).</div>
      </div>
    </DialogShell>
  );
}
