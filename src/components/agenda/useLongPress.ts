"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type MouseEvent } from "react";

const LONG_PRESS_MS = 450;
/** Passou disso, o dedo está rolando ou arrastando — não é um toque longo. */
const MOVE_TOLERANCE_PX = 8;

/**
 * Toque e segurar. Devolve os handlers para espalhar no elemento; sem
 * `callback`, devolve `{}` e o elemento se comporta como sempre.
 *
 * Depois que dispara, o "click" que o navegador emite ao soltar o dedo é
 * engolido (senão o toque longo abriria os detalhes logo em seguida).
 */
export function useLongPress(callback?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  if (!callback) return {};

  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        timer.current = null;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
        latest.current?.();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event: PointerEvent) => {
      if (!origin.current) return;
      const moved = Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y);
      if (moved > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: MouseEvent) => {
      // O menu nativo do toque longo (copiar/salvar imagem) só atrapalha aqui.
      event.preventDefault();
    },
    onClickCapture: (event: MouseEvent) => {
      if (fired.current) {
        fired.current = false;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
