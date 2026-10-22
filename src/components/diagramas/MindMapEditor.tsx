"use client";

import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import "mind-elixir/style.css";
import {
  Plus,
  CornerDownRight,
  Maximize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Focus,
  Keyboard,
  Group,
  Trash2,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { DiagramEditorApi } from "./editorApi";

interface MindMapEditorProps {
  initialData?: Record<string, unknown> | null;
  onChange?: (data: Record<string, unknown>) => void;
  apiRef?: React.Ref<DiagramEditorApi>;
}

type MindNodeData = { id: string; children?: MindNodeData[]; expanded?: boolean; [key: string]: unknown };

// Ramos em tons de laranja Pratic (identidade preto + laranja do sistema)
const PRATIC_PALETTE = ["#d97757", "#c96442", "#e08a6e", "#b84627", "#eba48f", "#a54a29"];

// Tema Pratic sobre o tema nativo do mind-elixir (as variáveis "panel" usam "r, g, b")
function praticTheme(isDark: boolean, base: { cssVar: Record<string, string> }) {
  const c = isDark
    ? { text: "#f5f4ef", canvas: "#141413", panel: "245, 244, 239", panelBg: "34, 33, 30", panelBorder: "58, 56, 51" }
    : { text: "#1b1c1a", canvas: "#faf9f5", panel: "27, 28, 26", panelBg: "255, 255, 255", panelBorder: "227, 226, 223" };

  return {
    name: isDark ? "pratic-dark" : "pratic",
    type: isDark ? "dark" : "light",
    palette: PRATIC_PALETTE,
    cssVar: {
      ...base.cssVar,
      // Tema central: preto com borda laranja; tópicos principais: pílulas pretas com contorno laranja
      "--main-color": "#faf9f5",
      "--main-bgcolor": "#1b1c1a",
      "--main-border": "1.5px solid #d97757",
      "--main-bgcolor-transparent": "rgba(27, 28, 26, 0.9)",
      "--color": c.text,
      "--bgcolor": c.canvas,
      "--selected": "#d97757",
      "--accent-color": "#d97757",
      "--root-color": "#faf9f5",
      "--root-bgcolor": isDark ? "#0b0b0a" : "#1b1c1a",
      "--root-border-color": "#d97757",
      "--root-radius": "14px",
      "--main-radius": "10px",
      "--topic-padding": "6px 12px",
      "--panel-color": c.panel,
      "--panel-bgcolor": c.panelBg,
      "--panel-border-color": c.panelBorder,
    },
  };
}

// Menu de contexto (botão direito) em português
const LOCALE_PT_BR = {
  addChild: "Adicionar filho",
  addParent: "Adicionar tópico pai",
  addSibling: "Adicionar irmão",
  removeNode: "Excluir tópico",
  focus: "Focar neste tópico",
  cancelFocus: "Sair do foco",
  moveUp: "Mover para cima",
  moveDown: "Mover para baixo",
  link: "Ligar com seta",
  linkBidirectional: "Ligar com seta dupla",
  clickTips: "Clique no tópico de destino",
  summary: "Agrupar (resumo)",
};

// Recolhe tudo abaixo de `level` (raiz = nível 0); Infinity expande tudo
function setExpandLevel(node: MindNodeData, level: number, depth = 0) {
  if (node.children?.length) {
    node.expanded = depth < level;
    node.children.forEach((c) => setExpandLevel(c, level, depth + 1));
  }
}

// Mostra no botão de abrir/fechar de cada tópico quantos filhos ele tem:
// recolhido → "+5" (preenchido), aberto → "5". Só escreve no DOM quando muda,
// para o MutationObserver que chama esta função não entrar em loop.
function decorateExpanders(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("me-epd").forEach((epd) => {
    const tpc = epd.previousElementSibling as (HTMLElement & { nodeObj?: { children?: unknown[]; expanded?: boolean } }) | null;
    const node = tpc?.nodeObj;
    if (!node) return;
    const count = node.children?.length ?? 0;
    const collapsed = node.expanded === false;
    const label = collapsed ? `+${count}` : String(count);
    const title = collapsed
      ? `${count} ${count === 1 ? "tópico guardado" : "tópicos guardados"}: clique para abrir`
      : `${count} ${count === 1 ? "tópico aberto" : "tópicos abertos"}: clique para recolher`;
    if (epd.textContent !== label) epd.textContent = label;
    if (epd.dataset.collapsed !== String(collapsed)) epd.dataset.collapsed = String(collapsed);
    if (epd.title !== title) epd.title = title;
  });
}

const EXPANDER_CSS = `
.pratic-mindmap me-epd {
  background-image: none !important;
  width: auto !important;
  min-width: 20px;
  height: 18px !important;
  padding: 0 5px;
  border-radius: 9px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  font: 700 10px/1 var(--font-sans, Inter, sans-serif);
  border: 1.5px solid var(--color-terracotta, #d97757);
  background-color: var(--color-surface-raised, #ffffff);
  color: var(--color-terracotta-ink, #a54a29);
  opacity: 1 !important;
  cursor: pointer;
  box-sizing: border-box;
}
.pratic-mindmap me-epd[data-collapsed="true"] {
  background-color: var(--color-terracotta, #d97757);
  color: #1b1c1a;
}
.pratic-mindmap me-epd:hover { transform: scale(1.1); }
`;

const iconBtn: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  border: "none",
  background: "transparent",
  color: "var(--color-text-secondary, #64748b)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 600,
};

const divider = <div style={{ width: "1px", height: "18px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 4px" }} />;

export default function MindMapEditor({ initialData, onChange, apiRef }: MindMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meClassRef = useRef<any>(null);
  const initialDataRef = useRef(initialData);
  const onChangeRef = useRef(onChange);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isDarkRef = useRef(isDark);

  const emitChange = () => {
    const me = meInstanceRef.current;
    if (!me) return;
    try {
      onChangeRef.current?.(me.getData() as Record<string, unknown>);
    } catch (err) {
      console.error("Erro ao ler dados do mapa mental:", err);
    }
  };
  const emitChangeRef = useRef(emitChange);
  useEffect(() => {
    emitChangeRef.current = emitChange;
  });

  // Monta o mapa uma única vez; tema e dados externos são aplicados na instância viva
  useEffect(() => {
    let isMounted = true;
    let observer: MutationObserver | null = null;

    async function initMindMap() {
      if (!containerRef.current) return;

      try {
        const MindElixirModule = await import("mind-elixir");
        const MindElixir = MindElixirModule.default || MindElixirModule;
        meClassRef.current = MindElixir;

        if (!isMounted || !containerRef.current) return;

        const base = isDarkRef.current ? MindElixir.DARK_THEME : MindElixir.THEME;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const me = new (MindElixir as any)({
          el: containerRef.current,
          direction: MindElixir.SIDE,
          contextMenu: { focus: true, link: true, locale: LOCALE_PT_BR },
          toolBar: false,
          keypress: true,
          allowUndo: true,
          theme: praticTheme(isDarkRef.current, base),
        });
        meInstanceRef.current = me;

        const dataToLoad =
          initialDataRef.current && initialDataRef.current.nodeData
            ? initialDataRef.current
            : MindElixir.new("Planejamento Geral");

        await me.init(dataToLoad);

        // Contador de filhos nos botões de abrir/fechar, refeito a cada re-render do mapa
        decorateExpanders(containerRef.current);
        observer = new MutationObserver(() => containerRef.current && decorateExpanders(containerRef.current));
        observer.observe(containerRef.current, { childList: true, subtree: true });

        // Qualquer edição (inclusive arrastar tópico, resumo, seta) e expandir/recolher salvam
        me.bus.addListener("operation", () => isMounted && emitChangeRef.current());
        me.bus.addListener("expandNode", () => isMounted && emitChangeRef.current());
      } catch (err) {
        console.error("Erro ao inicializar MindElixir:", err);
      }
    }

    initMindMap();

    return () => {
      isMounted = false;
      observer?.disconnect();
      if (meInstanceRef.current) {
        try {
          meInstanceRef.current.destroy();
        } catch {
          // ignore
        }
        meInstanceRef.current = null;
      }
    };
  }, []);

  // Troca de tema sem recriar o mapa (antes recriava com os dados da montagem e perdia edições)
  useEffect(() => {
    isDarkRef.current = isDark;
    const me = meInstanceRef.current;
    const MindElixir = meClassRef.current;
    if (!me || !MindElixir) return;
    try {
      me.changeTheme(praticTheme(isDark, isDark ? MindElixir.DARK_THEME : MindElixir.THEME));
    } catch (e) {
      console.warn(e);
    }
  }, [isDark]);

  // Texto do outline aplicado de fora
  useImperativeHandle(
    apiRef,
    () => ({
      applyData: (data) => {
        const me = meInstanceRef.current;
        if (!me || !data.nodeData) return;
        try {
          me.refresh(data);
          emitChangeRef.current();
        } catch (e) {
          console.warn(e);
        }
      },
    }),
    []
  );

  const run = (fn: (me: any) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const me = meInstanceRef.current;
    if (!me) return;
    try {
      fn(me);
    } catch (e) {
      console.warn(e);
    }
  };

  const flashHint = (text: string) => {
    setHint(text);
    setTimeout(() => setHint(null), 2500);
  };

  const handleGroup = () =>
    run((me) => {
      if (!me.currentNodes?.length) {
        flashHint("Selecione um ou mais tópicos irmãos (Shift/Cmd + clique) para agrupar");
        return;
      }
      me.createSummary({ style: { stroke: "#d97757", labelColor: "#d97757" } });
    });

  const handleDelete = () =>
    run((me) => {
      if (!me.currentNodes?.length) {
        flashHint("Selecione um tópico para excluir");
        return;
      }
      me.removeNodes(me.currentNodes);
    });

  // Atalho "." abre/fecha o tópico selecionado (Alt+. abre/fecha todos abaixo dele)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "." && e.code !== "Period") return;
      const target = e.target as HTMLElement | null;
      if (!containerRef.current?.contains(target) && target !== document.body) return;
      if (target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const me = meInstanceRef.current;
      const el = me?.currentNodes?.[0];
      if (!el?.nodeObj?.children?.length) return;
      e.preventDefault();
      if (e.altKey) me.expandNodeAll(el, el.nodeObj.expanded === false);
      else me.expandNode(el);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLevel = (level: number) =>
    run((me) => {
      const data = me.getData();
      setExpandLevel(data.nodeData, level);
      me.refresh(data);
      emitChangeRef.current();
    });

  return (
    <div
      className="pratic-mindmap"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "var(--color-surface-canvas, #faf9f5)",
        overflow: "hidden",
      }}
    >
      <style>{EXPANDER_CSS}</style>
      {/* Container onde o MindElixir monta a árvore */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          fontFamily: "var(--font-sans, Inter, sans-serif)",
        }}
      />

      {/* Barra de Ferramentas Superior Esquerda */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          right: "16px",
          width: "fit-content",
          maxWidth: "calc(100% - 32px)",
          flexWrap: "wrap",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 10px",
          borderRadius: "12px",
          backgroundColor: "var(--color-surface-raised, #ffffff)",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => run((me) => me.addChild())}
          title="Adicionar subtópico / filho (Tab)"
          style={{ ...iconBtn, padding: "6px 10px", borderRadius: "8px", background: "var(--color-terracotta-100, #fbeee9)", color: "var(--color-terracotta-ink, #c2410c)" }}
        >
          <CornerDownRight size={13} />
          Filho
        </button>

        <button
          onClick={() => run((me) => me.insertSibling("after"))}
          title="Adicionar irmão (Enter)"
          style={{ ...iconBtn, padding: "6px 10px", borderRadius: "8px", background: "var(--color-surface-sunken, #f1f5f9)", color: "var(--color-text-primary, #0f172a)" }}
        >
          <Plus size={13} />
          Irmão
        </button>

        <button onClick={handleGroup} title="Agrupar os tópicos selecionados com um resumo" style={iconBtn}>
          <Group size={14} />
          Agrupar
        </button>

        <button onClick={handleDelete} title="Excluir tópico selecionado (Del)" style={iconBtn}>
          <Trash2 size={14} />
        </button>

        {divider}

        <button onClick={() => handleLevel(1)} title="Recolher tudo (mostra só os tópicos principais)" style={iconBtn}>
          <ChevronsDownUp size={14} />
          Recolher
        </button>
        <button onClick={() => handleLevel(2)} title="Mostrar até o 2º nível" style={iconBtn}>
          2 níveis
        </button>
        <button onClick={() => handleLevel(Infinity)} title="Expandir tudo" style={iconBtn}>
          <ChevronsUpDown size={14} />
          Expandir
        </button>

        {divider}

        <button onClick={() => run((me) => me.undo())} title="Desfazer (Cmd+Z)" style={iconBtn}>
          <RotateCcw size={14} />
        </button>
        <button onClick={() => run((me) => me.redo())} title="Refazer (Cmd+Shift+Z)" style={iconBtn}>
          <RotateCw size={14} />
        </button>

        {divider}

        <button onClick={() => run((me) => me.toCenter())} title="Centralizar no tema central" style={iconBtn}>
          <Focus size={14} />
        </button>
        <button onClick={() => run((me) => me.scaleFit())} title="Ajustar à tela" style={iconBtn}>
          <Maximize2 size={14} />
        </button>
        <button onClick={() => run((me) => me.scale(Math.min((me.scaleVal || 1) + 0.2, 2.5)))} title="Zoom +" style={iconBtn}>
          <ZoomIn size={14} />
        </button>
        <button onClick={() => run((me) => me.scale(Math.max((me.scaleVal || 1) - 0.2, 0.4)))} title="Zoom -" style={iconBtn}>
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Aviso rápido (ex.: nada selecionado) */}
      {hint && (
        <div
          style={{
            position: "absolute",
            top: "72px",
            left: "16px",
            padding: "6px 12px",
            borderRadius: "8px",
            backgroundColor: "var(--color-surface-inverse, #1b1c1a)",
            color: "var(--color-surface-canvas, #faf9f5)",
            fontSize: "12px",
            zIndex: 11,
          }}
        >
          {hint}
        </div>
      )}

      {/* Dica de atalhos no rodapé */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
          backgroundColor: "var(--color-surface-raised, #ffffff)",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          fontSize: "11px",
          color: "var(--color-text-secondary, #64748b)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <Keyboard size={13} />
        <span>
          <b>Arraste</b> um tópico sobre outro para mudar de lugar &bull; <b>Tab</b> filho &bull; <b>Enter</b> irmão &bull; <b>.</b> abre/recolhe &bull; <b>Del</b> exclui &bull; <b>Botão direito</b> agrupa e liga com seta
        </span>
      </div>
    </div>
  );
}
