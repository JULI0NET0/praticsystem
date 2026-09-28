"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { GoogleIcon } from "@/components/SocialIcons";

export type GoogleAccountState = "ok" | "expired" | "pending" | "checking";

interface GoogleSyncButtonProps {
  state: GoogleAccountState;
  syncing: boolean;
  lastSyncedAt: number | null;
  onClick: () => void;
  /** Só o ícone com o ponto de status (mobile). */
  compact?: boolean;
}

function relativeSince(timestamp: number, now: number): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)} h`;
}

const DOT_COLOR: Record<GoogleAccountState, string> = {
  ok: "var(--color-success)",
  expired: "var(--color-warning)",
  pending: "var(--color-warning)",
  checking: "var(--color-text-muted)",
};

/**
 * Um único controle para o Google Agenda: mostra se está conectado, quando
 * sincronizou pela última vez e abre o painel de conexão. Substitui os dois
 * botões antigos (Sincronizar + status), que falavam da mesma coisa.
 */
export default function GoogleSyncButton({ state, syncing, lastSyncedAt, onClick, compact }: GoogleSyncButtonProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const statusText =
    state === "expired"
      ? "sessão expirada — reconectar"
      : state === "pending"
        ? "não conectado"
        : state === "checking"
          ? "verificando…"
          : syncing
          ? "sincronizando…"
          : lastSyncedAt
            ? `sincronizado ${relativeSince(lastSyncedAt, now)}`
            : "conectado";

  const label = `Google Agenda: ${statusText}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="btn btn-ghost btn-icon"
        style={{ position: "relative", width: 44, height: 44 }}
      >
        <GoogleIcon size={18} />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 10,
            right: 9,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: DOT_COLOR[state],
            border: "2px solid var(--color-surface-raised)",
          }}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title="Status e conexão com o Google Agenda"
      className="btn btn-secondary"
      style={{ height: 34, gap: 8, fontSize: "var(--text-ui)", fontWeight: 500, color: "var(--color-text-secondary)" }}
    >
      <GoogleIcon size={15} />
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, background: DOT_COLOR[state] }}
      />
      <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Google</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{statusText}</span>
      <RefreshCw size={14} aria-hidden="true" style={{ animation: syncing ? "agenda-spin 1s linear infinite" : "none" }} />
    </button>
  );
}
