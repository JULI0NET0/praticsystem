"use client";

import React, { useEffect, useRef } from "react";
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
  Keyboard
} from "lucide-react";
import { useTheme } from "next-themes";

interface MindMapEditorProps {
  initialData?: Record<string, unknown> | null;
  onChange?: (data: Record<string, unknown>) => void;
}

export default function MindMapEditor({ initialData, onChange }: MindMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meInstanceRef = useRef<any>(null);
  const initialDataRef = useRef(initialData);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let isMounted = true;

    async function initMindMap() {
      if (!containerRef.current) return;

      try {
        const MindElixirModule = await import("mind-elixir");
        const MindElixir = MindElixirModule.default || MindElixirModule;

        if (!isMounted || !containerRef.current) return;

        // Limpa instâncias anteriores se houver
        if (meInstanceRef.current) {
          try {
            meInstanceRef.current.destroy();
          } catch {
            // ignore
          }
        }

        const options: Record<string, unknown> = {
          el: containerRef.current,
          direction: MindElixir.SIDE,
          draggable: true,
          contextMenu: true,
          toolBar: false,
          nodeMenu: true,
          keypress: true,
          allowUndo: true,
          theme: isDark ? MindElixir.DARK_THEME : MindElixir.THEME,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const me = new (MindElixir as any)(options);
        meInstanceRef.current = me;

        const dataToLoad =
          initialDataRef.current && initialDataRef.current.nodeData
            ? initialDataRef.current
            : MindElixir.new("Planejamento Geral");

        await me.init(dataToLoad);

        // Ouve operações para notificar o salvamento
        me.bus.addListener("operation", () => {
          if (!isMounted) return;
          try {
            const currentData = me.getData();
            onChangeRef.current?.(currentData as Record<string, unknown>);
          } catch (err) {
            console.error("Erro ao ler dados do mapa mental:", err);
          }
        });
      } catch (err) {
        console.error("Erro ao inicializar MindElixir:", err);
      }
    }

    initMindMap();

    return () => {
      isMounted = false;
      if (meInstanceRef.current) {
        try {
          meInstanceRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [isDark]); // Re-inicia quando alternar dark/light para atualizar o tema nativo

  // Ações da barra de ferramentas
  const handleAddChild = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.addChild();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAddSibling = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.insertSibling("after");
    } catch (e) {
      console.warn(e);
    }
  };

  const handleToCenter = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.toCenter();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleFit = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.scaleFit();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleZoomIn = () => {
    if (!meInstanceRef.current) return;
    try {
      const currentScale = meInstanceRef.current.scaleVal || 1;
      meInstanceRef.current.scale(Math.min(currentScale + 0.2, 2.5));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleZoomOut = () => {
    if (!meInstanceRef.current) return;
    try {
      const currentScale = meInstanceRef.current.scaleVal || 1;
      meInstanceRef.current.scale(Math.max(currentScale - 0.2, 0.4));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleUndo = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.undo();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRedo = () => {
    if (!meInstanceRef.current) return;
    try {
      meInstanceRef.current.redo();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: isDark ? "#090d16" : "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Container onde o MindElixir monta a árvore */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />

      {/* Barra de Ferramentas Superior Esquerda */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "12px",
          backgroundColor: "var(--color-surface-raised, #ffffff)",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <button
          onClick={handleAddChild}
          title="Adicionar Subtópico / Filho (Tab)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: "none",
            background: "var(--color-terracotta-100, #fbeee9)",
            color: "var(--color-terracotta-ink, #c2410c)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <CornerDownRight size={13} />
          Filho (Tab)
        </button>

        <button
          onClick={handleAddSibling}
          title="Adicionar Irmão (Enter)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: "none",
            background: "var(--color-surface-sunken, #f1f5f9)",
            color: "var(--color-text-primary, #0f172a)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Plus size={13} />
          Irmão (Enter)
        </button>

        <div style={{ width: "1px", height: "18px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 4px" }} />

        <button
          onClick={handleUndo}
          title="Desfazer (Cmd+Z)"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={handleRedo}
          title="Refazer (Cmd+Shift+Z)"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <RotateCw size={14} />
        </button>

        <div style={{ width: "1px", height: "18px", background: "var(--color-border-subtle, #e2e8f0)", margin: "0 4px" }} />

        <button
          onClick={handleToCenter}
          title="Centralizar no Nó Principal"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <Focus size={14} />
        </button>

        <button
          onClick={handleFit}
          title="Ajustar à Tela"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <Maximize2 size={14} />
        </button>

        <button
          onClick={handleZoomIn}
          title="Zoom +"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <ZoomIn size={14} />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom -"
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            color: "var(--color-text-secondary, #64748b)",
            cursor: "pointer",
          }}
        >
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Dica de Atalhos Flutuante no Rodapé Direito */}
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
        <span><b>Tab</b> cria filho &bull; <b>Enter</b> cria irmão &bull; <b>Del</b> exclui tópico</span>
      </div>
    </div>
  );
}
