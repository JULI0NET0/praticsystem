"use client";

import { useCallback, useEffect, useState } from "react";

export type ContentWidth = "main" | "full";
const KEY = "pratic:prospeccao:width";

function read(): ContentWidth | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "main" || v === "full" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Largura do conteúdo estilo Notion: "main" (coluna central) ou "full" (toda a área ao lado do menu).
 * A escolha do usuário é lembrada; sem escolha vale `fallback` (por tela).
 */
export function useContentWidth(fallback: ContentWidth): [ContentWidth, () => void] {
  const [stored, setStored] = useState<ContentWidth | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a preferência salva só no cliente (evita descompasso de SSR)
  useEffect(() => { setStored(read()); }, []);

  const width = stored ?? fallback;
  const toggle = useCallback(() => {
    const next: ContentWidth = width === "full" ? "main" : "full";
    setStored(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* sem armazenamento: vale só nesta sessão */ }
  }, [width]);

  return [width, toggle];
}
