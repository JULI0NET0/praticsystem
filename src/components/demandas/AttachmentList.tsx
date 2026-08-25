"use client";

import { useRef, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import type { DemandAttachment } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: DemandAttachment;
  onRemove?: (attachment: DemandAttachment) => void;
}) {
  const { attachmentUrl } = useDemandas();
  const isImage = (attachment.file_type ?? "").startsWith("image/");
  const Icon = isImage ? ImageIcon : FileText;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 10,
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
      }}
    >
      <Icon size={14} color="var(--text-tertiary)" />
      <a
        href={attachmentUrl(attachment)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          textDecoration: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {attachment.name}
      </a>
      {attachment.size ? (
        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", flexShrink: 0 }}>
          {formatSize(attachment.size)}
        </span>
      ) : null}
      <a
        href={attachmentUrl(attachment)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${attachment.name}`}
        style={{ display: "flex", color: "var(--text-tertiary)" }}
      >
        <Download size={13} />
      </a>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remover ${attachment.name}`}
          onClick={() => onRemove(attachment)}
          style={{
            display: "flex",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            color: "var(--text-tertiary)",
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

interface Props {
  demandId: string;
}

/** Anexos da própria demanda (comment_id nulo). */
export default function AttachmentList({ demandId }: Props) {
  const { attachmentsOf, uploadAttachment, removeAttachment } = useDemandas();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const attachments = attachmentsOf(demandId).filter((a) => a.comment_id === null);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setUploading(true);
    for (const file of files) {
      await uploadAttachment(demandId, file);
    }
    setUploading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={removeAttachment}
        />
      ))}

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFiles}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px dashed var(--border)",
          background: "transparent",
          cursor: uploading ? "wait" : "pointer",
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Paperclip size={14} /> Anexar arquivo
          </>
        )}
      </button>
    </div>
  );
}
