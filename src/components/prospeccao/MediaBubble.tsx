"use client";

import { FileText } from "lucide-react";
import type { LeadMessage } from "@/types/database";

export default function MediaBubble({ m }: { m: LeadMessage }) {
  if (m.message_type === "text" || !m.message_type) return m.body ? <>{m.body}</> : null;

  const caption = m.body ? <div>{m.body}</div> : null;
  if (!m.media_url) {
    const label = { image: "📷 Foto", audio: "🎤 Áudio", video: "🎬 Vídeo", document: "📄 Documento", sticker: "Figurinha" }[m.message_type];
    return <><em style={{ opacity: 0.8 }}>{label} (arquivo indisponível)</em>{caption}</>;
  }
  switch (m.message_type) {
    case "image":
    case "sticker":
      return <><a href={m.media_url} target="_blank" rel="noreferrer"><img src={m.media_url} alt={m.media_name ?? "imagem"} loading="lazy" /></a>{caption}</>;
    case "video":
      return <><video src={m.media_url} controls preload="metadata" />{caption}</>;
    case "audio":
      return <><audio src={m.media_url} controls preload="metadata" />{m.media_seconds ? <small style={{ opacity: 0.7 }}>{m.media_seconds}s</small> : null}{caption}</>;
    default:
      return <><a className="doc" href={m.media_url} target="_blank" rel="noreferrer"><FileText size={18} />{m.media_name || "Documento"}</a>{caption}</>;
  }
}
