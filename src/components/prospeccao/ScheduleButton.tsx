"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, CalendarClock, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import { isOutsideBusinessHours } from "@/lib/prospeccao/schedule";
import type { Lead, ScheduledRecurrence } from "@/types/database";

type Mode = "agendar" | "followup";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function quickPicks(now = new Date()): { label: string; date: Date }[] {
  const at = (days: number, h: number) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
  const picks: { label: string; date: Date }[] = [];
  const today18 = at(0, 18);
  if (today18.getTime() > now.getTime() + 5 * 60_000) picks.push({ label: "Hoje 18h", date: today18 });
  picks.push({ label: "Amanhã 9h", date: at(1, 9) });
  const toMonday = ((8 - now.getDay()) % 7) || 7;
  picks.push({ label: "Segunda 9h", date: at(toMonday, 9) });
  return picks;
}

interface Props {
  lead: Lead;
  /** Texto do campo de mensagem: é o que será agendado. */
  text: string;
  onScheduled: () => void;
}

/** Relógio do compositor: agenda a mensagem digitada (única, recorrente ou follow-up). */
export default function ScheduleButton({ lead, text, onScheduled }: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("agendar");
  const [when, setWhen] = useState("");
  const [repeat, setRepeat] = useState<"none" | ScheduledRecurrence["freq"]>("none");
  const [interval, setIntervalN] = useState(1);
  const [endBy, setEndBy] = useState<"count" | "until">("count");
  const [count, setCount] = useState(4);
  const [until, setUntil] = useState("");
  const [cancelOnReply, setCancelOnReply] = useState(false);
  const [fuN, setFuN] = useState(2);
  const [fuUnit, setFuUnit] = useState<"horas" | "dias">("dias");
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const picks = useMemo(() => (open ? quickPicks() : []), [open]);
  const runAt = useMemo(() => {
    if (mode === "followup") return new Date(nowMs + fuN * (fuUnit === "horas" ? 3_600_000 : 86_400_000));
    return when ? new Date(when) : null;
  }, [mode, when, fuN, fuUnit, nowMs]);
  const outside = runAt ? isOutsideBusinessHours(runAt) : false;

  const submit = async () => {
    if (!text.trim()) return showToast("Escreva a mensagem no campo antes de agendar.", "error");
    if (!runAt || Number.isNaN(runAt.getTime())) return showToast("Escolha a data e a hora.", "error");
    if (runAt.getTime() < Date.now() + 60_000) return showToast("Escolha um horário a partir de 1 minuto no futuro.", "error");
    const recurrence: ScheduledRecurrence | null =
      mode === "agendar" && repeat !== "none"
        ? { freq: repeat, interval: Math.max(1, interval), ...(endBy === "count" ? { count } : { until: until ? new Date(`${until}T23:59:59`).toISOString() : null }) }
        : null;
    if (recurrence && endBy === "until" && !recurrence.until) return showToast("Escolha até quando repetir.", "error");
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/prospeccao/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({
        leadId: lead.id, body: text, runAt: runAt.toISOString(), recurrence,
        kind: mode === "followup" ? "followup" : "single",
        cancelOnReply: mode === "followup" ? true : cancelOnReply,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return showToast(json.error || "Falha ao agendar.", "error");
    const n = json.scheduled?.length ?? 1;
    showToast(mode === "followup" ? "Follow-up agendado. Cancela sozinho se o lead responder." : n > 1 ? `${n} envios agendados.` : "Mensagem agendada.", "success");
    setOpen(false);
    onScheduled();
  };

  return (
    <div className="pp-sched" ref={boxRef}>
      <button type="button" className="btn btn-secondary btn-icon" onClick={() => { setNowMs(Date.now()); setOpen((o) => !o); }} aria-label="Agendar mensagem" aria-expanded={open} title="Agendar mensagem ou follow-up">
        <CalendarClock size={16} />
      </button>
      {open && (
        <div className="pp-sched-pop" role="dialog" aria-label="Agendar mensagem">
          <div className="pp-tabs">
            <button data-active={mode === "agendar"} onClick={() => setMode("agendar")}><CalendarClock size={13} /> Agendar</button>
            <button data-active={mode === "followup"} onClick={() => setMode("followup")}><AlarmClock size={13} /> Follow-up</button>
          </div>

          <div className="pp-sched-body">
            <div className="pp-sched-preview">{text.trim() ? text : "Escreva a mensagem no campo e volte aqui."}</div>

            {mode === "agendar" ? (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {picks.map((p) => (
                    <button key={p.label} type="button" className="pp-type-chip" data-active={when === toLocalInput(p.date)} onClick={() => setWhen(toLocalInput(p.date))}>{p.label}</button>
                  ))}
                </div>
                <label className="pp-label">Data e hora
                  <input className="pp-input" type="datetime-local" min={toLocalInput(new Date(nowMs + 120_000))} value={when} onChange={(e) => setWhen(e.target.value)} />
                </label>

                <label className="pp-label">Repetir
                  <select className="pp-select" value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)}>
                    <option value="none">Não repete</option>
                    <option value="daily">Todo dia</option>
                    <option value="weekly">Toda semana</option>
                    <option value="monthly">Todo mês</option>
                  </select>
                </label>
                {repeat !== "none" && (
                  <div className="pp-sched-row">
                    <label className="pp-label" style={{ width: 80 }}>A cada
                      <input className="pp-input" type="number" min={1} max={30} value={interval} onChange={(e) => setIntervalN(Number(e.target.value) || 1)} />
                    </label>
                    <label className="pp-label" style={{ flex: 1 }}>Termina
                      <select className="pp-select" value={endBy} onChange={(e) => setEndBy(e.target.value as typeof endBy)}>
                        <option value="count">Após N envios</option>
                        <option value="until">Em uma data</option>
                      </select>
                    </label>
                    {endBy === "count" ? (
                      <label className="pp-label" style={{ width: 80 }}>Envios
                        <input className="pp-input" type="number" min={2} max={52} value={count} onChange={(e) => setCount(Number(e.target.value) || 2)} />
                      </label>
                    ) : (
                      <label className="pp-label" style={{ flex: 1 }}>Até
                        <input className="pp-input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                      </label>
                    )}
                  </div>
                )}
                <label className="pp-check"><input type="checkbox" checked={cancelOnReply} onChange={(e) => setCancelOnReply(e.target.checked)} /> Cancelar se o lead responder</label>
              </>
            ) : (
              <>
                <div className="pp-sched-row" style={{ alignItems: "flex-end" }}>
                  <span style={{ fontSize: "var(--text-ui)", paddingBottom: 8 }}>Se não responder em</span>
                  <input className="pp-input" style={{ width: 70 }} type="number" min={1} max={90} value={fuN} onChange={(e) => setFuN(Number(e.target.value) || 1)} aria-label="Quantidade" />
                  <select className="pp-select" style={{ width: 100 }} value={fuUnit} onChange={(e) => setFuUnit(e.target.value as typeof fuUnit)}>
                    <option value="horas">horas</option>
                    <option value="dias">dias</option>
                  </select>
                </div>
                <div className="pp-sched-hint">Envia a mensagem acima e cancela sozinho se o lead responder antes.</div>
              </>
            )}

            {runAt && !Number.isNaN(runAt.getTime()) && (
              <div className="pp-sched-hint" data-warn={outside}>
                {repeat !== "none" && mode === "agendar" && <Repeat size={12} style={{ marginRight: 4 }} />}
                Envio em {runAt.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {outside && " — fora do horário comercial (8h–20h): chance maior de a pessoa ignorar."}
              </div>
            )}
            <button className="btn btn-accent" onClick={submit} disabled={busy || !text.trim() || !runAt}>{busy ? "Agendando..." : mode === "followup" ? "Agendar follow-up" : "Agendar mensagem"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
