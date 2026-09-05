"use client";

import React, { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Play, 
  HelpCircle, 
  X, 
  RotateCcw,
  Layers,
  ArrowRight,
  Code
} from "lucide-react";
import { flowchartToMarkdown, markdownToFlowchart } from "@/lib/diagramMarkdown";

interface MarkdownViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  onApplyMarkdown: (newNodes: Node[], newEdges: Edge[]) => void;
}

export function MarkdownViewModal({
  isOpen,
  onClose,
  nodes,
  edges,
  onApplyMarkdown,
}: MarkdownViewModalProps) {
  const [activeTab, setActiveTab] = useState<"markdown" | "ai" | "guide">("markdown");
  const [markdownText, setMarkdownText] = useState("");
  const [copied, setCopied] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Sincroniza o Markdown inicial sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      const generated = flowchartToMarkdown(nodes, edges);
      setMarkdownText(generated);
      setCopied(false);
      setAppliedSuccess(false);
    }
  }, [isOpen, nodes, edges]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAIPrompt = (promptGoal: string) => {
    const fullPrompt = `${promptGoal}\n\nAbaixo está o fluxo atual no formato Markdown estruturado. Mantenha essa mesma sintaxe (com números, tags [Tipo], títulos e conexões ->) para que eu possa colar diretamente de volta no sistema:\n\n\`\`\`markdown\n${markdownText}\n\`\`\``;
    navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    try {
      const result = markdownToFlowchart(markdownText);
      onApplyMarkdown(result.nodes, result.edges);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error("Erro ao aplicar markdown:", err);
    }
  };

  const handleResetToCurrent = () => {
    setMarkdownText(flowchartToMarkdown(nodes, edges));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          height: "85vh",
          maxHeight: "720px",
          backgroundColor: "var(--color-surface-raised, #ffffff)",
          borderRadius: "18px",
          border: "1px solid var(--color-border-subtle, #e2e8f0)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-surface-sunken, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "10px",
                background: "var(--color-terracotta-100, #fbeee9)",
                color: "var(--color-terracotta, #e05d38)",
                display: "flex",
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-text-primary, #0f172a)" }}>
                Visão de Texto & Markdown
              </h2>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary, #64748b)", margin: 0 }}>
                Edite seu fluxo em texto ou use uma IA para otimizar etapas e gerar o fluxograma
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--color-text-tertiary, #94a3b8)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-border-subtle, #e2e8f0)",
            padding: "0 16px",
            gap: "8px",
            backgroundColor: "var(--color-surface-raised, #ffffff)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("markdown")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "markdown" ? "2px solid var(--color-terracotta, #e05d38)" : "2px solid transparent",
              color: activeTab === "markdown" ? "var(--color-terracotta, #e05d38)" : "var(--color-text-secondary, #64748b)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Code size={15} />
            Texto / Markdown
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "ai" ? "2px solid #8b5cf6" : "2px solid transparent",
              color: activeTab === "ai" ? "#8b5cf6" : "var(--color-text-secondary, #64748b)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <Sparkles size={15} />
            Otimizar com IA
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 14px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === "guide" ? "2px solid var(--color-text-primary, #0f172a)" : "2px solid transparent",
              color: activeTab === "guide" ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <HelpCircle size={15} />
            Guia de Sintaxe
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px 20px" }}>
          {activeTab === "markdown" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary, #64748b)" }}>
                  Altere as etapas abaixo ou cole um fluxo gerado por IA para compilar no canvas:
                </span>
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  title="Recarregar do Fluxograma Atual"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-secondary, #64748b)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} />
                  Restaurar do Canvas
                </button>
              </div>

              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                placeholder="Digite seu fluxo em Markdown..."
                style={{
                  flex: 1,
                  width: "100%",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "12.5px",
                  lineHeight: 1.6,
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border-subtle, #e2e8f0)",
                  backgroundColor: "var(--color-surface-sunken, #f8fafc)",
                  color: "var(--color-text-primary, #0f172a)",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>
          )}

          {activeTab === "ai" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(224, 93, 56, 0.08))",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <Sparkles size={20} color="#8b5cf6" style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary, #0f172a)", marginBottom: "4px" }}>
                    Como usar a IA para montar ou otimizar seu fluxo:
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary, #64748b)", lineHeight: 1.5 }}>
                    Copie um dos prompts prontos abaixo com seu fluxo anexado, envie no <b>ChatGPT</b> ou <b>Claude</b>, e depois cole a resposta na aba <b>Texto / Markdown</b> e clique em <b>Aplicar no Fluxograma</b>!
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-tertiary, #94a3b8)" }}>
                  Templates de Prompts Prontos
                </span>

                {[
                  {
                    title: "Otimização de Funil de Vendas & WhatsApp",
                    desc: "Identifica gargalos, melhora o tempo de resposta e adiciona etapas de recuperação de leads frios.",
                    prompt: "Você é um estrategista sênior de funis de vendas e automações de WhatsApp. Analise o fluxo abaixo, encontre gargalos e reescreva uma versão otimizada com alta taxa de conversão.",
                  },
                  {
                    title: "Fluxo Operacional de Agência (Do Briefing à Entrega)",
                    desc: "Estrutura as etapas de alinhamento, produção de criativos, validação interna e aprovação do cliente.",
                    prompt: "Você é um gestor de operações de agência de marketing. Otimize e organize o fluxo operacional abaixo garantindo clareza nos checkpoints de aprovação e prazos.",
                  },
                  {
                    title: "Triagem & Suporte Automático",
                    desc: "Cria árvore de decisão para direcionar chamados para o setor certo ou resolver com autoatendimento.",
                    prompt: "Você é um especialista em experiência do cliente e suporte. Crie um fluxo de atendimento eficiente com ramificações claras de decisão Sim/Não.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid var(--color-border-subtle, #e2e8f0)",
                      backgroundColor: "var(--color-surface-raised, #ffffff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary, #0f172a)", marginBottom: "3px" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-secondary, #64748b)" }}>
                        {item.desc}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAIPrompt(item.prompt)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border-subtle, #e2e8f0)",
                        background: "var(--color-surface-sunken, #f8fafc)",
                        color: "var(--color-text-primary, #0f172a)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>{copied ? "Copiado!" : "Copiar Prompt"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "guide" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px", color: "var(--color-text-primary, #0f172a)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Como escrever seu fluxo em Markdown:</div>

              <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--color-surface-sunken, #f8fafc)", border: "1px solid var(--color-border-subtle, #e2e8f0)" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px", color: "var(--color-terracotta, #e05d38)" }}>
                  1. Formato Simples com Etapas e Conexões:
                </div>
                <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", color: "var(--color-text-secondary, #64748b)" }}>
{`1. [Início] Início do Funil
   - Próximo -> Captação de Lead

2. [WhatsApp] Disparo de Mensagem
   - Descrição: Mensagem automática de boas-vindas
   - Próximo -> Respondeu em 2h?

3. [Decisão] Respondeu em 2h?
   - Sim -> Agendamento de Call
   - Não -> Follow-up Automático

4. [Reunião] Agendamento de Call
   - Próximo -> Conversão em Venda

5. [Fim] Conversão em Venda`}
                </pre>
              </div>

              <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--color-surface-sunken, #f8fafc)", border: "1px solid var(--color-border-subtle, #e2e8f0)" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px", color: "var(--color-terracotta, #e05d38)" }}>
                  2. Tags de Blocos Disponíveis:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {[
                    "[Início]", "[Etapa]", "[Decisão]", "[Automação]", 
                    "[WhatsApp]", "[Instagram]", "[E-mail]", "[Reunião]", 
                    "[Pagamento]", "[Aguardar]", "[Aprovação]", "[Contrato]", 
                    "[Fim]", "[Nota]"
                  ].map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: "var(--color-surface-raised, #ffffff)",
                        border: "1px solid var(--color-border-subtle, #e2e8f0)",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--color-border-subtle, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-surface-sunken, #f8fafc)",
          }}
        >
          <button
            type="button"
            onClick={handleCopyMarkdown}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-subtle, #e2e8f0)",
              backgroundColor: "var(--color-surface-raised, #ffffff)",
              color: "var(--color-text-primary, #0f172a)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? "Markdown Copiado!" : "Copiar Markdown"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: "transparent",
                color: "var(--color-text-secondary, #64748b)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleApply}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: appliedSuccess ? "#10b981" : "var(--color-terracotta, #e05d38)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(224, 93, 56, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              {appliedSuccess ? <Check size={14} /> : <Play size={14} fill="#ffffff" />}
              <span>{appliedSuccess ? "Fluxograma Atualizado!" : "Gerar no Fluxograma"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
