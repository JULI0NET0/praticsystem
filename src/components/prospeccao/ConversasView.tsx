"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, PanelRight, Paperclip, RotateCw, Search, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import EmptyState from "@/components/ui/EmptyState";
import { STAGES, formatPhone, interpolate } from "@/lib/prospeccao/leads";
import { TYPE_LABEL, countsForBadge } from "@/lib/prospeccao/classify";
import { useProspeccao } from "./ProspeccaoProvider";
import ContaWhatsApp from "./ContaWhatsApp";
import LeadPanel from "./LeadPanel";
import MediaBubble from "./MediaBubble";
import AudioRecorder from "./AudioRecorder";
import TriageBanner from "./TriageBanner";
import ScheduleButton from "./ScheduleButton";
import ScheduledStrip from "./ScheduledStrip";
import type { ContactType, Lead, LeadMessage, LeadStage } from "@/types/database";

const MAX_FILE_MB = 16;
const initialsOf = (n: string) => n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const STATUS_TITLE: Record<LeadMessage["status"], string> = { queued: "Na fila", sent: "Enviada", delivered: "Entregue", read: "Lida", played: "Reproduzida", failed: "Falhou" };
const STATUS_MARK: Record<LeadMessage["status"], string> = { queued: "…", sent: "✓", delivered: "✓✓", read: "✓✓", played: "✓✓", failed: "!" };

type TypeFilter = "todas" | "lead" | "cliente" | "equipe" | "triagem";
const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "lead", label: "Leads" },
  { id: "cliente", label: "Clientes" },
  { id: "equipe", label: "Equipe" },
  { id: "triagem", label: "Triagem" },
];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: diff > 300 ? "numeric" : undefined });
}

function mediaTypeFor(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function Avatar({ lead }: { lead: Lead }) {
  return lead.wa_avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={lead.wa_avatar_url} alt="" className="pp-avatar" style={{ objectFit: "cover" }} />
  ) : (
    <span className="pp-avatar">{initialsOf(lead.nome)}</span>
  );
}

export default function ConversasView() {
  const { contacts, quickReplies, updateLead, moveLead, setContactType } = useProspeccao();
  const { showToast } = useToast();
  const params = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(params.get("lead"));
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [qrIndex, setQrIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todas");
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [schedKey, setSchedKey] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);

  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = { todas: 0, lead: 0, cliente: 0, equipe: 0, triagem: 0 };
    for (const l of contacts) {
      if (!l.telefone) continue;
      const t = (l.tipo ?? "lead") as ContactType;
      if (t in c) c[t as TypeFilter] += l.unread_count;
      if (countsForBadge(t)) c.todas += l.unread_count;
    }
    return c;
  }, [contacts]);

  const conversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const withPhone = contacts.filter((l) => l.telefone && (typeFilter === "todas" ? (l.tipo ?? "lead") !== "ignorado" : (l.tipo ?? "lead") === typeFilter));
    if (term) {
      return withPhone.filter((l) => [l.nome, l.empresa, l.telefone, l.wa_name].some((v) => v?.toLowerCase().includes(term)));
    }
    return withPhone
      .filter((l) => l.last_message_at || l.id === activeId)
      .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));
  }, [contacts, activeId, search, typeFilter]);
  const active = contacts.find((l) => l.id === activeId) ?? null;

  const qrQuery = text.startsWith("/") ? text.slice(1).toLowerCase() : null;
  const qrMatches = useMemo(
    () => (qrQuery === null ? [] : quickReplies.filter((r) => r.titulo.toLowerCase().includes(qrQuery))),
    [qrQuery, quickReplies]
  );

  const scrollToEnd = (smooth = false) => {
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    atBottomRef.current = true;
    setAtBottom(true);
    setNewBelow(0);
  };

  // Abre a conversa: histórico, marca como lida e acompanha novas mensagens + recibos (✓✓).
  useEffect(() => {
    if (!active) return;
    const leadId = active.id;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda quantas estavam sem ler ao abrir
    setUnreadAtOpen(active.unread_count);
    setLoadedFor(null);
    setNewBelow(0);
    supabase.from("lead_messages").select("*").eq("lead_id", leadId).order("created_at").then(({ data }) => {
      if (!alive) return;
      setMessages((data || []) as LeadMessage[]);
      setLoadedFor(leadId);
    });
    updateLead(leadId, { unread_count: 0, last_read_at: new Date().toISOString() });
    const channel = supabase
      .channel(`lead-msgs-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` }, (p) => {
        const row = p.new as LeadMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === row.id) ? prev.map((m) => (m.id === row.id ? row : m)) : [...prev, row]
        );
        if (p.eventType === "INSERT" && row.direction === "in") {
          updateLead(leadId, { unread_count: 0, last_read_at: new Date().toISOString() });
          if (!atBottomRef.current) setNewBelow((n) => n + 1);
        }
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Divisor "N mensagens não lidas": antes da N-ésima recebida contada do fim.
  const dividerId = useMemo(() => {
    if (!unreadAtOpen || loadedFor !== activeId) return null;
    const incoming = messages.filter((m) => m.direction === "in");
    return incoming[incoming.length - unreadAtOpen]?.id ?? null;
  }, [messages, unreadAtOpen, loadedFor, activeId]);

  // Ao carregar: vai para o divisor (se houver) ou para o fim.
  useEffect(() => {
    if (loadedFor !== activeId || !activeId) return;
    if (dividerRef.current) {
      dividerRef.current.scrollIntoView({ block: "start" });
      atBottomRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- posição inicial do scroll
      setAtBottom(false);
    } else scrollToEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFor]);

  // Nova mensagem: acompanha o fim só se o usuário já estava lá.
  useEffect(() => {
    if (loadedFor !== activeId) return;
    if (atBottomRef.current) endRef.current?.scrollIntoView({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onScroll = () => {
    const el = msgsRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setNewBelow(0);
  };

  const post = async (payload: Record<string, unknown>) => {
    if (!active) return false;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/prospeccao/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ leadId: active.id, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(false);
    if (json.message) {
      setMessages((prev) => (prev.some((m) => m.id === json.message.id) ? prev : [...prev, json.message]));
      scrollToEnd();
    }
    if (!res.ok) { showToast(json.error || "Falha ao enviar.", "error"); return false; }
    return true;
  };

  const sendText = async () => {
    if (!text.trim() || sending) return;
    if (await post({ body: text })) setText("");
  };

  const sendFile = async (file: File, opts?: { ptt?: boolean; seconds?: number }) => {
    if (!active) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return showToast(`Arquivo acima de ${MAX_FILE_MB} MB.`, "error");
    setSending(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${active.id}/out-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("prospeccao-media").upload(path, file, { contentType: file.type });
    if (error) { setSending(false); return showToast("Erro no upload: " + error.message, "error"); }
    const url = supabase.storage.from("prospeccao-media").getPublicUrl(path).data.publicUrl;
    const type = opts?.ptt ? "ptt" : mediaTypeFor(file);
    await post({ body: text.trim() || undefined, media: { type, url, name: file.name, mimetype: file.type, seconds: opts?.seconds, size: file.size } });
    setText("");
  };

  const resend = async (m: LeadMessage) => {
    const payload = m.message_type !== "text" && m.media_url
      ? { body: m.body || undefined, media: { type: m.message_type === "audio" ? "ptt" : m.message_type, url: m.media_url, name: m.media_name ?? undefined, mimetype: m.media_mimetype ?? undefined, seconds: m.media_seconds ?? undefined, size: m.media_size ?? undefined } }
      : { body: m.body };
    if (await post(payload)) {
      await supabase.from("lead_messages").delete().eq("id", m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    }
  };

  const pickReply = (body: string) => { if (active) setText(interpolate(body, active)); setQrIndex(0); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (qrMatches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setQrIndex((i) => (i + 1) % qrMatches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setQrIndex((i) => (i - 1 + qrMatches.length) % qrMatches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickReply(qrMatches[qrIndex].corpo); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  const choose = async (tipo: ContactType) => {
    if (!active) return;
    await setContactType(active.id, tipo);
    showToast(`Contato marcado como ${TYPE_LABEL[tipo].toLowerCase()}.`, "success");
  };

  if (!contacts.some((l) => l.telefone)) {
    return (
      <>
        <ContaWhatsApp />
        <EmptyState title="Sem conversas" description="Cadastre leads com WhatsApp ou aguarde mensagens chegarem pelo webhook para conversar aqui." />
      </>
    );
  }

  return (
    <>
      <ContaWhatsApp />
      <div className="pp-chat" data-open={!!active}>
        <div className="pp-chat-list">
          <div style={{ padding: 10, borderBottom: "1px solid var(--color-border-subtle)", position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 20, top: 20, color: "var(--color-text-tertiary)" }} />
            <input className="pp-input" style={{ paddingLeft: 30 }} placeholder="Buscar ou iniciar conversa" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="pp-type-chips" role="tablist" aria-label="Filtrar por tipo">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={typeFilter === f.id} className="pp-type-chip" data-active={typeFilter === f.id} onClick={() => setTypeFilter(f.id)}>
                {f.label}{counts[f.id] > 0 && <span className="pp-unread">{counts[f.id]}</span>}
              </button>
            ))}
          </div>
          {conversations.map((l) => (
            <button key={l.id} className="pp-chat-item" data-active={l.id === activeId} onClick={() => { setActiveId(l.id); setPanelOpen(false); }}>
              <Avatar lead={l} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "var(--text-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nome}</strong>
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>
                  {(l.tipo ?? "lead") !== "lead" && <span className="pp-type-tag">{TYPE_LABEL[(l.tipo ?? "lead") as ContactType]}</span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.last_message_preview || formatPhone(l.telefone)}</span>
                </span>
              </span>
              {l.unread_count > 0 && <span className="pp-unread">{l.unread_count}</span>}
            </button>
          ))}
          {!conversations.length && <div style={{ padding: 16, fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>{search ? "Nenhum contato com WhatsApp encontrado." : "Nenhuma conversa aqui ainda."}</div>}
        </div>

        {active ? (
          <>
            <div className="pp-chat-main" style={{ position: "relative" }}>
              <div className="pp-chat-head">
                <button className="btn btn-ghost btn-icon pp-back" onClick={() => setActiveId(null)} aria-label="Voltar"><ArrowLeft size={16} /></button>
                <Avatar lead={active} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.nome}</strong>
                  <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>{formatPhone(active.telefone)}</div>
                </div>
                {(active.tipo ?? "lead") === "lead" ? (
                  <select className="pp-select pp-stage-select" aria-label="Status do lead" value={active.estagio} onChange={(e) => moveLead(active.id, e.target.value as LeadStage)}>
                    {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                  </select>
                ) : (
                  <span className="pp-type-tag">{TYPE_LABEL[(active.tipo ?? "lead") as ContactType]}</span>
                )}
                <button className="btn btn-secondary btn-sm pp-drawer-btn" onClick={() => setPanelOpen((o) => !o)}><PanelRight size={14} /> Cadastro</button>
              </div>
              {(active.tipo ?? "lead") === "triagem" && <TriageBanner lead={active} onChoose={choose} />}
              <div className="pp-msgs" ref={msgsRef} onScroll={onScroll}>
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                  const grouped = !newDay && prev.direction === m.direction && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000;
                  return (
                    <div key={m.id} style={{ display: "contents" }}>
                      {newDay && <div className="pp-day"><span>{dayLabel(m.created_at)}</span></div>}
                      {m.id === dividerId && (
                        <div className="pp-unread-divider" ref={dividerRef}>{unreadAtOpen} {unreadAtOpen === 1 ? "mensagem não lida" : "mensagens não lidas"}</div>
                      )}
                      <div className={`pp-bubble ${m.direction}`} data-grouped={grouped} data-failed={m.status === "failed"}>
                        <MediaBubble m={m} contactAvatar={active.wa_avatar_url} contactInitials={initialsOf(active.nome)} />
                        <span className="meta">
                          {hhmm(m.created_at)}
                          {m.direction === "out" && (
                            <span className={m.status === "read" || m.status === "played" ? "read" : undefined} title={STATUS_TITLE[m.status]}> {STATUS_MARK[m.status]}</span>
                          )}
                        </span>
                      </div>
                      {m.status === "failed" && m.direction === "out" && (
                        <button className="pp-retry" onClick={() => resend(m)} disabled={sending}><RotateCw size={12} /> Não enviada. Tentar de novo</button>
                      )}
                    </div>
                  );
                })}
                {!messages.length && loadedFor === activeId && <p style={{ margin: "auto", color: "var(--color-text-tertiary)", fontSize: "var(--text-ui)" }}>Nenhuma mensagem ainda. Digite / para usar uma resposta rápida.</p>}
                <div ref={endRef} />
              </div>
              {!atBottom && (
                <button className="pp-scroll-down" onClick={() => scrollToEnd(true)} aria-label={newBelow ? `Descer para o fim, ${newBelow} novas` : "Descer para o fim"}>
                  <ArrowDown size={18} />
                  {newBelow > 0 && <span className="pp-unread">{newBelow}</span>}
                </button>
              )}
              <ScheduledStrip leadId={active.id} refreshKey={schedKey} />
              <div className="pp-composer">
                {qrMatches.length > 0 && (
                  <div className="pp-qr-pop">
                    {qrMatches.map((r, i) => (
                      <button key={r.id} data-sel={i === qrIndex} onMouseDown={(e) => { e.preventDefault(); pickReply(r.corpo); }}>
                        <strong>{r.titulo}</strong>
                        <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>{r.corpo.slice(0, 90)}</div>
                      </button>
                    ))}
                  </div>
                )}
                <input ref={fileRef} type="file" hidden accept="image/*,video/mp4,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }} />
                <button className="btn btn-secondary btn-icon" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Anexar arquivo" title="Foto, vídeo, documento ou áudio"><Paperclip size={16} /></button>
                <ScheduleButton lead={active} text={text} onScheduled={() => { setText(""); setSchedKey((k) => k + 1); }} />
                <textarea className="pp-textarea" rows={1} style={{ resize: "none", maxHeight: 120 }} placeholder="Mensagem (/ para respostas rápidas)" value={text} onChange={(e) => { setText(e.target.value); setQrIndex(0); }} onKeyDown={onKeyDown} />
                {text.trim() ? (
                  <button className="btn btn-accent btn-icon" onClick={sendText} disabled={sending} aria-label="Enviar"><Send size={16} /></button>
                ) : (
                  <AudioRecorder disabled={sending} onRecorded={(file, seconds) => sendFile(file, { ptt: true, seconds })} />
                )}
              </div>
            </div>

            <aside className="pp-side" data-open={panelOpen}>
              <LeadPanel key={active.id} lead={active} />
            </aside>
          </>
        ) : (
          <div className="pp-chat-main" style={{ alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)", gridColumn: "span 2" }}>
            Selecione uma conversa
          </div>
        )}
      </div>
    </>
  );
}
