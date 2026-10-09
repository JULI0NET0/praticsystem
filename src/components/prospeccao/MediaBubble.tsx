"use client";

import { useState } from "react";
import AudioBubble from "./AudioBubble";
import DocCard from "./DocCard";
import ImageLightbox from "./ImageLightbox";
import type { LeadMessage } from "@/types/database";

interface Props {
  m: LeadMessage;
  contactAvatar?: string | null;
  contactInitials: string;
  selfInitials?: string;
}

export default function MediaBubble({ m, contactAvatar, contactInitials, selfInitials = "EU" }: Props) {
  const [open, setOpen] = useState(false);
  if (m.message_type === "text" || !m.message_type) return m.body ? <>{m.body}</> : null;

  const caption = m.body ? <div className="pp-caption">{m.body}</div> : null;
  const initials = m.direction === "in" ? contactInitials : selfInitials;

  switch (m.message_type) {
    case "image":
    case "sticker":
      if (!m.media_url) return <><em style={{ opacity: 0.8 }}>📷 Foto (arquivo indisponível)</em>{caption}</>;
      return (
        <>
          <button type="button" className="pp-media-btn" onClick={() => setOpen(true)} aria-label="Ampliar imagem">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.media_url} alt={m.media_name ?? "imagem"} loading="lazy" />
          </button>
          {caption}
          {open && <ImageLightbox src={m.media_url} alt={m.media_name ?? undefined} onClose={() => setOpen(false)} />}
        </>
      );
    case "video":
      if (!m.media_url) return <><em style={{ opacity: 0.8 }}>🎬 Vídeo (arquivo indisponível)</em>{caption}</>;
      return <><video src={m.media_url} controls preload="metadata" />{caption}</>;
    case "audio":
      return <><AudioBubble m={m} avatarUrl={contactAvatar} initials={initials} />{caption}</>;
    default:
      return <><DocCard m={m} />{caption}</>;
  }
}
