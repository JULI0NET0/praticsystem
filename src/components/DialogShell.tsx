"use client";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface DialogShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  footer?: ReactNode;
  children: ReactNode;
  zIndex?: number;
}

export default function DialogShell({
  isOpen,
  onClose,
  title,
  maxWidth = "640px",
  footer,
  children,
  zIndex = 100,
}: DialogShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const variants = isMobile
    ? {
        initial: { opacity: 0, y: "100%" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "100%" },
      }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? 0 : "24px",
            backgroundColor: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: isMobile ? "100%" : maxWidth,
              maxHeight: isMobile ? "90dvh" : "calc(100dvh - 48px)",
              borderRadius: isMobile ? "24px 24px 0 0" : undefined,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "8px",
                  lineHeight: 0,
                  transition: "color 0.15s",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "24px",
              }}
            >
              {children}
            </div>

            {footer && (
              <div
                style={{
                  padding: "12px 24px",
                  paddingBottom: isMobile
                    ? "calc(12px + env(safe-area-inset-bottom, 0px))"
                    : "12px",
                  borderTop: "1px solid var(--border)",
                  flexShrink: 0,
                  background: "var(--glass-bg)",
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
