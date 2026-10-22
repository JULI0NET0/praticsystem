"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Check,
  Loader2,
  Download,
  Layers,
  GitBranch,
  PenTool,
  Columns2,
  ListTree,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Diagram } from "@/types/database";
import { useToast } from "@/components/CustomToast";
import { useConfirm } from "@/components/ConfirmProvider";
import FlowchartEditor from "@/components/diagramas/FlowchartEditor";
import MindMapEditor from "@/components/diagramas/MindMapEditor";
import OutlinePanel from "@/components/diagramas/OutlinePanel";
import type { DiagramEditorApi } from "@/components/diagramas/editorApi";

// Excalidraw depende de window/canvas: só carrega no cliente e só quando o tipo é whiteboard
const WhiteboardEditor = dynamic(() => import("@/components/diagramas/WhiteboardEditor"), {
  ssr: false,
});

export default function DiagramEditorPage() {
  const params = useParams();
  const router = useRouter();
  const diagramId = params?.id as string;

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string; nome_fantasia?: string }[]>([]);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  // Canvas, só texto (outline) ou os dois lado a lado — fluxograma e mapa mental
  const [viewMode, setViewMode] = useState<"canvas" | "text" | "split">("canvas");
  // Cópia do estado do canvas para o outline acompanhar (só usada fora do modo canvas)
  const [liveData, setLiveData] = useState<Record<string, unknown> | null>(null);
  const editorApiRef = useRef<DiagramEditorApi>(null);

  // Armazena os dados mais recentes do canvas
  const currentDataRef = useRef<Record<string, unknown> | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Carrega o diagrama e lista de clientes
  useEffect(() => {
    if (!diagramId) return;

    let active = true;

    async function loadData() {
      try {
        const [diagRes, clientsRes] = await Promise.all([
          supabase
            .from("diagrams")
            .select("*, client:clients(id, name, nome_fantasia)")
            .eq("id", diagramId)
            .single(),
          supabase
            .from("clients")
            .select("id, name, nome_fantasia")
            .order("name", { ascending: true })
        ]);

        if (!active) return;
        if (diagRes.error) throw diagRes.error;
        if (!diagRes.data) throw new Error("Diagrama não encontrado");

        setDiagram(diagRes.data);
        setTitle(diagRes.data.title);
        setClientId(diagRes.data.client_id || "");
        currentDataRef.current = diagRes.data.data;

        if (!clientsRes.error && clientsRes.data) {
          setClients(clientsRes.data);
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error("Erro ao carregar diagrama:", err);
        showToast("Diagrama não encontrado ou sem permissão", "error");
        router.push("/admin/diagramas");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [diagramId, router, showToast]);

  // Função de salvamento (manual ou automática)
  const saveDiagram = useCallback(
    async (overrideData?: Record<string, unknown>) => {
      if (!diagramId) return;

      const dataToSave = overrideData || currentDataRef.current || {};
      setSaving(true);

      try {
        const { error } = await supabase
          .from("diagrams")
          .update({
            title: title.trim() || "Sem título",
            client_id: clientId || null,
            data: dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("id", diagramId);

        if (error) throw error;

        setHasUnsavedChanges(false);
      } catch (err: unknown) {
        console.error("Erro ao salvar diagrama:", err);
        showToast("Erro ao salvar alterações", "error");
      } finally {
        setSaving(false);
      }
    },
    [diagramId, title, clientId, showToast]
  );

  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const changeViewMode = (mode: "canvas" | "text" | "split") => {
    if (mode !== "canvas") setLiveData(currentDataRef.current);
    setViewMode(mode);
  };

  // Dispara alteração do canvas com debounce para autosave
  const handleDataChange = useCallback(
    (newData: Record<string, unknown>) => {
      currentDataRef.current = newData;
      setHasUnsavedChanges(true);
      if (viewModeRef.current !== "canvas") setLiveData(newData);

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDiagram(newData);
      }, 2500);
    },
    [saveDiagram]
  );

  // Espelha o estado mais recente para o flush ao sair da página
  const saveRef = useRef(saveDiagram);
  const dirtyRef = useRef(false);
  useEffect(() => {
    saveRef.current = saveDiagram;
  }, [saveDiagram]);
  useEffect(() => {
    dirtyRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Não perde o que ainda está no debounce: salva ao trocar de aba, fechar ou sair da rota
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      dirtyRef.current = false;
      saveRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  // Alteração de título
  const handleTitleBlur = () => {
    if (diagram && title !== diagram.title) {
      saveDiagram();
    }
  };

  // Alteração de cliente vinculado
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setHasUnsavedChanges(true);
    setTimeout(() => {
      saveDiagram();
    }, 100);
  };

  // Exporta PNG/SVG/JSON. html-to-image serializa o DOM como SVG (foreignObject),
  // o que preserva as arestas do React Flow que o html2canvas perdia.
  const downloadFile = (href: string, ext: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = `${title.toLowerCase().trim().replace(/\s+/g, "_") || "diagrama"}.${ext}`;
    link.click();
  };

  const handleExport = async (format: "png" | "svg" | "json") => {
    setExportOpen(false);

    if (format === "json") {
      const json = JSON.stringify(currentDataRef.current ?? diagram?.data ?? {}, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      downloadFile(url, "json");
      URL.revokeObjectURL(url);
      showToast("JSON exportado com sucesso!", "success");
      return;
    }

    if (!canvasContainerRef.current) return;

    try {
      showToast("Gerando exportação...", "info");
      const { toPng, toSvg } = await import("html-to-image");
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const options = {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: isDark ? "#0f172a" : "#f8fafc",
        // Remove controles de UI do export (minimapa, zoom, painéis)
        filter: (node: HTMLElement) => {
          const cls = typeof node.className === "string" ? node.className : "";
          return !/react-flow__(minimap|controls|panel|attribution)|map-container .*toolbar/.test(cls);
        },
      };
      const dataUrl =
        format === "png"
          ? await toPng(canvasContainerRef.current, options)
          : await toSvg(canvasContainerRef.current, options);
      downloadFile(dataUrl, format);
      showToast(`${format.toUpperCase()} exportado com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao exportar diagrama:", err);
      showToast("Erro ao exportar imagem", "error");
    }
  };

  // Excluir diagrama atual
  const handleDeleteCurrent = async () => {
    const confirmed = await confirm({
      title: "Excluir Diagrama",
      message: `Tem certeza que deseja excluir "${title}"? Esta ação é irreversível.`,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from("diagrams").delete().eq("id", diagramId);
      if (error) throw error;
      showToast("Diagrama excluído com sucesso", "success");
      router.push("/admin/diagramas");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      showToast("Erro ao excluir diagrama", "error");
    }
  };

  if (loading || !diagram) {
    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary, #64748b)",
        }}
      >
        <Loader2 size={36} className="animate-spin" />
        <p style={{ marginTop: "14px", fontSize: "14px" }}>Carregando editor de diagrama...</p>
      </div>
    );
  }

  const isFlow = diagram.type === "flowchart";
  const hasOutline = diagram.type === "flowchart" || diagram.type === "mindmap";
  const mode = hasOutline ? viewMode : "canvas";
  const typeBadge =
    diagram.type === "flowchart"
      ? { label: "Fluxograma", icon: <Layers size={12} />, bg: "rgba(224, 93, 56, 0.1)", color: "var(--color-terracotta-ink, #c2410c)" }
      : diagram.type === "mindmap"
      ? { label: "Mapa Mental", icon: <GitBranch size={12} />, bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb" }
      : { label: "Quadro Livre", icon: <PenTool size={12} />, bg: "rgba(16, 185, 129, 0.1)", color: "#047857" };

  return (
    // id usado em legacy.css para esconder o shell do admin (tela cheia)
    <div
      id="diagram-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--color-surface-canvas, #f8fafc)",
      }}
    >
      {/* Top Bar / Header do Editor */}
      <div
        style={{
          height: "56px",
          backgroundColor: "var(--color-surface-raised, #ffffff)",
          borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          gap: "12px",
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Esquerda: Voltar + Título Inline + Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <Link
            href="/admin/diagramas"
            title="Voltar para Diagramas"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              backgroundColor: "var(--color-surface-sunken, #f8fafc)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary, #64748b)",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          {/* Badge do Tipo */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              backgroundColor: typeBadge.bg,
              color: typeBadge.color,
              flexShrink: 0,
            }}
          >
            {typeBadge.icon}
            {typeBadge.label}
          </span>

          {/* Input de Título */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            onBlur={handleTitleBlur}
            placeholder="Título do diagrama"
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text-primary, #0f172a)",
              backgroundColor: "transparent",
              border: "1px solid transparent",
              borderRadius: "6px",
              padding: "4px 8px",
              outline: "none",
              minWidth: "160px",
              maxWidth: "340px",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-border-subtle, #e2e8f0)")}
          />
        </div>

        {/* Direita: Visão, Cliente, Status, Salvar, Exportar, Excluir */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {hasOutline && (
            <div
              style={{
                display: "flex",
                padding: "3px",
                borderRadius: "8px",
                backgroundColor: "var(--color-surface-sunken, #f1f5f9)",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
              }}
            >
              {([
                ["canvas", "Canvas", <Layers key="c" size={13} />],
                ["split", "Lado a lado", <Columns2 key="s" size={13} />],
                ["text", "Texto", <ListTree key="t" size={13} />],
              ] as const).map(([mode, label, icon]) => (
                <button
                  key={mode}
                  onClick={() => changeViewMode(mode)}
                  title={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    backgroundColor: viewMode === mode ? "var(--color-surface-raised, #ffffff)" : "transparent",
                    color: viewMode === mode ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
                    boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Seletor de Cliente */}
          <select
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              backgroundColor: "var(--color-surface-sunken, #f8fafc)",
              fontSize: "12px",
              color: "var(--color-text-primary, #0f172a)",
              outline: "none",
              cursor: "pointer",
              maxWidth: "180px",
            }}
          >
            <option value="">Sem Cliente Vinculado</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_fantasia || c.name}
              </option>
            ))}
          </select>

          {/* Indicador de Salvamento */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: saving
                ? "var(--color-terracotta, #e05d38)"
                : hasUnsavedChanges
                ? "var(--color-text-secondary, #64748b)"
                : "#10b981",
              padding: "0 6px",
            }}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                  }}
                />
                <span>Alterações pendentes</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Salvo</span>
              </>
            )}
          </div>

          {/* Botão Salvar Agora */}
          <button
            onClick={() => saveDiagram()}
            disabled={saving || !hasUnsavedChanges}
            title="Salvar alterações (Cmd+S)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: hasUnsavedChanges ? "var(--color-terracotta, #e05d38)" : "var(--color-surface-sunken, #f1f5f9)",
              color: hasUnsavedChanges ? "#ffffff" : "var(--color-text-tertiary, #94a3b8)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: hasUnsavedChanges ? "pointer" : "default",
              transition: "all 0.15s ease",
            }}
          >
            <Save size={14} />
            Salvar
          </button>

          {/* Menu Exportar */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              title="Exportar diagrama"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: "var(--color-surface-raised, #ffffff)",
                color: "var(--color-text-primary, #0f172a)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download size={14} />
              Exportar
            </button>
            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: "140px",
                  backgroundColor: "var(--color-surface-raised, #ffffff)",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  borderRadius: "8px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                  zIndex: 30,
                }}
              >
                {(["png", "svg", "json"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleExport(f)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: "none",
                      background: "transparent",
                      color: "var(--color-text-primary, #0f172a)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {f === "json" ? "Dados (JSON)" : `Imagem ${f.toUpperCase()}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Excluir */}
          <button
            onClick={handleDeleteCurrent}
            title="Excluir Diagrama"
            style={{
              padding: "7px 9px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "var(--color-text-tertiary, #94a3b8)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary, #94a3b8)")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {mode !== "canvas" && (
          <div style={{ width: mode === "text" ? "100%" : "min(42%, 520px)", flexShrink: 0, minHeight: 0 }}>
            <OutlinePanel
              kind={isFlow ? "flowchart" : "mindmap"}
              data={liveData}
              onApply={(data) => editorApiRef.current?.applyData(data)}
            />
          </div>
        )}

        {/* Canvas: continua montado no modo Texto (escondido) para não perder estado */}
        <div
          ref={canvasContainerRef}
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            overflow: "hidden",
            display: mode === "text" ? "none" : "block",
          }}
        >
          {isFlow ? (
            <FlowchartEditor
              initialData={diagram.data}
              onChange={handleDataChange}
              apiRef={editorApiRef}
            />
          ) : diagram.type === "mindmap" ? (
            <MindMapEditor
              initialData={diagram.data}
              onChange={handleDataChange}
              apiRef={editorApiRef}
            />
          ) : (
            <WhiteboardEditor
              initialData={diagram.data}
              onChange={handleDataChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
