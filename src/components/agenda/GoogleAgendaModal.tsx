"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Info, RefreshCw, X } from "lucide-react";
import { GoogleIcon } from "@/components/SocialIcons";
import type { GoogleAccountState } from "./GoogleSyncButton";

interface GoogleAgendaModalProps {
  open: boolean;
  onClose: () => void;
  state: GoogleAccountState;
  syncing: boolean;
  onSync: () => void;
}

const ACCOUNT = "agenciapratic@gmail.com";
const CONNECT_URL = "/api/agenda/google-auth?account=agenciapratic";

const BADGE: Record<GoogleAccountState, { label: string; color: string; wash: string }> = {
  ok: { label: "Conectado", color: "var(--color-success-ink)", wash: "var(--color-success-wash)" },
  expired: { label: "Sessão expirada", color: "var(--color-warning-ink)", wash: "var(--color-warning-wash)" },
  pending: { label: "Pendente", color: "var(--color-text-secondary)", wash: "var(--color-surface-sunken)" },
  checking: { label: "Verificando", color: "var(--color-text-secondary)", wash: "var(--color-surface-sunken)" },
};

/** Status da conta Google e reconexão. Abre pelo botão único do Google. */
export default function GoogleAgendaModal({ open, onClose, state, syncing, onSync }: GoogleAgendaModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  const badge = BADGE[state];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "var(--color-scrim)" }} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Google Agenda"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              x: "-50%",
              y: "-50%",
              width: "92%",
              maxWidth: 500,
              zIndex: 301,
              padding: 24,
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "flex", padding: 8, borderRadius: "var(--radius-md)", background: "var(--color-info-wash)" }}>
                  <GoogleIcon size={22} />
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "var(--text-h3)", fontWeight: 700 }}>Google Agenda</h2>
                  <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                    Sincronização bidirecional
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar" style={{ width: 44, height: 44 }}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontSize: "var(--text-ui)", fontWeight: 600 }}>{ACCOUNT}</div>
                  <div style={{ fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
                    Reuniões, captações e tarefas
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-badge)",
                    background: badge.wash,
                    color: badge.color,
                    fontSize: "var(--text-micro)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: badge.color }} />
                  {badge.label}
                </span>
              </div>

              {state === "checking" ? null : state === "ok" ? (
                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--color-border-subtle)" }}>
                  <a href={CONNECT_URL} style={{ fontSize: "var(--text-caption)", color: "var(--color-terracotta-ink)" }}>
                    Reconectar / renovar autorização
                  </a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8, borderTop: "1px solid var(--color-border-subtle)" }}>
                  <p style={{ margin: 0, fontSize: "var(--text-caption)", lineHeight: 1.4, color: state === "expired" ? "var(--color-warning-ink)" : "var(--color-text-secondary)" }}>
                    {state === "expired"
                      ? "A autorização do Google expirou ou foi revogada. Reconecte para voltar a sincronizar:"
                      : "Para conectar o Google Agenda desta conta, autorize no Google:"}
                  </p>
                  <a href={CONNECT_URL} className="btn btn-accent" style={{ textDecoration: "none", minHeight: 44 }}>
                    <GoogleIcon size={14} /> {state === "expired" ? "Reconectar" : "Conectar"} {ACCOUNT}
                  </a>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: 12,
                borderRadius: "var(--radius-input)",
                background: "var(--color-info-wash)",
                fontSize: "var(--text-caption)",
                lineHeight: 1.4,
                color: "var(--color-text-secondary)",
              }}
            >
              <Info size={16} aria-hidden="true" color="var(--color-info-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0 }}>
                <strong>Sincronização bidirecional ativa:</strong> compromissos públicos criados aqui vão para o Google
                Calendar. Os criados no Google entram ao abrir a agenda ou pelo botão <strong>Sincronizar agora</strong>.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1, minHeight: 44 }}>
                Fechar
              </button>
              <button type="button" className="btn btn-accent" disabled={syncing} onClick={onSync} style={{ flex: 1, minHeight: 44 }}>
                <RefreshCw size={14} aria-hidden="true" style={{ animation: syncing ? "agenda-spin 1s linear infinite" : "none" }} />
                Sincronizar agora
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
