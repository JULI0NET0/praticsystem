"use client";

import "@/components/prospeccao/prospeccao.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, CalendarClock, ExternalLink, MessageCircle, RefreshCw, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import MediaBubble from "@/components/prospeccao/MediaBubble";
import { TYPE_LABEL } from "@/lib/prospeccao/classify";
import { ORIGIN_LABEL, displayName, formatPhone, normalizePhone, phoneVariants, stageLabel } from "@/lib/prospeccao/leads";
import { describeRecurrence } from "@/lib/prospeccao/schedule";
import type { Client, Lead, LeadActivity, LeadMessage, ScheduledMessage } from "@/types/database";

type View = "conversa" | "timeline" | "agendadas";
const PAGE = 200;

const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const MARK: Record<LeadMessage["status"], string> = { queued: "…", sent: "✓", delivered: "✓✓", read: "✓✓", played: "✓✓", failed: "!" };

/** Histórico de atendimento (WhatsApp) deste cliente: conversa, linha do tempo e agendadas. Somente leitura. */
export default function ClientAtendimento({ client }: { client: Client }) {
  const { users } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pending, setPending] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [totals, setTotals] = useState({ in: 0, out: 0 });
  const [limit, setLimit] = useState(PAGE);
  const [view, setView] = useState<View>("conversa");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: linked } = await supabase.from("leads").select("*").eq("client_id", client.id).order("created_at");
    const mine = (linked || []) as Lead[];
    setLeads(mine);

    // Conversas do mesmo número que ainda não foram ligadas a este cliente.
    const phones = [client.phone, client.whatsapp_financeiro].flatMap((p) => phoneVariants(p ? normalizePhone(p) ?? p : null));
    if (phones.length) {
      const { data: loose } = await supabase.from("leads").select("*").in("telefone", [...new Set(phones)]).or(`client_id.is.null,client_id.neq.${client.id}`);
      setPending(((loose || []) as Lead[]).filter((l) => !mine.some((m) => m.id === l.id)));
    } else setPending([]);

    const ids = mine.map((l) => l.id);
    if (ids.length) {
      const [m, a, s, cin, cout] = await Promise.all([
        supabase.from("lead_messages").select("*").in("lead_id", ids).order("created_at", { ascending: false }).limit(limit),
        supabase.from("lead_activities").select("*").in("lead_id", ids).order("created_at", { ascending: false }).limit(200),
        supabase.from("scheduled_messages").select("*").in("lead_id", ids).eq("status", "pending").order("run_at"),
        supabase.from("lead_messages").select("id", { count: "exact", head: true }).in("lead_id", ids).eq("direction", "in"),
        supabase.from("lead_messages").select("id", { count: "exact", head: true }).in("lead_id", ids).eq("direction", "out"),
      ]);
      setMessages(((m.data || []) as LeadMessage[]).reverse());
      setActivities((a.data || []) as LeadActivity[]);
      setScheduled((s.data || []) as ScheduledMessage[]);
      setTotals({ in: cin.count ?? 0, out: cout.count ?? 0 });
    } else {
      setMessages([]); setActivities([]); setScheduled([]); setTotals({ in: 0, out: 0 });
    }
    setLoading(false);
  }, [client.id, client.phone, client.whatsapp_financeiro, limit]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial e ao paginar
  useEffect(() => { load(); }, [load]);

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const first = leads.map((l) => l.created_at).sort()[0];
  const lastMsg = leads.map((l) => l.last_message_at).filter(Boolean).sort().at(-1) ?? null;
  const main = leads[0];
  const owner = users.find((u) => u.id === main?.responsavel_id)?.name;
  const segments = [...new Set(leads.flatMap((l) => l.segmentos ?? []))];

  const timeline = useMemo(() => {
    const items = activities.map((a) => ({
      id: a.id, at: a.created_at, text: a.descricao,
      kind: a.tipo === "nota" ? "Observação" : a.tipo === "estagio" ? "Status" : "Conversão",
      who: users.find((u) => u.id === a.user_id)?.name,
    }));
    for (const l of leads) items.push({ id: `created-${l.id}`, at: l.created_at, text: `Contato criado via ${ORIGIN_LABEL[l.origem] ?? l.origem}${leads.length > 1 ? ` (${formatPhone(l.telefone)})` : ""}`, kind: "Origem", who: undefined });
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [activities, leads, users]);

  return (
    <div className="pp-history">
      {pending.length > 0 && (
        <div className="pp-history-banner">
          <MessageCircle size={15} />
          <span>Há {pending.length} conversa(s) com o número deste cliente que ainda não estão vinculadas: {pending.map((p) => displayName(p)).join(", ")}.</span>
          <Link href={`/admin/prospeccao/conversas?lead=${pending[0].id}`} className="btn btn-secondary btn-sm">Abrir no atendimento</Link>
        </div>
      )}

      {!leads.length ? (
        <div className="pp-empty" style={{ padding: "32px 0", textAlign: "center" }}>
          {loading ? "Carregando..." : "Nenhum atendimento vinculado a este cliente ainda. Vincule o contato pelo painel de atendimento em Prospecção."}
        </div>
      ) : (
        <>
          <div className="pp-history-stats">
            <div><span>Primeiro contato</span><strong>{first ? day(first) : "—"}</strong></div>
            <div><span>Última interação</span><strong>{lastMsg ? dateTime(lastMsg) : "—"}</strong></div>
            <div><span>Mensagens</span><strong>{totals.in + totals.out}</strong><small>{totals.out} enviadas · {totals.in} recebidas</small></div>
            <div><span>Origem</span><strong>{main ? ORIGIN_LABEL[main.origem] ?? main.origem : "—"}</strong><small>{owner ? `Resp.: ${owner}` : stageLabel(main.estagio)}</small></div>
            <div><span>Contatos</span><strong>{leads.map((l) => formatPhone(l.telefone)).join(" · ")}</strong><small>{[...new Set(leads.map((l) => TYPE_LABEL[l.tipo ?? "cliente"]))].join(", ")}{segments.length ? ` · ${segments.join(", ")}` : ""}</small></div>
          </div>

          <div className="pp-history-bar">
            <div className="pp-tabs" role="tablist" style={{ flex: 1 }}>
              {([["conversa", "Conversa"], ["timeline", "Linha do tempo"], ["agendadas", `Agendadas${scheduled.length ? ` (${scheduled.length})` : ""}`]] as [View, string][]).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={view === id} data-active={view === id} onClick={() => setView(id)}>{label}</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={load} aria-label="Atualizar" title="Atualizar"><RefreshCw size={14} className={loading ? "spin" : undefined} /></button>
            <Link href={`/admin/prospeccao/conversas?lead=${main.id}`} className="btn btn-secondary btn-sm"><ExternalLink size={13} /> Abrir no atendimento</Link>
          </div>

          {view === "conversa" && (
            <div className="pp-history-chat pp-msgs">
              {messages.length >= limit && <button className="btn btn-ghost btn-sm" style={{ alignSelf: "center" }} onClick={() => setLimit((n) => n + PAGE)}>Carregar mensagens anteriores</button>}
              {!messages.length && <div className="pp-empty" style={{ margin: "auto" }}>Nenhuma mensagem registrada.</div>}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const lead = leadById.get(m.lead_id);
                const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                return (
                  <div key={m.id} style={{ display: "contents" }}>
                    {newDay && <div className="pp-day"><span>{day(m.created_at)}</span></div>}
                    <div className={`pp-bubble ${m.direction}`} data-failed={m.status === "failed"}>
                      <MediaBubble m={m} contactAvatar={lead?.wa_avatar_url} contactInitials={initialsOf(lead ? displayName(lead) : client.name)} />
                      <span className="meta">
                        {leads.length > 1 && lead ? `${formatPhone(lead.telefone)} · ` : ""}{hhmm(m.created_at)}
                        {m.direction === "out" && <span className={m.status === "read" || m.status === "played" ? "read" : undefined}> {MARK[m.status]}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "timeline" && (
            <div className="pp-notes">
              {timeline.map((t) => (
                <div key={t.id} className="pp-note" style={t.kind === "Observação" ? undefined : { background: "transparent", borderStyle: "dashed" }}>
                  {t.text}
                  <small>{t.kind} · {dateTime(t.at)}{t.who ? ` · ${t.who}` : ""}</small>
                </div>
              ))}
              {!timeline.length && <div className="pp-empty">Sem eventos registrados.</div>}
            </div>
          )}

          {view === "agendadas" && (
            <div className="pp-notes">
              {scheduled.map((r) => (
                <div key={r.id} className="pp-note">
                  {r.body || "Anexo"}
                  <small style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {r.kind === "followup" ? <AlarmClock size={11} /> : r.recurrence ? <Repeat size={11} /> : <CalendarClock size={11} />}
                    {dateTime(r.run_at)}{r.recurrence ? ` · ${describeRecurrence(r.recurrence)}` : ""}{r.kind === "followup" ? " · Follow-up" : ""}
                  </small>
                </div>
              ))}
              {!scheduled.length && <div className="pp-empty">Nenhuma mensagem agendada para este cliente.</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
