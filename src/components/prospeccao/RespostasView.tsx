"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import EmptyState from "@/components/ui/EmptyState";
import { useProspeccao } from "./ProspeccaoProvider";

export default function RespostasView() {
  const { quickReplies, setQuickReplies } = useProspeccao();
  const { showToast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");

  const add = async () => {
    if (!titulo.trim() || !corpo.trim()) return showToast("Preencha título e mensagem.", "error");
    const { data, error } = await supabase.from("quick_replies").insert({ titulo: titulo.trim(), corpo: corpo.trim() }).select().single();
    if (error) return showToast("Erro: " + error.message, "error");
    setQuickReplies((prev) => [...prev, data].sort((a, b) => a.titulo.localeCompare(b.titulo)));
    setTitulo(""); setCorpo("");
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("quick_replies").delete().eq("id", id);
    if (error) return showToast("Erro: " + error.message, "error");
    setQuickReplies((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,360px) minmax(0,1fr)", alignItems: "start" }} className="pp-resp">
      <div className="surface" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <strong>Nova resposta rápida</strong>
        <label className="pp-label">Título (atalho: /título)<input className="pp-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex.: apresentação" /></label>
        <label className="pp-label">Mensagem<textarea className="pp-textarea" rows={5} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Oi {{nome}}! Aqui é o Julio, da Pratic..." /></label>
        <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>Variáveis: {"{{nome}}"} (primeiro nome) e {"{{empresa}}"}.</div>
        <button className="btn btn-accent" onClick={add}><Plus size={14} /> Salvar</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quickReplies.map((r) => (
          <div key={r.id} className="surface" style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>/{r.titulo}</strong>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-ui)", whiteSpace: "pre-wrap" }}>{r.corpo}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => remove(r.id)} aria-label="Excluir"><Trash2 size={15} /></button>
          </div>
        ))}
        {!quickReplies.length && <EmptyState compact title="Nenhuma resposta rápida" description="Crie mensagens prontas para usar no chat digitando /." />}
      </div>
      <style>{`@media (max-width:768px){ .pp-resp { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
