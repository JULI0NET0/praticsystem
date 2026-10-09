"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, Upload, Trash2, UserCheck } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/CustomToast";
import { ORIGIN_LABEL, STAGES, formatPhone, parseLeadsCsv } from "@/lib/prospeccao/leads";
import { useProspeccao } from "./ProspeccaoProvider";
import LeadFormModal from "./LeadFormModal";
import type { Lead, LeadStage } from "@/types/database";

export default function LeadsTable() {
  const { leads, importRows, deleteLead, convertToClient, loading } = useProspeccao();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (stage !== "all" && l.estagio !== stage) return false;
      if (!term) return true;
      return [l.nome, l.empresa, l.telefone, l.email, l.instagram, l.cnpj, ...l.tags, ...(l.segmentos ?? [])].some((v) => v?.toLowerCase().includes(term));
    });
  }, [leads, q, stage]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { rows: parsed, skipped } = parseLeadsCsv(await file.text());
    if (!parsed.length) return showToast("Nenhuma linha válida. Use colunas: nome, telefone, empresa, email, instagram.", "error");
    const n = await importRows(parsed);
    showToast(`${n} lead(s) importado(s)${skipped ? `, ${skipped} ignorado(s)` : ""}.`, "success");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: "1 1 240px" }}><SearchInput value={q} onChange={setQ} placeholder="Buscar lead, empresa, telefone..." shortcut="" /></div>
        <select className="pp-select" style={{ width: 160 }} value={stage} onChange={(e) => setStage(e.target.value as LeadStage | "all")}>
          <option value="all">Todos os estágios</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> Importar CSV</button>
        <button className="btn btn-accent" onClick={() => setCreating(true)}><Plus size={14} /> Novo lead</button>
      </div>

      <div className="surface" style={{ overflowX: "auto" }}>
        <table className="pp-table">
          <thead><tr><th>Lead</th><th>WhatsApp</th><th>Estágio</th><th>Origem</th><th>Segmentos</th><th>Valor</th><th /></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="row" onClick={() => setEditing(l)}>
                <td><strong>{l.nome}</strong>{l.empresa && <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-caption)" }}>{l.empresa}</div>}</td>
                <td>{formatPhone(l.telefone)}</td>
                <td><span className="pp-badge">{STAGES.find((s) => s.id === l.estagio)?.label}</span></td>
                <td>{ORIGIN_LABEL[l.origem] ?? l.origem}</td>
                <td>{l.segmentos?.map((s) => <span key={s} className="pp-badge" style={{ marginRight: 4 }}>{s}</span>)}</td>
                <td>{l.valor_estimado ? l.valor_estimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  {l.telefone && <button className="btn btn-ghost btn-icon" title="Abrir conversa" onClick={() => router.push(`/admin/prospeccao/conversas?lead=${l.id}`)}><MessageCircle size={15} /></button>}
                  {!l.client_id && <button className="btn btn-ghost btn-icon" title="Converter em cliente" onClick={() => convertToClient(l)}><UserCheck size={15} /></button>}
                  <button className="btn btn-ghost btn-icon" title="Excluir" onClick={async () => { if (await confirm({ message: `Excluir ${l.nome}?`, confirmText: "Excluir" })) deleteLead(l.id); }}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: 32 }}>{loading ? "Carregando..." : "Nenhum lead encontrado."}</td></tr>}
          </tbody>
        </table>
      </div>

      {creating && <LeadFormModal onClose={() => setCreating(false)} />}
      {editing && <LeadFormModal lead={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
