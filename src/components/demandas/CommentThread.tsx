"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Send, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { splitMentions, type QuickCatalogs } from "@/lib/quickParse";
import { clientLabel } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { UserAvatar } from "./AssigneePicker";
import { AttachmentChip } from "./AttachmentList";
import MentionTextarea from "./MentionTextarea";

const MENTION_STYLE: Record<"user" | "client", React.CSSProperties> = {
  user: { color: "var(--accent)", fontWeight: 700 },
  client: { color: "var(--color-info-ink)", fontWeight: 700 },
};

/**
 * Destaca `@Colaborador` e `#Cliente`. Casa contra os nomes do catálogo em vez
 * de um `@\S+`: os nomes têm espaço, e o padrão antigo destacava só a primeira
 * palavra de "@Julio Neto".
 */
function renderBody(body: string, catalogs: QuickCatalogs) {
  return splitMentions(body, catalogs).map((segment, index) =>
    segment.kind === "text" ? (
      <span key={index}>{segment.value}</span>
    ) : (
      <span key={index} style={MENTION_STYLE[segment.kind]}>
        {segment.value}
      </span>
    ),
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CommentThread({ demandId }: { demandId: string }) {
  const { currentUser } = useAuth();
  const {
    commentsOf,
    attachmentsOf,
    addComment,
    deleteComment,
    removeAttachment,
    getUser,
    users,
    clients,
  } = useDemandas();

  const catalogs = useMemo<QuickCatalogs>(
    () => ({
      users: users.map((user) => ({ id: user.id, label: user.name || user.email })),
      clients: clients.map((client) => ({
        id: client.id,
        label: clientLabel(client),
        alias: client.name,
      })),
    }),
    [users, clients],
  );

  const [body, setBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const comments = commentsOf(demandId);
  const attachments = attachmentsOf(demandId);

  const attachmentsByComment = useMemo(() => {
    const map = new Map<string, typeof attachments>();
    for (const attachment of attachments) {
      if (!attachment.comment_id) continue;
      const list = map.get(attachment.comment_id) ?? [];
      list.push(attachment);
      map.set(attachment.comment_id, list);
    }
    return map;
  }, [attachments]);

  const submit = async () => {
    if (sending) return;
    if (!body.trim() && pendingFiles.length === 0) return;

    setSending(true);
    await addComment(demandId, body, pendingFiles);
    setSending(false);
    setBody("");
    setPendingFiles([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {comments.length === 0 && (
        <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
          Nenhum comentário ainda.
        </span>
      )}

      {comments.map((comment) => {
        const author = getUser(comment.user_id);
        const isOwn = comment.user_id === currentUser?.id;
        const commentAttachments = attachmentsByComment.get(comment.id) ?? [];

        return (
          <div key={comment.id} style={{ display: "flex", gap: 10 }}>
            <UserAvatar
              name={author?.name ?? "?"}
              avatarUrl={author?.avatar_url ?? author?.avatarUrl}
              size={28}
              ring={false}
            />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {author?.name ?? "Usuário"}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                  {formatTimestamp(comment.created_at)}
                  {comment.edited && " · editado"}
                </span>
                {isOwn && (
                  <button
                    type="button"
                    aria-label="Excluir comentário"
                    onClick={() => deleteComment(comment)}
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {comment.body && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {renderBody(comment.body, catalogs)}
                </p>
              )}

              {commentAttachments.map((attachment) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={isOwn ? removeAttachment : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Caixa de envio */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 10,
          borderRadius: 12,
          background: "var(--color-surface-sunken)",
          border: "1px solid var(--border)",
        }}
      >
        <MentionTextarea
          value={body}
          onChange={setBody}
          catalogs={catalogs}
          onSubmit={submit}
          ariaLabel="Novo comentário"
          placeholder="Escreva um comentário… (@ colaborador, # cliente, ⌘+Enter envia)"
        />

        {pendingFiles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pendingFiles.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px",
                  borderRadius: 8,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  background: "var(--color-surface-inset)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {file.name}
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  onClick={() =>
                    setPendingFiles((files) => files.filter((_, i) => i !== index))
                  }
                  style={{
                    display: "flex",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={(event) => {
              setPendingFiles((files) => [...files, ...Array.from(event.target.files ?? [])]);
              event.target.value = "";
            }}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Anexar arquivo ao comentário"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 8px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.74rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            <Paperclip size={13} /> Anexar
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={sending || (!body.trim() && pendingFiles.length === 0)}
            className="btn btn-sm btn-accent"
            style={{ marginLeft: "auto" }}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Comentar
          </button>
        </div>
      </div>
    </div>
  );
}
