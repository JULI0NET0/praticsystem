"use client";

import { useEffect, useState } from "react";

/**
 * Efeito de "digitando..." estilo terminal: revela `text` caractere a
 * caractere e mantém um cursor piscando ao final.
 */
export default function TerminalText({
  text,
  speedMs = 28,
  style,
}: {
  text: string;
  speedMs?: number;
  style?: React.CSSProperties;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = prefersReducedMotion ? text.length : 1;

    const id = setInterval(() => {
      setCount((current) => {
        const next = current + step;
        if (next >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(id);
  }, [text, speedMs]);

  return (
    <span style={{ fontFamily: "var(--font-mono)", ...style }}>
      {text.slice(0, count)}
      <span className="bio-terminal-cursor" aria-hidden>
        |
      </span>
    </span>
  );
}
