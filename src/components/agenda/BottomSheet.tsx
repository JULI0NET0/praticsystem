"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type DragControls } from "framer-motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Rótulo para leitores de tela (a gaveta não tem título visível próprio). */
  label: string;
  /** Altura fixa (ex.: formulário quase em tela cheia); sem ela, ajusta ao conteúdo. */
  height?: string;
  /** Recebe a intenção de fechar por gesto — permite perguntar antes de descartar. */
  onDismissGesture?: () => void;
  children: ReactNode;
}

/**
 * Gaveta que sobe de baixo (design system §7.7: no mobile o modal é
 * bottom-sheet, cantos superiores de 24px, véu sem blur). Arrastar a alça para
 * baixo fecha. Toda ação do gesto existe também como botão.
 */
export default function BottomSheet({
  open,
  onClose,
  label,
  height,
  onDismissGesture,
  children,
}: BottomSheetProps) {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              background: "var(--color-scrim)",
            }}
          />
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
            }
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                (onDismissGesture ?? onClose)();
              }
            }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 301,
              height,
              maxHeight: "calc(100dvh - 24px)",
              display: "flex",
              flexDirection: "column",
              background: "var(--color-surface-raised)",
              borderTop: "1px solid var(--color-border-default)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "var(--shadow-lg)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <DragHandle controls={dragControls} />
            <span id={labelId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {label}
            </span>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** A alça é a única área que inicia o arrasto — o formulário abaixo rola normalmente. */
function DragHandle({ controls }: { controls: DragControls }) {
  return (
    <div
      data-sheet-handle
      aria-hidden="true"
      onPointerDown={(event) => controls.start(event)}
      style={{
        flexShrink: 0,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      <span
        style={{
          width: 36,
          height: 4,
          borderRadius: 999,
          background: "var(--color-border-default)",
        }}
      />
    </div>
  );
}
