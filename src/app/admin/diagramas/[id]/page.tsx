"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Check,
  Loader2,
  Download,
  Layers,
  GitBranch,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Diagram } from "@/types/database";
import { useToast } from "@/components/CustomToast";
import { useConfirm } from "@/components/ConfirmProvider";
import FlowchartEditor from "@/components/diagramas/FlowchartEditor";
import MindMapEditor from "@/components/diagramas/MindMapEditor";

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

  // Dispara alteração do canvas com debounce para autosave
  const handleDataChange = useCallback(
    (newData: Record<string, unknown>) => {
      currentDataRef.current = newData;
      setHasUnsavedChanges(true);

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDiagram(newData);
      }, 2500);
    },
    [saveDiagram]
  );

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

  // Exportar imagem PNG usando html2canvas
  const handleExportPNG = async () => {
    if (!canvasContainerRef.current) return;

    try {
      showToast("Gerando exportação...", "info");
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const canvas = await html2canvas(canvasContainerRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${title.toLowerCase().replace(/\s+/g, "_") || "diagrama"}.png`;
      link.click();
      showToast("Imagem exportada com sucesso!", "success");
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
          height: "calc(100vh - var(--header-height, 64px))",
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - var(--header-height, 64px))",
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
              backgroundColor: isFlow ? "rgba(224, 93, 56, 0.1)" : "rgba(59, 130, 246, 0.1)",
              color: isFlow ? "var(--color-terracotta-ink, #c2410c)" : "#2563eb",
              flexShrink: 0,
            }}
          >
            {isFlow ? <Layers size={12} /> : <GitBranch size={12} />}
            {isFlow ? "Fluxograma" : "Mapa Mental"}
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

        {/* Direita: Cliente, Status, Salvar, Exportar, Excluir */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
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

          {/* Botão Exportar Imagem */}
          <button
            onClick={handleExportPNG}
            title="Exportar Imagem PNG"
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
            Exportar PNG
          </button>

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

      {/* Canvas Container com 100% de preenchimento */}
      <div
        ref={canvasContainerRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isFlow ? (
          <FlowchartEditor
            initialData={diagram.data}
            onChange={handleDataChange}
          />
        ) : (
          <MindMapEditor
            initialData={diagram.data}
            onChange={handleDataChange}
          />
        )}
      </div>
    </div>
  );
}
