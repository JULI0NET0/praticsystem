"use client";

import { useState } from "react";

export interface IgContactView {
  id: string;
  igsid: string;
  username?: string | null;
  name?: string | null;
  profile_pic_url?: string | null;
  source?: "comment" | "dm" | "button" | null;
  interactions?: number | null;
  is_follower?: boolean | null;
  first_seen_at: string;
  last_seen_at: string;
}

export function contactTitle(c: IgContactView): string {
  return c.username ? `@${c.username}` : c.name || "Perfil não identificado";
}

export const SOURCE_LABEL: Record<string, string> = {
  comment: "Comentário",
  dm: "Direct",
  button: "Botão da DM",
};

// Foto do perfil quando o Instagram devolve; senão, iniciais. A URL da foto expira,
// então o erro de carregamento também cai nas iniciais.
export default function ContactAvatar({ contact, size = 32 }: { contact: IgContactView; size?: number }) {
  const [failed, setFailed] = useState(false);
  const label = contact.name || contact.username || "?";
  const initials = label
    .replace(/^@/, "")
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (contact.profile_pic_url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.profile_pic_url}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-full object-cover shrink-0 bg-[var(--color-surface-sunken)]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="rounded-full shrink-0 flex items-center justify-center bg-[var(--color-surface-inset)] text-[var(--color-text-secondary)] font-semibold"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials || "?"}
    </span>
  );
}
