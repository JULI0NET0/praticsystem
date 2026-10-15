"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Inbox, Search, Send } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/CustomToast";
import { previewText, type ConversationSummary, type IgAttachment, type IgMessageKind } from "@/lib/instagramInbox";
import ContactAvatar, { SOURCE_LABEL, type IgContactView } from "./ContactAvatar";
import { timeAgo } from "./HomeDashboard";

type ConvContact = Pick<IgContactView, "igsid" | "username" | "name" | "profile_pic_url" | "is_follower">;
type Conversation = ConversationSummary & { contact: ConvContact | null };

interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  kind: IgMessageKind;
  text: string | null;
  attachments: IgAttachment[] | null;
  source: "instagram" | "automation" | "panel" | "import";
  automation_id: string | null;
  created_at: string;
}

interface Thread {
  messages: ThreadMessage[];
  contact: (IgContactView & { igsid: string }) | null;
  automations: Array<{ id: string; name: string; lastAt: string; status: string }>;
  window: { open: boolean; closesAt: string | null };
}

type Filter = "all" | "unread" | "reply";

const LIST_POLL_MS = 20_000;
const THREAD_POLL_MS = 10_000;

function convTitle(c: Conversation) {
  return c.contact?.username ? `@${c.contact.username}` : c.contact?.name || "Perfil não identificado";
}

function asAvatar(igsid: string, contact: ConvContact | null): IgContactView {
  return {
    id: igsid,
    igsid,
    username: contact?.username,
    name: contact?.name,
    profile_pic_url: contact?.profile_pic_url,
    first_seen_at: "",
    last_seen_at: "",
  };
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return dayFmt.format(d);
}

function hoursLeft(closesAt: string | null) {
  if (!closesAt) return 0;
  return Math.max(0, Math.ceil((new Date(closesAt).getTime() - Date.now()) / 3_600_000));
}

export default function InboxView({ automationNames }: { automationNames: Record<string, string> }) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/inbox", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error || "Erro ao carregar conversas.");
        return;
      }
      setListError(null);
      setConversations(data.conversations);
    } catch {
      setListError("Erro de conexão ao carregar conversas.");
    }
  }, []);

  const loadThread = useCallback(async (igsid: string) => {
    try {
      const res = await fetch(`/api/instagram/inbox/${igsid}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: Thread = await res.json();
      setThread((prev) => {
        // Só rola para o fim quando chegou mensagem nova.
        if (!prev || prev.messages.length !== data.messages.length) {
          requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
        }
        return data;
      });
      setConversations((list) => list?.map((c) => (c.igsid === igsid ? { ...c, unread: 0 } : c)) ?? list);
    } catch {
      // mantém o que já está na tela
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial vinda da API
    loadList();
    const id = setInterval(() => document.visibilityState === "visible" && loadList(), LIST_POLL_MS);
    return () => clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    loadThread(selected);
    const id = setInterval(() => document.visibilityState === "visible" && loadThread(selected), THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [selected, loadThread]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    return (conversations || []).filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (filter === "reply" && !c.needsReply) return false;
      if (!q) return true;
      return [c.contact?.username, c.contact?.name, c.lastText].some((v) => v?.toLowerCase().includes(q));
    });
  }, [conversations, query, filter]);

  const current = conversations?.find((c) => c.igsid === selected) ?? null;

  function openConversation(igsid: string) {
    setThread(null);
    setDraft("");
    setSelected(igsid);
  }

  async function importHistory() {
    setImporting(true);
    try {
      let after: string | null = null;
      let total = 0;
      for (let page = 0; page < 10; page++) {
        const res: Response = await fetch("/api/instagram/inbox/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ after }),
        });
        const data: { error?: string; imported: number; next: string | null } = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao importar.");
        total += data.imported;
        after = data.next;
        // A lista vai enchendo a cada página, sem esperar o fim.
        await loadList();
        if (!after) break;
      }
      showToast(total ? `${total} mensagens sincronizadas.` : "Nada novo para importar.", "success");
      await loadList();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setImporting(false);
    }
  }

  async function send() {
    if (!selected || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    try {
      const res = await fetch(`/api/instagram/inbox/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar.");
      setDraft("");
      await Promise.all([loadThread(selected), loadList()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setSending(false);
    }
  }

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "Todas" },
    { id: "unread", label: "Não lidas", count: (conversations || []).filter((c) => c.unread > 0).length },
    { id: "reply", label: "Responder", count: (conversations || []).filter((c) => c.needsReply).length },
  ];

  if (listError && !conversations) {
    return (
      <EmptyState
        icon={<Inbox size={20} />}
        title="Caixa de entrada indisponível"
        description={listError}
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadList}>
            Tentar de novo
          </button>
        }
      />
    );
  }

  return (
    <div className="surface flex overflow-hidden h-[calc(100dvh-9.5rem)] min-h-[520px] p-0">
      {/* Lista */}
      <aside
        className={`w-full md:w-80 shrink-0 border-r border-[var(--color-border-subtle)] flex-col ${
          selected ? "hidden md:flex" : "flex"
        }`}
        aria-label="Conversas"
      >
        <div className="p-3 space-y-2.5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Conversas</h1>
            <button type="button" className="btn btn-ghost btn-sm" onClick={importHistory} disabled={importing}>
              <Download className="w-3.5 h-3.5" />
              {importing ? "Importando..." : "Importar histórico"}
            </button>
          </div>
          <label className="relative block">
            <span className="sr-only">Buscar conversa</span>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por @, nome ou mensagem"
              className="input-dark pl-8"
            />
          </label>
          <div className="flex gap-1" role="group" aria-label="Filtro de conversas">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`btn btn-sm ${filter === f.id ? "btn-secondary" : "btn-ghost"}`}
              >
                {f.label}
                {!!f.count && <span className="tabular-nums text-[var(--color-text-secondary)]">{f.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto">
          {conversations === null ? (
            <li className="p-4 text-xs text-[var(--color-text-secondary)]">Carregando conversas...</li>
          ) : visible.length === 0 ? (
            <li className="p-6 text-center text-xs text-[var(--color-text-secondary)]">
              {conversations.length === 0
                ? "Nenhuma conversa ainda. Use “Importar histórico” para trazer as DMs que já existem."
                : "Nenhuma conversa nesse filtro."}
            </li>
          ) : (
            visible.map((c) => (
              <li key={c.igsid}>
                <button
                  type="button"
                  onClick={() => openConversation(c.igsid)}
                  aria-current={selected === c.igsid ? "true" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[var(--color-border-subtle)] ${
                    selected === c.igsid ? "bg-[var(--color-surface-sunken)]" : "hover:bg-[var(--color-surface-sunken)]"
                  }`}
                >
                  <ContactAvatar contact={asAvatar(c.igsid, c.contact)} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[13px] truncate ${
                          c.unread ? "font-bold text-[var(--color-text-primary)]" : "font-semibold text-[var(--color-text-primary)]"
                        }`}
                      >
                        {convTitle(c)}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] shrink-0">{timeAgo(c.lastAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--color-text-secondary)] truncate">
                        {c.lastDirection === "out" ? "Você: " : ""}
                        {previewText(c.lastKind, c.lastText)}
                      </span>
                      {c.unread > 0 && (
                        <span className="badge bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] shrink-0 tabular-nums">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {/* Conversa */}
      <section className={`flex-1 min-w-0 flex-col ${selected ? "flex" : "hidden md:flex"}`} aria-label="Conversa">
        {!selected || !current ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              icon={<Inbox size={20} />}
              title="Escolha uma conversa"
              description="Tudo que entra e sai na DM do Instagram aparece aqui: mensagens das pessoas, respostas das automações e as suas."
            />
          </div>
        ) : (
          <>
            <header className="h-14 shrink-0 px-3 flex items-center gap-3 border-b border-[var(--color-border-subtle)]">
              <button
                type="button"
                className="btn btn-ghost btn-icon md:hidden"
                aria-label="Voltar para a lista"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <ContactAvatar contact={asAvatar(current.igsid, current.contact)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{convTitle(current)}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {current.contact?.username && current.contact?.name ? current.contact.name : ""}
                </p>
              </div>
              {current.contact?.username && (
                <a
                  href={`https://instagram.com/${current.contact.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  Perfil <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 bg-[var(--color-surface-sunken)]">
              {!thread ? (
                <p className="text-xs text-[var(--color-text-secondary)]">Carregando mensagens...</p>
              ) : thread.messages.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">Sem mensagens.</p>
              ) : (
                thread.messages.map((m, i) => {
                  const prev = thread.messages[i - 1];
                  const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                  const mine = m.direction === "out";
                  const sourceLabel =
                    m.source === "automation"
                      ? `Automação${m.automation_id && automationNames[m.automation_id] ? `: ${automationNames[m.automation_id]}` : ""}`
                      : m.source === "panel"
                      ? "Enviada pelo painel"
                      : null;
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <p className="text-center text-[11px] font-semibold text-[var(--color-text-secondary)] py-2 first-letter:uppercase">
                          {dayLabel(m.created_at)}
                        </p>
                      )}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                            mine
                              ? "bg-[var(--color-terracotta-100)] text-[var(--color-text-primary)] rounded-br-md"
                              : "bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] rounded-bl-md"
                          }`}
                        >
                          {m.kind !== "template" && m.attachments?.map((a, j) =>
                            a.type === "image" && a.url ? (
                              <a key={j} href={a.url} target="_blank" rel="noreferrer" className="block mb-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.url} alt="Foto enviada na conversa" className="rounded-lg max-h-56 object-cover" />
                              </a>
                            ) : (
                              <a
                                key={j}
                                href={a.url ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-info-ink)] underline mb-1"
                              >
                                {previewText(m.kind, null)} <ExternalLink className="w-3 h-3" />
                              </a>
                            )
                          )}
                          {(m.text || !m.attachments || m.kind === "template") && (
                            <p className="whitespace-pre-wrap break-words">
                              {m.text || <span className="italic text-[var(--color-text-secondary)]">{previewText(m.kind, null)}</span>}
                            </p>
                          )}
                          {m.kind === "template" && !!m.attachments?.length && (
                            <div className="mt-2 flex flex-col gap-1">
                              {m.attachments.map((a, j) => (
                                <span
                                  key={j}
                                  className="rounded-lg border border-[var(--color-border-default)] px-2 py-1 text-center text-xs font-semibold text-[var(--color-info-ink)]"
                                >
                                  {a.title || "Botão"}
                                  {a.url ? " ↗" : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] text-right">
                            {sourceLabel ? `${sourceLabel} · ` : ""}
                            {timeFmt.format(new Date(m.created_at))}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <footer className="shrink-0 border-t border-[var(--color-border-subtle)] p-3 space-y-2">
              {thread && !thread.window.open ? (
                <p className="text-xs rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-wash)] text-[var(--color-warning-ink)] px-3 py-2">
                  Passaram 24h desde a última mensagem dessa pessoa. O Instagram só libera resposta quando ela escrever de novo.
                </p>
              ) : (
                <>
                  <form
                    className="flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      send();
                    }}
                  >
                    <label className="flex-1">
                      <span className="sr-only">Mensagem</span>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={2}
                        maxLength={1000}
                        placeholder="Escreva uma resposta (Enter envia, Shift+Enter quebra linha)"
                        className="input-dark resize-none"
                        disabled={!thread || sending}
                      />
                    </label>
                    <button type="submit" className="btn btn-accent" disabled={!draft.trim() || sending || !thread}>
                      <Send className="w-4 h-4" />
                      {sending ? "Enviando..." : "Enviar"}
                    </button>
                  </form>
                  {thread?.window.closesAt && (
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Janela de resposta do Instagram fecha em {hoursLeft(thread.window.closesAt)}h.
                    </p>
                  )}
                </>
              )}
            </footer>
          </>
        )}
      </section>

      {/* Contato */}
      {selected && thread?.contact && (
        <aside
          className="hidden xl:flex w-72 shrink-0 border-l border-[var(--color-border-subtle)] flex-col gap-4 p-4 overflow-y-auto"
          aria-label="Dados do contato"
        >
          <div className="flex flex-col items-center text-center gap-2">
            <ContactAvatar contact={thread.contact} size={64} />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {thread.contact.username ? `@${thread.contact.username}` : "Perfil não identificado"}
              </p>
              {thread.contact.name && <p className="text-xs text-[var(--color-text-secondary)]">{thread.contact.name}</p>}
            </div>
            {thread.contact.is_follower === true && (
              <Badge tone="success" dot>
                Segue você
              </Badge>
            )}
            {thread.contact.is_follower === false && <Badge tone="neutral">Não segue</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[var(--color-text-secondary)]">Origem</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">
                {thread.contact.source ? SOURCE_LABEL[thread.contact.source] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-secondary)]">Interações</dt>
              <dd className="font-semibold text-[var(--color-text-primary)] tabular-nums">{thread.contact.interactions || "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--color-text-secondary)]">Primeiro contato</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">
                {new Date(thread.contact.first_seen_at).toLocaleDateString("pt-BR")}
              </dd>
            </div>
          </dl>
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-[var(--color-text-primary)]">Automações que atingiram</h2>
            {thread.automations.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]">Nenhuma.</p>
            ) : (
              <ul className="space-y-1.5">
                {thread.automations.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-[var(--color-text-primary)]">{a.name}</span>
                    <span className="text-[var(--color-text-secondary)] shrink-0">{timeAgo(a.lastAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
