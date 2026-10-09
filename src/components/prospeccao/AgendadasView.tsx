"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, MessageCircle, Megaphone, Repeat, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import EmptyState from "@/components/ui/EmptyState";
import { describeRecurrence } from "@/lib/prospeccao/schedule";
import { useProspeccao } from "./ProspeccaoProvider";
import { cancelScheduleRequest } from "./ScheduledStrip";
import type { ScheduledMessage } from "@/types/database";

type Filter = "pending" | "sent" | "failed" | "canceled";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "sent", label: "Enviadas" },
  { id: "failed", label: "Falhas" },
  { id: "canceled", label: "Canceladas" },
];
const KIND_LABEL = { single: "Mensagem", followup: "Follow-up", campaign: "Campanha" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function AgendadasView() {
  const { contacts } = useProspeccao();
  const { showToast } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<ScheduledMessage[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("scheduled_messages").select("*").order("run_at", { ascending: filter === "pending" }).limit(300);
    setRows((data || []) as ScheduledMessage[]);
    setLoading(false);
  }, [filter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("sched-all").on("postgres_changes", { event: "*", schema: "public", table: "scheduled_messages" }, () => { load(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const names = useMemo(() => new Map(contacts.map((c) => [c.id, c.nome])), [contacts]);
  const visible = rows.filter((r) => r.status === filter);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter((r) => r.status === f.id).length])) as Record<Filter, number>, [rows]);

  const cancel = async (r: ScheduledMessage, scope: "one" | "series") => {
    const ok = await cancelScheduleRequest(r.id, scope);
    showToast(ok ? "Agendamento cancelado." : "Não foi possível cancelar.", ok ? "success" : "error");
    load();
  };

  return (
    <>
      <div className="pp-type-chips" style={{ border: 0, padding: "0 0 12px" }} role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className="pp-type-chip" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}{counts[f.id] > 0 && <span className="pp-unread">{counts[f.id]}</span>}
          </button>
        ))}
      </div>

      {!visible.length ? (
        <EmptyState icon={<CalendarClock size={20} />} title={loading ? "Carregando..." : "Nada por aqui"} description={filter === "pending" ? "Agende uma mensagem pelo relógio no campo de conversa ou dispare uma campanha com data marcada." : "Nenhum agendamento neste filtro."} />
      ) : (
        <div className="surface" style={{ overflowX: "auto" }}>
          <table className="pp-table">
            <thead><tr><th>Quando</th><th>Para</th><th>Tipo</th><th>Mensagem</th><th>Repete</th><th /></tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{when(r.run_at)}</td>
                  <td>{names.get(r.lead_id) ?? "—"}</td>
                  <td>
                    <span className="pp-badge">
                      {r.kind === "followup" ? <AlarmClock size={11} /> : r.kind === "campaign" ? <Megaphone size={11} /> : <CalendarClock size={11} />}
                      {KIND_LABEL[r.kind]}
                    </span>
                  </td>
                  <td style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.body || "Anexo"}{r.error && <div style={{ color: "var(--color-danger)", fontSize: "var(--text-caption)" }}>{r.error}</div>}</td>
                  <td>{r.recurrence ? <span className="pp-badge"><Repeat size={11} /> {describeRecurrence(r.recurrence)}</span> : "—"}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => router.push(`/admin/prospeccao/conversas?lead=${r.lead_id}`)} aria-label="Abrir conversa" title="Abrir conversa"><MessageCircle size={15} /></button>
                    {r.status === "pending" && (
                      <>
                        <button className="btn btn-ghost btn-icon" onClick={() => cancel(r, "one")} aria-label="Cancelar" title="Cancelar este envio"><X size={15} /></button>
                        {r.series_id && <button className="btn btn-ghost btn-sm" onClick={() => cancel(r, "series")}>Cancelar série</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
