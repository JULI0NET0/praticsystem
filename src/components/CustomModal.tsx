"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ModalType = "success" | "error" | "danger" | "warning" | "info" | "confirm";

export interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  maxWidth?: string;
  zIndex?: number;
}

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmText,
  cancelText = "Cancelar",
  showCancel,
  loading = false,
  icon,
  maxWidth = "440px",
  zIndex = 10050,
}: CustomModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Keyboard accessibility: ESC to close, ENTER to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only trigger if active element isn't a textarea or different button
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "textarea") {
          e.preventDefault();
          if (onConfirm) {
            onConfirm();
          } else {
            onClose();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!mounted) return null;

  const isDestructive = type === "error" || type === "danger";
  const isConfirmType = type === "confirm" || type === "danger" || type === "warning" || !!onConfirm;
  const shouldShowCancel = showCancel !== undefined ? showCancel : isConfirmType;
  const resolvedConfirmText = confirmText || (isDestructive ? "Excluir" : "Confirmar");

  const renderIcon = () => {
    if (icon) return icon;
    if (type === "success") {
      return <CheckCircle2 size={24} color="var(--color-success)" />;
    }
    if (type === "error" || type === "danger") {
      return <Trash2 size={24} color="var(--color-danger)" />;
    }
    if (type === "warning") {
      return <AlertTriangle size={24} color="var(--color-warning)" />;
    }
    return <Info size={24} color="var(--accent)" />;
  };

  const getIconBackground = () => {
    if (type === "success") return "var(--color-success-wash)";
    if (type === "error" || type === "danger") return "var(--color-danger-wash)";
    if (type === "warning") return "var(--color-warning-wash)";
    return "var(--color-terracotta-100)";
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backgroundColor: "var(--color-scrim)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card"
            style={{
              width: "100%",
              maxWidth,
              padding: "28px 24px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              position: "relative",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-raised)",
              boxShadow: "0 20px 48px rgba(0,0,0,0.35)",
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color var(--duration-fast)",
              }}
              className="hover-opacity"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            {/* Header: Icon + Title & Message */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  minWidth: "48px",
                  borderRadius: "50%",
                  background: getIconBackground(),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {renderIcon()}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0, paddingTop: "2px" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>
                <div
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </div>
              </div>
            </div>

            {/* Actions footer */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "4px",
              }}
            >
              {shouldShowCancel && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ minWidth: "100px" }}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm || onClose}
                disabled={loading}
                className={`btn ${isDestructive ? "btn-danger" : "btn-accent"}`}
                style={{ minWidth: "110px" }}
              >
                {loading ? "Aguarde..." : resolvedConfirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
