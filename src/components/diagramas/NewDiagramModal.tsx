"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, GitBranch, Layers, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DiagramType } from "@/types/database";

interface NewDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    title: string;
    type: DiagramType;
    clientId?: string | null;
    template?: string;
  }) => Promise<void>;
}

export default function NewDiagramModal({ isOpen, onClose, onSubmit }: NewDiagramModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DiagramType>("flowchart");
  const [clientId, setClientId] = useState<string>("");
  const [template, setTemplate] = useState<string>("blank");
  const [clients, setClients] = useState<{ id: string; name: string; nome_fantasia?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchClients() {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name, nome_fantasia")
          .order("name", { ascending: true });
        if (!error && data) {
          setClients(data);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      }
    }

    fetchClients();
  }, [isOpen]);

  const handleClose = () => {
    setTitle("");
    setClientId("");
    setTemplate("blank");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        type,
        clientId: clientId || null,
        template,
      });
      onClose();
    } catch (err) {
      console.error("Erro ao criar diagrama:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            width: "100%",
            maxWidth: "540px",
            backgroundColor: "var(--color-surface-raised, #ffffff)",
            borderRadius: "16px",
            border: "1px solid var(--color-border-subtle, #e2e8f0)",
            boxShadow: "var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "var(--color-terracotta-100, #fbeee9)",
                  color: "var(--color-terracotta-ink, #c2410c)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Network size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Novo Diagrama</h2>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary, #64748b)", margin: 0 }}>
                  Crie um mapa mental ou fluxograma interativo
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-tertiary, #94a3b8)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Escolha do Tipo */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
                Tipo de Diagrama
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setType("flowchart")}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: type === "flowchart" ? "2px solid var(--color-terracotta, #e05d38)" : "1px solid var(--color-border-subtle, #e2e8f0)",
                    backgroundColor: type === "flowchart" ? "var(--color-terracotta-100, #fbeee9)" : "var(--color-surface-sunken, #f8fafc)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      marginTop: "2px",
                      color: type === "flowchart" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-secondary, #64748b)",
                    }}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: type === "flowchart" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-primary, #0f172a)",
                      }}
                    >
                      Fluxograma
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary, #64748b)", marginTop: "2px" }}>
                      Processos, funis, automações e etapas conectadas.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType("mindmap")}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: type === "mindmap" ? "2px solid var(--color-terracotta, #e05d38)" : "1px solid var(--color-border-subtle, #e2e8f0)",
                    backgroundColor: type === "mindmap" ? "var(--color-terracotta-100, #fbeee9)" : "var(--color-surface-sunken, #f8fafc)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      marginTop: "2px",
                      color: type === "mindmap" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-secondary, #64748b)",
                    }}
                  >
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: type === "mindmap" ? "var(--color-terracotta-ink, #c2410c)" : "var(--color-text-primary, #0f172a)",
                      }}
                    >
                      Mapa Mental
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-secondary, #64748b)", marginTop: "2px" }}>
                      Brainstorm, planejamento de conteúdo e estrutura de tópicos.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Título do Diagrama *
              </label>
              <input
                type="text"
                placeholder={type === "flowchart" ? "Ex: Funil de Conversão - Lançamento Q3" : "Ex: Planejamento Editorial de Março"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  backgroundColor: "var(--color-surface-canvas, #ffffff)",
                  fontSize: "13px",
                  color: "var(--color-text-primary, #0f172a)",
                  outline: "none",
                }}
              />
            </div>

            {/* Cliente Associado (Opcional) */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Vincular a um Cliente (Opcional)
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border-subtle, #e2e8f0)",
                    backgroundColor: "var(--color-surface-canvas, #ffffff)",
                    fontSize: "13px",
                    color: "var(--color-text-primary, #0f172a)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Nenhum cliente (Geral / Interno da Agência)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia || c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Inicial */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                Modelo Inicial
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  backgroundColor: "var(--color-surface-canvas, #ffffff)",
                  fontSize: "13px",
                  color: "var(--color-text-primary, #0f172a)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="blank">Em branco</option>
                {type === "flowchart" ? (
                  <>
                    <option value="funnel">Funil de Vendas (Inbound & WhatsApp)</option>
                    <option value="onboarding">Onboarding de Novo Cliente</option>
                    <option value="approval">Fluxo de Aprovação de Conteúdo</option>
                  </>
                ) : (
                  <>
                    <option value="content_strategy">Planejamento Estratégico de Conteúdo</option>
                    <option value="brand_identity">Estrutura de Identidade de Marca</option>
                  </>
                )}
              </select>
            </div>

            {/* Botões de Ação */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  backgroundColor: "transparent",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary, #64748b)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading || !title.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "var(--color-terracotta, #e05d38)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: loading || !title.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !title.trim() ? 0.6 : 1,
                  boxShadow: "0 2px 8px rgba(224, 93, 56, 0.3)",
                }}
              >
                {loading ? "Criando..." : "Criar Diagrama"}
                {!loading && <ArrowRight size={14} />}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
