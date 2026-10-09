"use client";

import { useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import type { LeadMessage } from "@/types/database";

const KINDS: { match: RegExp; label: string; color: string }[] = [
  { match: /^pdf$/, label: "PDF", color: "#C0392B" },
  { match: /^(docx?|odt|rtf)$/, label: "DOC", color: "#2B5797" },
  { match: /^(xlsx?|csv|ods)$/, label: "XLS", color: "#1E7145" },
  { match: /^(pptx?|odp|key)$/, label: "PPT", color: "#C4511A" },
  { match: /^(zip|rar|7z)$/, label: "ZIP", color: "#7A5C2E" },
  { match: /^(txt|md)$/, label: "TXT", color: "#5C6670" },
];

export function extensionOf(name?: string | null, mimetype?: string | null): string {
  const fromName = name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && fromName !== name?.toLowerCase()) return fromName;
  if (mimetype?.includes("pdf")) return "pdf";
  return "";
}

export function formatBytes(n?: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function docBadge(ext: string): { label: string; color: string } {
  const kind = KINDS.find((k) => k.match.test(ext));
  return kind ?? { label: (ext || "ARQ").slice(0, 4).toUpperCase(), color: "#5C6670" };
}

/** Cartão de documento com selo colorido por tipo; PDF abre num visualizador na própria tela. */
export default function DocCard({ m }: { m: LeadMessage }) {
  const [viewer, setViewer] = useState(false);
  const name = m.media_name || "Documento";
  const ext = extensionOf(m.media_name, m.media_mimetype);
  const badge = docBadge(ext);
  const isPdf = ext === "pdf";
  const size = formatBytes(m.media_size);

  if (!m.media_url) return <em style={{ opacity: 0.8 }}>📄 {name} (arquivo indisponível)</em>;

  return (
    <>
      <div className="pp-doc">
        <span className="pp-doc-badge" style={{ background: badge.color }}>{badge.label}</span>
        <div className="pp-doc-info">
          <strong title={name}>{name}</strong>
          <span>{[badge.label === "PDF" ? "PDF" : ext.toUpperCase(), size].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <div className="pp-doc-actions">
        {isPdf ? (
          <button type="button" onClick={() => setViewer(true)}><ExternalLink size={12} /> Abrir</button>
        ) : (
          <a href={m.media_url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Abrir</a>
        )}
        <a href={m.media_url} download={name} target="_blank" rel="noreferrer"><Download size={12} /> Baixar</a>
      </div>
      {viewer && (
        <div className="pp-lightbox" role="dialog" aria-modal="true" aria-label={name} onClick={() => setViewer(false)}>
          <div className="pp-lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <a className="btn btn-secondary btn-icon" href={m.media_url} download={name} target="_blank" rel="noreferrer" aria-label="Baixar"><Download size={16} /></a>
            <button className="btn btn-secondary btn-icon" onClick={() => setViewer(false)} aria-label="Fechar"><X size={16} /></button>
          </div>
          <iframe className="pp-pdf-frame" src={m.media_url} title={name} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
