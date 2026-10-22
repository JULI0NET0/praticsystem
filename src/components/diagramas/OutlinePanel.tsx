"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Node, Edge } from "@xyflow/react";
import { Copy, Check, ListTree } from "lucide-react";
import { flowchartToOutline, outlineToFlowchart, mindmapToOutline, outlineToMindmap, MindNode } from "@/lib/diagramOutline";

interface OutlinePanelProps {
  kind: "flowchart" | "mindmap";
  data: Record<string, unknown> | null;
  onApply: (data: Record<string, unknown>) => void;
}

const APPLY_DELAY = 800;

/**
 * Visão em texto do diagrama: lista indentada editável, sincronizada com o canvas.
 * Enquanto o usuário digita, o texto é um rascunho local (o canvas não sobrescreve);
 * ao parar de digitar, o rascunho é aplicado ao diagrama.
 */
export default function OutlinePanel({ kind, data, onApply }: OutlinePanelProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const generated = useMemo(() => {
    if (!data) return "";
    return kind === "flowchart"
      ? flowchartToOutline((data.nodes as Node[]) || [], (data.edges as Edge[]) || [])
      : mindmapToOutline(data as { nodeData?: MindNode });
  }, [kind, data]);

  const text = draft ?? generated;

  const apply = (value: string) => {
    const current = dataRef.current || {};
    if (kind === "flowchart") {
      onApply(outlineToFlowchart(value, (current.nodes as Node[]) || [], (current.edges as Edge[]) || []) as unknown as Record<string, unknown>);
    } else {
      onApply(outlineToMindmap(value, current));
    }
  };

  const scheduleApply = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => apply(value), APPLY_DELAY);
  };

  const update = (value: string) => {
    setDraft(value);
    scheduleApply(value);
  };

  const handleBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (draft !== null) apply(draft);
    }
    // Sem rascunho, volta a refletir o canvas
    setDraft(null);
  };

  // Tab / Shift+Tab indentam as linhas selecionadas; Enter continua a lista no mesmo nível
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = el;

    if (e.key === "Tab") {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end);
      const lines = block.split("\n");
      const changed = e.shiftKey ? lines.map((l) => l.replace(/^ {1,2}/, "")) : lines.map((l) => "  " + l);
      const next = value.slice(0, lineStart) + changed.join("\n") + value.slice(end);
      const delta = changed[0].length - lines[0].length;
      update(next);
      requestAnimationFrame(() => {
        el.selectionStart = Math.max(lineStart, start + delta);
        el.selectionEnd = end + (next.length - value.length);
      });
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && start === end) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.slice(lineStart, start);
      const m = line.match(/^(\s*)(?:([-*+])\s|(>)\s?)?/);
      const indent = m?.[1] ?? "";
      const bullet = m?.[2] ? `${m[2]} ` : m?.[3] ? "> " : "";
      if (!bullet) return;
      e.preventDefault();
      // Enter numa linha vazia ("- ") encerra a lista nesse nível
      if (line.trim() === bullet.trim()) {
        const next = value.slice(0, lineStart) + value.slice(start);
        update(next);
        requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = lineStart));
        return;
      }
      const insert = `\n${indent}${bullet === "> " ? "- " : bullet}`;
      const next = value.slice(0, start) + insert + value.slice(end);
      update(next);
      requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = start + insert.length));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-surface-raised, #ffffff)",
        borderRight: "1px solid var(--color-border-subtle, #e2e8f0)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "10px 14px",
          borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
          fontSize: "12px",
          color: "var(--color-text-secondary, #64748b)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--color-text-primary, #0f172a)" }}>
          <ListTree size={14} />
          Texto
        </span>
        <button
          onClick={handleCopy}
          title="Copiar texto"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            background: "transparent",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "11px",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => update(e.target.value)}
        onFocus={() => setDraft(text)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder={kind === "flowchart" ? "- [Início] Primeiro passo\n  - [Etapa] Próximo passo" : "- Tema central\n  - Tópico\n    - Subtópico"}
        style={{
          flex: 1,
          width: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          padding: "14px 16px",
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          fontSize: "13px",
          lineHeight: 1.7,
          tabSize: 2,
          backgroundColor: "transparent",
          color: "var(--color-text-primary, #0f172a)",
        }}
      />

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--color-border-subtle, #e2e8f0)",
          fontSize: "11px",
          lineHeight: 1.6,
          color: "var(--color-text-tertiary, #94a3b8)",
        }}
      >
        <b>Tab</b> desce um nível · <b>Shift+Tab</b> sobe
        {kind === "flowchart" && (
          <>
            {" "}· <code>[Tipo]</code> define o bloco · <code>&gt; texto</code> é a descrição · <code>Sim → </code> rotula a seta ·{" "}
            <code>↪ Título</code> liga a um bloco existente
          </>
        )}
      </div>
    </div>
  );
}
