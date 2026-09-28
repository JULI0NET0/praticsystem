"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { AnimatePresence, motion } from "framer-motion";

interface FloatingPopoverProps {
  open: boolean;
  /** Coordenadas de VIEWPORT (clientX/clientY) do ponto de origem. */
  x: number;
  y: number;
  onClose: () => void;
  label: string;
  width?: number;
  /** Muda quando o conteúdo muda de tamanho (detalhes → formulário): reposiciona. */
  layoutKey: string;
  children: ReactNode;
}

/**
 * Popover ancorado no ponto do clique (desktop). O flip resolve a borda
 * direita, o shift mantém dentro da viewport e o size limita a altura ao
 * espaço disponível. Posiciona em useLayoutEffect, antes da pintura, sem flash.
 *
 * z-index 300: acima do menu e dos modais (200), abaixo do painel do
 * Combobox (400) — senão a lista de clientes abriria escondida por trás.
 */
export default function FloatingPopover({ open, x, y, onClose, label, width = 380, layoutKey, children }: FloatingPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<CSSProperties>({ position: "fixed", left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const element = ref.current;
    if (!element) return;

    const anchor = {
      getBoundingClientRect: () => ({ width: 0, height: 0, x, y, top: y, left: x, right: x, bottom: y }),
    };

    let cancelled = false;
    computePosition(anchor, element, {
      strategy: "fixed",
      placement: "right-start",
      middleware: [
        offset(8),
        flip({ fallbackPlacements: ["left-start", "right-end", "left-end"] }),
        shift({ padding: 12 }),
        size({
          padding: 12,
          apply({ availableHeight, elements }) {
            elements.floating.style.maxHeight = `${Math.max(280, availableHeight)}px`;
          },
        }),
      ],
    }).then(({ x: left, y: top }) => {
      if (!cancelled) setPosition({ position: "fixed", left, top });
    });

    return () => {
      cancelled = true;
    };
  }, [open, x, y, layoutKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              ...position,
              width,
              zIndex: 300,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: 0,
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-card)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
