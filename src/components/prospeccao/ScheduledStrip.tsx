"use client";

import { useCallback, useEffect, useState } from "react";
import { AlarmClock, CalendarClock, ChevronDown, ChevronUp, Repeat, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { describeRecurrence } from "@/lib/prospeccao/schedule";
import type { ScheduledMessage } from "@/types/database";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export async function cancelScheduleRequest(id: string, scope: "one" | "series") {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/prospeccao/schedule", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify({ id, scope }),
  });
  return res.ok;
}

/** Mensagens agendadas deste lead, acima do compositor: ver e cancelar. */
export default function ScheduledStrip({ leadId, refreshKey }: { leadId: string; refreshKey: number }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ScheduledMessage[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("scheduled_messages").select("*").eq("lead_id", leadId).eq("status", "pending").order("run_at");
    setRows((data || []) as ScheduledMessage[]);
  }, [leadId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial e a cada novo agendamento
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel(`sched-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_messages", filter: `lead_id=eq.${leadId}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId, load]);

  const cancel = async (row: ScheduledMessage, scope: "one" | "series") => {
    const ok = await cancelScheduleRequest(row.id, scope);
    showToast(ok ? "Agendamento cancelado." : "Não foi possível cancelar.", ok ? "success" : "error");
    load();
  };

  if (!rows.length) return null;
  return (
    <div className="pp-strip">
      <button type="button" className="pp-strip-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <CalendarClock size={14} /> <strong>{rows.length} agendada{rows.length > 1 ? "s" : ""}</strong>
        <span style={{ color: "var(--color-text-tertiary)" }}>próxima: {when(rows[0].run_at)}</span>
        <span style={{ marginLeft: "auto" }}>{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>
      </button>
      {open && (
        <ul className="pp-strip-list">
          {rows.map((r) => (
            <li key={r.id}>
              <span className="pp-strip-when">
                {r.kind === "followup" ? <AlarmClock size={12} /> : r.recurrence ? <Repeat size={12} /> : <CalendarClock size={12} />} {when(r.run_at)}
              </span>
              <span className="pp-strip-text">{r.body || "Anexo"}</span>
              {r.kind === "followup" && <span className="pp-type-tag">Follow-up</span>}
              {r.recurrence && <span className="pp-type-tag" title={describeRecurrence(r.recurrence)}>Recorrente</span>}
              <button className="btn btn-ghost btn-icon" onClick={() => cancel(r, "one")} aria-label="Cancelar este envio" title="Cancelar este envio"><X size={14} /></button>
              {r.series_id && <button className="btn btn-ghost btn-sm" onClick={() => cancel(r, "series")}>Cancelar série</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
