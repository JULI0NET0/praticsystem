"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, PanelRight, Paperclip, RotateCw, Search, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/CustomToast";
import EmptyState from "@/components/ui/EmptyState";
import { STAGES, displayName, formatPhone, interpolate } from "@/lib/prospeccao/leads";
import { TYPE_LABEL, countsForBadge } from "@/lib/prospeccao/classify";
import { useProspeccao } from "./ProspeccaoProvider";
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
const TICK_ONE = "M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z";
const TICK_TWO = "M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z";

function StatusMark({ status }: { status: LeadMessage["status"] }) {
  const title = STATUS_TITLE[status];
  if (status === "queued") return <span title={title}>…</span>;
  if (status === "failed") return <span title={title}>!</span>;
  const read = status === "read" || status === "played";
  return (
    <svg className="pp-ticks" data-read={read} viewBox="0 0 16 15" width="16" height="15" role="img" aria-label={title}>
      <path fill="currentColor" d={status === "sent" ? TICK_ONE : TICK_TWO} />
    </svg>
  );
}

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

const PAGE = 40;
const LOCAL = "local-";

type ThreadCache = { messages: LeadMessage[]; hasMore: boolean };
const threadCache = new Map<string, ThreadCache>();

function mergeMessages(...groups: LeadMessage[][]): LeadMessage[] {
  const map = new Map<string, LeadMessage>();
  for (const group of groups) for (const m of group) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function revokeBlob(url?: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function samePending(local: LeadMessage, real: LeadMessage) {
  return local.id.startsWith(LOCAL)
    && local.direction === "out"
    && real.direction === "out"
    && (local.body || "") === (real.body || "")
    && (local.message_type || "text") === (real.message_type || "text")
    && (local.status === "queued" || local.status === "failed");
}

/** Troca a bolha temporária pela gravada. Se o realtime chegou antes, não duplica. */
function absorb(prev: LeadMessage[], row: LeadMessage, localId?: string): LeadMessage[] {
  const dropLocal = (list: LeadMessage[]) => {
    if (!localId) return list;
    const local = list.find((m) => m.id === localId);
    if (local && local.id !== row.id) revokeBlob(local.media_url);
    return list.filter((m) => m.id !== localId);
  };
  if (prev.some((m) => m.id === row.id)) return dropLocal(prev).map((m) => (m.id === row.id ? row : m));
  if (localId && prev.some((m) => m.id === localId)) {
    return prev.map((m) => {
      if (m.id !== localId) return m;
      revokeBlob(m.media_url);
      return row;
    });
  }
  const idx = prev.findIndex((m) => samePending(m, row));
  if (idx >= 0) {
    const next = prev.slice();
    revokeBlob(next[idx].media_url);
    next[idx] = row;
    return next;
  }
  return [...prev, row];
}

function localMessage(leadId: string, partial: Pick<LeadMessage, "body" | "message_type"> & Partial<LeadMessage>): LeadMessage {
  return {
    id: `${LOCAL}${crypto.randomUUID()}`,
    lead_id: leadId,
    direction: "out",
    status: "queued",
    created_at: new Date().toISOString(),
    media_url: null,
    media_mimetype: null,
    media_name: null,
    media_seconds: null,
    media_size: null,
    ...partial,
  };
}

function outboundPayload(m: LeadMessage): Record<string, unknown> {
  if (m.message_type !== "text" && m.media_url && !m.media_url.startsWith("blob:")) {
    return {
      body: m.body || undefined,
      media: {
        type: m.message_type === "audio" ? "ptt" : m.message_type,
        url: m.media_url,
        name: m.media_name ?? undefined,
        mimetype: m.media_mimetype ?? undefined,
        seconds: m.media_seconds ?? undefined,
        size: m.media_size ?? undefined,
      },
    };
  }
  return { body: m.body };
}

function Avatar({ lead }: { lead: Lead }) {
  return lead.wa_avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={lead.wa_avatar_url} alt="" className="pp-avatar" style={{ objectFit: "cover" }} />
  ) : (
    <span className="pp-avatar">{initialsOf(displayName(lead))}</span>
  );
}

export default function ConversasView() {
  const { contacts, quickReplies, updateLead, moveLead, setContactType } = useProspeccao();
  const { showToast } = useToast();
  const params = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(params.get("lead"));
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [qrIndex, setQrIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todas");
  const [drawerOpen, setDrawerOpenState] = useState(false);
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [schedKey, setSchedKey] = useState(0);
  const setDrawerOpen = (open: boolean) => {
    setDrawerOpenState(open);
    try { window.localStorage.setItem("pratic:prospeccao:drawer", open ? "1" : "0"); } catch { /* sem armazenamento */ }
  };
  const msgsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);
  const localFiles = useRef(new Map<string, File>());

  // lê a preferência da gaveta só no cliente
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva, lida só no cliente (evita descompasso de SSR)
    try { setDrawerOpenState(window.localStorage.getItem("pratic:prospeccao:drawer") === "1"); } catch { /* sem armazenamento */ }
  }, []);

  // Esc fecha a gaveta
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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
    const el = msgsRef.current;
    if (!el) return;
    const top = el.scrollHeight - el.clientHeight;
    if (smooth) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
    atBottomRef.current = true;
    setAtBottom(true);
    setNewBelow(0);
  };

  // Abre a conversa: últimas 40, cache da sessão, marca como lida e acompanha novas mensagens + recibos (✓✓).
  useEffect(() => {
    if (!active) return;
    const leadId = active.id;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda quantas estavam sem ler ao abrir
    setUnreadAtOpen(active.unread_count);
    setNewBelow(0);
    const cached = threadCache.get(leadId);
    if (cached) {
      setMessages(cached.messages);
      setHasMore(cached.hasMore);
      setLoadedFor(leadId);
    }
    supabase.from("lead_messages").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(PAGE).then(({ data }) => {
      if (!alive) return;
      const recent = ((data || []) as LeadMessage[]).reverse();
      const pageFull = (data?.length ?? 0) === PAGE;
      const stored = threadCache.get(leadId);
      const oldestRecent = recent[0]?.created_at;
      const keptOlder = (stored?.messages ?? []).filter((m) => !m.id.startsWith(LOCAL) && !!oldestRecent && m.created_at < oldestRecent);
      const hasMoreNext = keptOlder.length > 0 ? Boolean(stored?.hasMore) : pageFull;
      setHasMore(hasMoreNext);
      setMessages((prev) => {
        const live = prev.filter((m) => m.lead_id === leadId && !m.id.startsWith(LOCAL) && !recent.some((r) => r.id === m.id) && !(oldestRecent && m.created_at < oldestRecent));
        const arrived = [...keptOlder, ...recent, ...live];
        const locals = prev.filter((m) => m.lead_id === leadId && m.id.startsWith(LOCAL)).filter((local) => {
          if (!arrived.some((r) => samePending(local, r))) return true;
          revokeBlob(local.media_url);
          localFiles.current.delete(local.id);
          return false;
        });
        const merged = mergeMessages(keptOlder, recent, live, locals);
        threadCache.set(leadId, { messages: merged, hasMore: hasMoreNext });
        return merged;
      });
      setLoadedFor(leadId);
    });
    updateLead(leadId, { unread_count: 0, last_read_at: new Date().toISOString() });
    const channel = supabase
      .channel(`lead-msgs-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_messages", filter: `lead_id=eq.${leadId}` }, (p) => {
        if (p.eventType === "DELETE") return;
        const row = p.new as LeadMessage;
        setMessages((prev) => absorb(prev, row));
        if (p.eventType === "INSERT" && row.direction === "in") {
          updateLead(leadId, { unread_count: 0, last_read_at: new Date().toISOString() });
          if (!atBottomRef.current) setNewBelow((n) => n + 1);
        }
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  useEffect(() => {
    if (!activeId || loadedFor !== activeId) return;
    threadCache.set(activeId, { messages, hasMore });
  }, [messages, hasMore, loadedFor, activeId]);

  // Divisor "N mensagens não lidas": antes da N-ésima recebida contada do fim.
  const dividerId = useMemo(() => {
    if (!unreadAtOpen || loadedFor !== activeId) return null;
    const incoming = messages.filter((m) => m.direction === "in");
    return incoming[incoming.length - unreadAtOpen]?.id ?? null;
  }, [messages, unreadAtOpen, loadedFor, activeId]);

  // Ao abrir a conversa, a última mensagem fica no fim do painel — antes da pintura, sem mover a página.
  useLayoutEffect(() => {
    if (loadedFor !== activeId || !activeId) return;
    scrollToEnd();
  }, [loadedFor, activeId]);

  // Nova mensagem, ou mídia que cresce depois: acompanha o fim só se o usuário já estava lá.
  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (!el || loadedFor !== activeId) return;
    const pin = () => {
      if (!atBottomRef.current) return;
      el.scrollTop = el.scrollHeight - el.clientHeight;
    };
    pin();
    const observer = new ResizeObserver(pin);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [messages, loadedFor, activeId]);

  const onScroll = () => {
    const el = msgsRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setNewBelow(0);
  };

  const loadOlder = async () => {
    if (!active || loadingOlder || !hasMore || loadedFor !== active.id) return;
    const oldest = messages.find((m) => m.lead_id === active.id && !m.id.startsWith(LOCAL))?.created_at;
    if (!oldest) { setHasMore(false); return; }
    setLoadingOlder(true);
    const el = msgsRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    const { data } = await supabase.from("lead_messages").select("*").eq("lead_id", active.id).lt("created_at", oldest).order("created_at", { ascending: false }).limit(PAGE);
    const older = ((data || []) as LeadMessage[]).reverse();
    const more = (data?.length ?? 0) === PAGE;
    setHasMore(more);
    setMessages((prev) => mergeMessages(older, prev.filter((m) => m.lead_id === active.id)));
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = msgsRef.current;
        if (!node) return;
        node.scrollTop = node.scrollHeight - prevHeight + prevTop;
      });
    });
  };

  const postMessage = async (leadId: string, payload: Record<string, unknown>, localId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/prospeccao/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ leadId, ...payload }),
    });
    const json = await res.json().catch(() => ({})) as { message?: LeadMessage; error?: string };
    if (json.message) {
      if (localId) localFiles.current.delete(localId);
      setMessages((prev) => absorb(prev, json.message as LeadMessage, localId));
      if (!res.ok) showToast(json.error || "Falha ao enviar.", "error");
      return { ok: res.ok, saved: true };
    }
    if (localId) setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: "failed" } : m)));
    showToast(json.error || "Falha ao enviar.", "error");
    return { ok: false, saved: false };
  };

  const pushLocal = (local: LeadMessage) => {
    setMessages((prev) => [...prev.filter((m) => m.lead_id === local.lead_id), local]);
    scrollToEnd();
  };

  const sendText = () => {
    if (!active) return;
    const body = text.trim();
    if (!body) return;
    const local = localMessage(active.id, { body, message_type: "text" });
    setText("");
    pushLocal(local);
    void postMessage(active.id, { body }, local.id);
  };

  const uploadAndSend = async (leadId: string, localId: string, file: File, caption: string, type: "image" | "video" | "audio" | "document" | "ptt", seconds?: number) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${leadId}/out-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("prospeccao-media").upload(path, file, { contentType: file.type || undefined });
    if (error) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: "failed" } : m)));
      showToast("Erro no upload: " + error.message, "error");
      return;
    }
    const url = supabase.storage.from("prospeccao-media").getPublicUrl(path).data.publicUrl;
    await postMessage(leadId, {
      body: caption || undefined,
      media: { type, url, name: file.name, mimetype: file.type, seconds, size: file.size },
    }, localId);
  };

  const sendFile = (file: File, opts?: { ptt?: boolean; seconds?: number }) => {
    if (!active) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return showToast(`Arquivo acima de ${MAX_FILE_MB} MB.`, "error");
    const leadId = active.id;
    const type = opts?.ptt ? "ptt" : mediaTypeFor(file);
    const caption = text.trim();
    const local = localMessage(leadId, {
      body: caption,
      message_type: type === "ptt" ? "audio" : type,
      media_url: URL.createObjectURL(file),
      media_mimetype: file.type,
      media_name: file.name,
      media_seconds: opts?.seconds ?? null,
      media_size: file.size,
    });
    localFiles.current.set(local.id, file);
    setText("");
    pushLocal(local);
    void uploadAndSend(leadId, local.id, file, caption, type, opts?.seconds);
  };

  const resend = async (m: LeadMessage) => {
    const file = localFiles.current.get(m.id);
    if (m.id.startsWith(LOCAL)) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "queued" } : x)));
      if (file && m.message_type !== "text" && m.message_type !== "sticker") {
        const type = m.message_type === "audio" ? "ptt" : m.message_type;
        await uploadAndSend(m.lead_id, m.id, file, m.body, type, m.media_seconds ?? undefined);
        return;
      }
      await postMessage(m.lead_id, { body: m.body }, m.id);
      return;
    }
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "queued" } : x)));
    const { saved } = await postMessage(m.lead_id, outboundPayload(m));
    if (!saved) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "failed" } : x)));
      return;
    }
    await supabase.from("lead_messages").delete().eq("id", m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
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
      <EmptyState title="Sem conversas" description="Cadastre leads com WhatsApp ou aguarde mensagens chegarem pelo webhook para conversar aqui." />
    );
  }

  return (
    <>
      <div className="pp-chat" data-open={!!active} data-drawer={drawerOpen && !!active}>
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
            <button key={l.id} className="pp-chat-item" data-active={l.id === activeId} onClick={() => setActiveId(l.id)}>
              <Avatar lead={l} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: "var(--text-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(l)}</strong>
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
                <button type="button" className="pp-header-btn" onClick={() => setDrawerOpen(!drawerOpen)} aria-expanded={drawerOpen} aria-label="Ver dados do contato" title="Ver dados do contato">
                  <Avatar lead={active} />
                  <span style={{ minWidth: 0, textAlign: "left" }}>
                    <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(active)}</strong>
                    <span style={{ display: "block", fontSize: "var(--text-caption)", color: "var(--color-text-tertiary)" }}>{formatPhone(active.telefone)} · ver dados</span>
                  </span>
                </button>
                {(active.tipo ?? "lead") === "lead" ? (
                  <select className="pp-select pp-stage-select" aria-label="Status do lead" value={active.estagio} onChange={(e) => moveLead(active.id, e.target.value as LeadStage)}>
                    {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                  </select>
                ) : (
                  <span className="pp-type-tag">{TYPE_LABEL[(active.tipo ?? "lead") as ContactType]}</span>
                )}
                <button className="btn btn-secondary btn-icon" data-active={drawerOpen} onClick={() => setDrawerOpen(!drawerOpen)} aria-pressed={drawerOpen} aria-label="Dados do contato" title="Dados do contato"><PanelRight size={15} /></button>
              </div>
              {(active.tipo ?? "lead") === "triagem" && <TriageBanner lead={active} onChoose={choose} />}
              <div className="pp-msgs" ref={msgsRef} onScroll={onScroll}>
                {loadedFor === activeId && hasMore && (
                  <button type="button" className="pp-older" onClick={loadOlder} disabled={loadingOlder}>
                    {loadingOlder ? "Carregando…" : "Mensagens anteriores"}
                  </button>
                )}
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                  const grouped = !newDay && prev.direction === m.direction && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000;
                  return (
                    <div key={m.id} style={{ display: "contents" }}>
                      {newDay && <div className="pp-day"><span>{dayLabel(m.created_at)}</span></div>}
                      {m.id === dividerId && (
                        <div className="pp-unread-divider">{unreadAtOpen} {unreadAtOpen === 1 ? "mensagem não lida" : "mensagens não lidas"}</div>
                      )}
                      <div className={`pp-bubble ${m.direction}`} data-grouped={grouped} data-failed={m.status === "failed"}>
                        <MediaBubble m={m} contactAvatar={active.wa_avatar_url} contactInitials={initialsOf(displayName(active))} />
                        <span className="meta">
                          {hhmm(m.created_at)}
                          {m.direction === "out" && <StatusMark status={m.status} />}
                        </span>
                      </div>
                      {m.status === "failed" && m.direction === "out" && (
                        <button className="pp-retry" onClick={() => resend(m)}><RotateCw size={12} /> Não enviada. Tentar de novo</button>
                      )}
                    </div>
                  );
                })}
                {!messages.length && loadedFor === activeId && <p style={{ margin: "auto", color: "var(--color-text-tertiary)", fontSize: "var(--text-ui)" }}>Nenhuma mensagem ainda. Digite / para usar uma resposta rápida.</p>}
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
                <button className="btn btn-secondary btn-icon" onClick={() => fileRef.current?.click()} aria-label="Anexar arquivo" title="Foto, vídeo, documento ou áudio"><Paperclip size={16} /></button>
                <ScheduleButton lead={active} text={text} onScheduled={() => { setText(""); setSchedKey((k) => k + 1); }} />
                <textarea className="pp-textarea" rows={1} style={{ resize: "none", maxHeight: 120 }} placeholder="Mensagem (/ para respostas rápidas)" value={text} onChange={(e) => { setText(e.target.value); setQrIndex(0); }} onKeyDown={onKeyDown} />
                {text.trim() ? (
                  <button className="btn btn-accent btn-icon" onClick={sendText} aria-label="Enviar"><Send size={16} /></button>
                ) : (
                  <AudioRecorder onRecorded={(file, seconds) => sendFile(file, { ptt: true, seconds })} />
                )}
              </div>
            </div>

            {drawerOpen && (
              <aside className="pp-side" aria-label="Dados do contato">
                <LeadPanel key={active.id} lead={active} onClose={() => setDrawerOpen(false)} />
              </aside>
            )}
          </>
        ) : (
          <div className="pp-chat-main" style={{ alignItems: "center", justifyContent: "center", color: "var(--color-text-tertiary)" }}>
            Selecione uma conversa
          </div>
        )}
      </div>
    </>
  );
}
