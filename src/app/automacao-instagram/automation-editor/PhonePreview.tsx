"use client";

import Image from "next/image";

export type PhonePreviewCtaType = "link" | "button" | "quick_reply";

interface Props {
  username: string;
  handle: string;
  messageText: string;
  ctaType: PhonePreviewCtaType;
  buttonText?: string;
}

export default function PhonePreview({ username, handle, messageText, ctaType, buttonText }: Props) {
  const hasButton = !!buttonText?.trim();
  const text = messageText.trim();

  return (
    <div className="sticky top-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3 text-center">
        Prévia no Instagram
      </p>

      {/* Phone chrome */}
      <div className="mx-auto w-[260px] rounded-[2.25rem] border-[6px] border-[var(--color-surface-inset)] bg-[var(--color-surface-canvas)] shadow-xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1 text-[10px] font-semibold text-[var(--color-text-primary)]">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm bg-[var(--color-text-primary)]" />
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-subtle)]">
          <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[var(--color-surface-sunken)]">
            <Image src="/bio/avatar.jpg" alt={username} fill unoptimized className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[var(--color-text-primary)] truncate">{username}</p>
            <p className="text-[9px] text-[var(--color-text-muted)] truncate">{handle}</p>
          </div>
        </div>

        {/* Message bubble */}
        <div className="p-3 min-h-[180px] flex flex-col justify-end gap-2 bg-[var(--color-surface-sunken)]/40">
          {text ? (
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] overflow-hidden">
              <p className="px-3 py-2 text-[11px] leading-snug text-[var(--color-text-primary)] whitespace-pre-wrap">
                {text}
              </p>
              {hasButton && ctaType !== "quick_reply" && (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-[11px] font-semibold text-center border-t border-[var(--color-border-subtle)] text-blue-500"
                >
                  {buttonText}
                  {ctaType === "link" && " ↗"}
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-default)] px-3 py-2">
              <p className="text-[11px] text-[var(--color-text-muted)] italic">
                Sua mensagem aparece aqui...
              </p>
            </div>
          )}

          {hasButton && ctaType === "quick_reply" && (
            <div className="flex justify-start">
              <span className="text-[10px] font-semibold px-3 py-1.5 rounded-full border border-blue-400 text-blue-500">
                {buttonText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
