"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Contexto sem acesso à área de transferência: o texto continua selecionável na tela.
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <>
      <button type="button" onClick={handleCopy} className="mat-btn mat-btn-primary">
        {state === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {state === "copied" ? "Copiado!" : "Copiar texto"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Texto copiado" : state === "failed" ? "Não foi possível copiar. Selecione o texto e copie manualmente." : ""}
      </span>
      {state === "failed" && (
        <span style={{ marginLeft: 12, fontSize: 13, color: "var(--mat-text-2)" }}>
          Não deu para copiar sozinho. Selecione o texto acima.
        </span>
      )}
    </>
  );
}
