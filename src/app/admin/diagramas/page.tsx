"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Plus,
  Layers,
  GitBranch,
  PenTool,
  Star,
  Copy,
  Trash2,
  User,
  Loader2,
  Database,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Diagram, DiagramType } from "@/types/database";
import { useToast } from "@/components/CustomToast";
import { useConfirm } from "@/components/ConfirmProvider";
import SearchInput from "@/components/ui/SearchInput";
import NewDiagramModal from "@/components/diagramas/NewDiagramModal";
import { getInitialDiagramData } from "@/lib/diagramTemplates";

type FilterTab = "all" | "flowchart" | "mindmap" | "whiteboard" | "favorites";

export default function DiagramasPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; nome_fantasia?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshDiagrams = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Carrega diagramas do Supabase
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [diagRes, clientsRes] = await Promise.all([
          supabase
            .from("diagrams")
            .select("*, client:clients(id, name, nome_fantasia)")
            .order("updated_at", { ascending: false }),
          supabase
            .from("clients")
            .select("id, name, nome_fantasia")
            .order("name", { ascending: true })
        ]);

        if (!active) return;

        if (diagRes.error) {
          const errObj = diagRes.error;
          const errMsg = errObj.message || "";
          if (errObj.code === "PGRST205" || errMsg.includes("diagrams") || errMsg.includes("schema cache")) {
            setNeedsMigration(true);
            setLoading(false);
            return;
          }
          throw diagRes.error;
        }

        setNeedsMigration(false);
        setDiagrams(diagRes.data || []);
        if (!clientsRes.error && clientsRes.data) {
          setClients(clientsRes.data);
        }
      } catch (err: unknown) {
        if (!active) return;
        const errMessage =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
        console.error("Erro ao carregar diagramas:", errMessage);
        showToast("Não foi possível carregar os diagramas", "error");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [refreshTrigger, showToast]);

  // Criação de novo diagrama
  const handleCreateDiagram = async ({
    title,
    type,
    clientId,
    template,
  }: {
    title: string;
    type: DiagramType;
    clientId?: string | null;
    template?: string;
  }) => {
    if (!currentUser) return;

    try {
      const initialData = getInitialDiagramData(type, template, title);

      const { data, error } = await supabase
        .from("diagrams")
        .insert({
          user_id: currentUser.id,
          client_id: clientId || null,
          title,
          type,
          data: initialData,
          is_favorite: false,
        })
        .select()
        .single();

      if (error) throw error;

      showToast("Diagrama criado com sucesso!", "success");
      router.push(`/admin/diagramas/${data.id}`);
    } catch (err: unknown) {
      console.error("Erro ao criar diagrama:", err);
      const errMsg = err instanceof Error ? err.message : "Tente novamente";
      showToast("Erro ao criar diagrama: " + errMsg, "error");
      throw err;
    }
  };

  // Toggle Favorito
  const handleToggleFavorite = async (e: React.MouseEvent, diagram: Diagram) => {
    e.stopPropagation();
    try {
      const newStatus = !diagram.is_favorite;
      setDiagrams((prev) =>
        prev.map((d) => (d.id === diagram.id ? { ...d, is_favorite: newStatus } : d))
      );

      const { error } = await supabase
        .from("diagrams")
        .update({ is_favorite: newStatus })
        .eq("id", diagram.id);

      if (error) throw error;
      showToast(newStatus ? "Adicionado aos favoritos" : "Removido dos favoritos", "info");
    } catch (err: unknown) {
      console.error("Erro ao favoritar diagrama:", err);
      refreshDiagrams();
    }
  };

  // Duplicar Diagrama
  const handleDuplicate = async (e: React.MouseEvent, diagram: Diagram) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from("diagrams")
        .insert({
          user_id: currentUser.id,
          client_id: diagram.client_id,
          title: `${diagram.title} (Cópia)`,
          type: diagram.type,
          data: diagram.data,
          is_favorite: false,
        })
        .select()
        .single();

      if (error) throw error;
      showToast("Diagrama duplicado com sucesso!", "success");
      refreshDiagrams();
    } catch (err: unknown) {
      console.error("Erro ao duplicar diagrama:", err);
      showToast("Erro ao duplicar diagrama", "error");
    }
  };

  // Excluir Diagrama
  const handleDelete = async (e: React.MouseEvent, diagram: Diagram) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Excluir Diagrama",
      message: `Tem certeza que deseja excluir "${diagram.title}"? Esta ação não pode ser desfeita.`,
      confirmText: "Sim, excluir",
      cancelText: "Cancelar",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      setDiagrams((prev) => prev.filter((d) => d.id !== diagram.id));

      const { error } = await supabase.from("diagrams").delete().eq("id", diagram.id);
      if (error) throw error;

      showToast("Diagrama excluído com sucesso", "success");
    } catch (err: unknown) {
      console.error("Erro ao excluir diagrama:", err);
      showToast("Erro ao excluir diagrama", "error");
      refreshDiagrams();
    }
  };

  // Filtros combinados
  const filteredDiagrams = diagrams.filter((d) => {
    // Busca por texto no título
    if (searchTerm.trim() && !d.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro por abas
    if (activeTab === "flowchart" && d.type !== "flowchart") return false;
    if (activeTab === "mindmap" && d.type !== "mindmap") return false;
    if (activeTab === "whiteboard" && d.type !== "whiteboard") return false;
    if (activeTab === "favorites" && !d.is_favorite) return false;

    // Filtro por cliente
    if (selectedClientId !== "all" && d.client_id !== selectedClientId) {
      return false;
    }

    return true;
  });

  const countByType = {
    all: diagrams.length,
    flowchart: diagrams.filter((d) => d.type === "flowchart").length,
    mindmap: diagrams.filter((d) => d.type === "mindmap").length,
    whiteboard: diagrams.filter((d) => d.type === "whiteboard").length,
    favorites: diagrams.filter((d) => d.is_favorite).length,
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "var(--color-terracotta-100, #fbeee9)",
                color: "var(--color-terracotta-ink, #c2410c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Network size={20} />
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--color-text-primary, #0f172a)",
                margin: 0,
              }}
            >
              Diagramas & Fluxos
            </h1>
          </div>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary, #64748b)", margin: 0 }}>
            Planeje funis de vendas, fluxos de automação, processos operacionais e mapas mentais.
          </p>
        </div>

        {/* Botão Novo Diagrama */}
        <button
          onClick={() => setIsNewModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "var(--color-terracotta, #e05d38)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(224, 93, 56, 0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <Plus size={16} />
          Novo Diagrama
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        {/* Abas */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px",
            borderRadius: "12px",
            backgroundColor: "var(--color-surface-sunken, #f1f5f9)",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
          }}
        >
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: activeTab === "all" ? "var(--color-surface-raised, #ffffff)" : "transparent",
              color: activeTab === "all" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              boxShadow: activeTab === "all" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Todos
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "9999px",
                backgroundColor: activeTab === "all" ? "var(--color-terracotta-100, #fbeee9)" : "transparent",
                color: activeTab === "all" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-tertiary, #94a3b8)",
              }}
            >
              {countByType.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("flowchart")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: activeTab === "flowchart" ? "var(--color-surface-raised, #ffffff)" : "transparent",
              color: activeTab === "flowchart" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              boxShadow: activeTab === "flowchart" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Layers size={14} />
            Fluxogramas
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "9999px",
                backgroundColor: activeTab === "flowchart" ? "var(--color-terracotta-100, #fbeee9)" : "transparent",
                color: activeTab === "flowchart" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-tertiary, #94a3b8)",
              }}
            >
              {countByType.flowchart}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("mindmap")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: activeTab === "mindmap" ? "var(--color-surface-raised, #ffffff)" : "transparent",
              color: activeTab === "mindmap" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              boxShadow: activeTab === "mindmap" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <GitBranch size={14} />
            Mapas Mentais
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "9999px",
                backgroundColor: activeTab === "mindmap" ? "var(--color-terracotta-100, #fbeee9)" : "transparent",
                color: activeTab === "mindmap" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-tertiary, #94a3b8)",
              }}
            >
              {countByType.mindmap}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("whiteboard")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: activeTab === "whiteboard" ? "var(--color-surface-raised, #ffffff)" : "transparent",
              color: activeTab === "whiteboard" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              boxShadow: activeTab === "whiteboard" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <PenTool size={14} />
            Quadros Livres
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "9999px",
                backgroundColor: activeTab === "whiteboard" ? "var(--color-terracotta-100, #fbeee9)" : "transparent",
                color: activeTab === "whiteboard" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-tertiary, #94a3b8)",
              }}
            >
              {countByType.whiteboard}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: activeTab === "favorites" ? "var(--color-surface-raised, #ffffff)" : "transparent",
              color: activeTab === "favorites" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              boxShadow: activeTab === "favorites" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Star size={14} fill={activeTab === "favorites" ? "#f59e0b" : "none"} color={activeTab === "favorites" ? "#f59e0b" : "currentColor"} />
            Favoritos
            <span
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "9999px",
                backgroundColor: activeTab === "favorites" ? "var(--color-terracotta-100, #fbeee9)" : "transparent",
                color: activeTab === "favorites" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-tertiary, #94a3b8)",
              }}
            >
              {countByType.favorites}
            </span>
          </button>
        </div>

        {/* Direita: Busca e Filtro de Cliente */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "500px", justifyContent: "flex-end" }}>
          {/* Dropdown de Cliente */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              fontSize: "13px",
              color: "var(--color-text-primary, #0f172a)",
              outline: "none",
              cursor: "pointer",
              maxWidth: "200px",
            }}
          >
            <option value="all">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_fantasia || c.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: "180px" }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar diagramas..."
            />
          </div>
        </div>
      </div>

      {/* Grid de Diagramas */}
      {needsMigration ? (
        <div
          style={{
            backgroundColor: "var(--color-surface-raised, #ffffff)",
            borderRadius: "16px",
            border: "1px solid #f59e0b",
            boxShadow: "0 4px 20px rgba(245, 158, 11, 0.08)",
            padding: "32px 28px",
            maxWidth: "760px",
            margin: "20px auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Database size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 6px 0", color: "var(--color-text-primary, #0f172a)" }}>
                Configuração do Banco de Dados Pendente
              </h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary, #64748b)", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                A tabela <code>public.diagrams</code> ainda não foi criada no banco de dados do Supabase. Para ativar a criação e o salvamento dos diagramas, basta rodar o arquivo <code>migration_diagrams.sql</code> (raiz do projeto) no <b>SQL Editor</b> do seu painel Supabase.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={refreshDiagrams}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border-subtle, #e2e8f0)",
                    backgroundColor: "var(--color-surface-sunken, #f8fafc)",
                    color: "var(--color-text-primary, #0f172a)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} />
                  Já executei, recarregar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            color: "var(--color-text-secondary, #64748b)",
          }}
        >
          <Loader2 size={32} className="animate-spin" />
          <p style={{ marginTop: "12px", fontSize: "14px" }}>Carregando diagramas...</p>
        </div>
      ) : filteredDiagrams.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            textAlign: "center",
            backgroundColor: "var(--color-surface-raised, #ffffff)",
            borderRadius: "16px",
            border: "1px dashed var(--color-border-subtle, #e2e8f0)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "var(--color-terracotta-100, #fbeee9)",
              color: "var(--color-terracotta-ink, #c2410c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <Network size={28} />
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px 0" }}>
            {searchTerm || activeTab !== "all" || selectedClientId !== "all"
              ? "Nenhum diagrama encontrado para os filtros selecionados"
              : "Nenhum diagrama criado ainda"}
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary, #64748b)",
              maxWidth: "400px",
              margin: "0 0 20px 0",
            }}
          >
            Crie seu primeiro fluxograma de vendas ou mapa mental estratégico para estruturar campanhas e processos.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "var(--color-terracotta, #e05d38)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            Criar Primeiro Diagrama
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          <AnimatePresence>
            {filteredDiagrams.map((diagram) => {
              const badge =
                diagram.type === "flowchart"
                  ? { label: "Fluxograma", icon: <Layers size={12} />, bg: "rgba(224, 93, 56, 0.1)", color: "var(--color-terracotta-ink, #c2410c)" }
                  : diagram.type === "mindmap"
                  ? { label: "Mapa Mental", icon: <GitBranch size={12} />, bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb" }
                  : { label: "Quadro Livre", icon: <PenTool size={12} />, bg: "rgba(16, 185, 129, 0.1)", color: "#047857" };

              return (
                <motion.div
                  key={diagram.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => router.push(`/admin/diagramas/${diagram.id}`)}
                  style={{
                    backgroundColor: "var(--color-surface-raised, #ffffff)",
                    borderRadius: "14px",
                    border: "1px solid var(--color-border-subtle, #e2e8f0)",
                    boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
                    padding: "18px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md, 0 4px 14px rgba(0,0,0,0.08))";
                    e.currentTarget.style.borderColor = "var(--color-terracotta, #e05d38)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))";
                    e.currentTarget.style.borderColor = "var(--color-border-subtle, #e2e8f0)";
                  }}
                >
                  {/* Topo do Card */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      {/* Badge do Tipo */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>

                      {/* Botão Favoritar */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, diagram)}
                        title={diagram.is_favorite ? "Remover dos favoritos" : "Favoritar"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          color: diagram.is_favorite ? "#f59e0b" : "var(--color-text-tertiary, #94a3b8)",
                          transition: "transform 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        <Star size={16} fill={diagram.is_favorite ? "#f59e0b" : "none"} />
                      </button>
                    </div>

                    {/* Título */}
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "var(--color-text-primary, #0f172a)",
                        margin: "0 0 6px 0",
                        lineHeight: 1.3,
                      }}
                    >
                      {diagram.title}
                    </h3>

                    {/* Cliente Vinculado se houver */}
                    {diagram.client && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px",
                          color: "var(--color-text-secondary, #64748b)",
                          marginBottom: "12px",
                        }}
                      >
                        <User size={12} />
                        <span>{diagram.client.nome_fantasia || diagram.client.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      marginTop: "12px",
                      borderTop: "1px solid var(--color-border-subtle, #e2e8f0)",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "var(--color-text-tertiary, #94a3b8)" }}>
                      {new Date(diagram.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {/* Ações Rápidas */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        onClick={(e) => handleDuplicate(e, diagram)}
                        title="Duplicar diagrama"
                        style={{
                          padding: "5px",
                          borderRadius: "6px",
                          border: "none",
                          background: "transparent",
                          color: "var(--color-text-tertiary, #94a3b8)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary, #0f172a)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary, #94a3b8)")}
                      >
                        <Copy size={14} />
                      </button>

                      <button
                        onClick={(e) => handleDelete(e, diagram)}
                        title="Excluir diagrama"
                        style={{
                          padding: "5px",
                          borderRadius: "6px",
                          border: "none",
                          background: "transparent",
                          color: "var(--color-text-tertiary, #94a3b8)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary, #94a3b8)")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de Criação */}
      <NewDiagramModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateDiagram}
      />
    </div>
  );
}
