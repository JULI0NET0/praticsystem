"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Wallet, Percent, MessageCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { STAGES, formatPhone, pipelineStats } from "@/lib/prospeccao/leads";
import { useProspeccao } from "./ProspeccaoProvider";
import LeadFormModal from "./LeadFormModal";
import type { Lead, LeadStage } from "@/types/database";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function FunilBoard() {
  const { leads, moveLead, loading } = useProspeccao();
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStage | null>(null);
  const [creating, setCreating] = useState<LeadStage | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const stats = useMemo(() => pipelineStats(leads), [leads]);

  if (!loading && leads.length === 0 && !creating) {
    return (
      <>
        <EmptyState title="Nenhum lead ainda" description="Cadastre o primeiro lead, importe uma planilha ou conecte o WhatsApp para começar a prospectar." action={<button className="btn btn-accent" onClick={() => setCreating("novo")}>Novo lead</button>} />
      </>
    );
  }

  return (
    <>
      <div className="pp-kpis">
        <StatCard label="Leads" value={stats.total} icon={<Users size={14} />} />
        <StatCard label="Novos" value={stats.novos} icon={<Plus size={14} />} />
        <StatCard label="Valor em aberto" value={brl(stats.emAberto)} icon={<Wallet size={14} />} />
        <StatCard label="Conversão" value={stats.conversao} unit="%" icon={<Percent size={14} />} />
        <StatCard label="Não lidas" value={stats.naoLidas} icon={<MessageCircle size={14} />} onClick={() => router.push("/admin/prospeccao/conversas")} />
      </div>

      <div className="pp-board">
        {STAGES.map((stage) => {
          const items = leads.filter((l) => l.estagio === stage.id);
          const sum = items.reduce((a, l) => a + (l.valor_estimado ?? 0), 0);
          return (
            <section
              key={stage.id}
              className="pp-col"
              data-over={over === stage.id}
              onDragOver={(e) => { e.preventDefault(); setOver(stage.id); }}
              onDragLeave={() => setOver((o) => (o === stage.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                setOver(null);
                if (id) moveLead(id, stage.id);
              }}
            >
              <div className="pp-col-head">
                <span className="dot" style={{ background: stage.color }} />
                {stage.label} <span style={{ color: "var(--color-text-tertiary)" }}>{items.length}</span>
                {sum > 0 && <span className="sum">{brl(sum)}</span>}
              </div>
              {items.map((lead) => (
                <button
                  key={lead.id}
                  className="pp-card"
                  draggable
                  data-dragging={dragId === lead.id}
                  onDragStart={(e) => { setDragId(lead.id); e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => setEditing(lead)}
                >
                  <span className="t">{lead.nome}</span>
                  {lead.empresa && <span className="s">{lead.empresa}</span>}
                  {lead.telefone && <span className="s">{formatPhone(lead.telefone)}</span>}
                  <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                    {lead.valor_estimado ? <span className="pp-badge">{brl(lead.valor_estimado)}</span> : null}
                    {[...(lead.segmentos ?? []), ...lead.tags].slice(0, 2).map((t) => <span key={t} className="pp-badge">{t}</span>)}
                    {lead.unread_count > 0 && <span className="pp-unread" style={{ marginLeft: "auto" }}>{lead.unread_count}</span>}
                  </span>
                </button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setCreating(stage.id)} style={{ justifyContent: "flex-start" }}>
                <Plus size={14} /> Adicionar
              </button>
            </section>
          );
        })}
      </div>

      {creating && <LeadFormModal defaultStage={creating} onClose={() => setCreating(null)} />}
      {editing && <LeadFormModal lead={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
