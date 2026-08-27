"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Copy,
  Check,
  Share2,
  ExternalLink,
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { useToast } from "@/components/CustomToast";
import { useAuth } from "@/hooks/useAuth";
import type { DemandPriority } from "@/types/demandas";
import {
  generateWhatsAppSummary,
  buildWhatsAppShareUrl,
  type WhatsAppDateScope,
  type WhatsAppSummaryGrouping,
} from "@/lib/whatsappDemandSummary";
import { useDemandas } from "./DemandasProvider";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { UserAvatar } from "./AssigneePicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedIds?: string[];
}

export default function WhatsAppSummaryModal({
  isOpen,
  onClose,
  initialSelectedIds = [],
}: Props) {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { demands, clients, users, statuses } = useDemandas();

  // Estados de configuração do resumo
  const [dateScope, setDateScope] = useState<WhatsAppDateScope>(() =>
    initialSelectedIds.length > 0 ? "selected" : "today"
  );
  const [grouping, setGrouping] = useState<WhatsAppSummaryGrouping>("assignee");
  const [targetAssigneeId, setTargetAssigneeId] = useState<string>("all");
  const [allowedPriorities, setAllowedPriorities] = useState<DemandPriority[]>([
    "urgent",
    "high",
    "medium",
    "low",
    "none",
  ]);

  const [includeTime, setIncludeTime] = useState(true);
  const [includeClient, setIncludeClient] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(false);
  const [includeChecklist, setIncludeChecklist] = useState(true);

  const [customHeaderNote, setCustomHeaderNote] = useState("");
  const [copied, setCopied] = useState(false);

  // Sincroniza escopo inicial se abrir com itens selecionados
  useEffect(() => {
    if (isOpen && initialSelectedIds.length > 0) {
      setDateScope("selected");
    }
  }, [isOpen, initialSelectedIds]);

  const togglePriority = (p: DemandPriority) => {
    setAllowedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const setOnlyUrgentAndMedium = () => {
    setAllowedPriorities(["urgent", "medium"]);
  };

  const setAllPriorities = () => {
    setAllowedPriorities(["urgent", "high", "medium", "low", "none"]);
  };

  // Prepara lista de opções de responsáveis
  const userOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [
      {
        value: "all",
        label: "👥 Toda a Equipe (Geral)",
        keywords: "todos equipe geral",
      },
    ];

    if (currentUser) {
      opts.push({
        value: currentUser.id,
        label: `👤 Minhas Demandas (${currentUser.name || currentUser.username})`,
        keywords: "minhas eu",
        icon: (
          <UserAvatar
            name={currentUser.name}
            avatarUrl={currentUser.avatar_url ?? currentUser.avatarUrl}
            size={18}
            ring={false}
          />
        ),
      });
    }

    users.forEach((u) => {
      if (currentUser && u.id === currentUser.id) return;
      opts.push({
        value: u.id,
        label: u.name ? `${u.name} (@${u.username})` : `@${u.username}`,
        description: u.phone ? `WhatsApp: ${u.phone}` : undefined,
        keywords: `${u.name} ${u.username} ${u.email || ""}`,
        icon: (
          <UserAvatar
            name={u.name}
            avatarUrl={u.avatar_url ?? u.avatarUrl}
            size={18}
            ring={false}
          />
        ),
      });
    });

    opts.push({
      value: "unassigned",
      label: "⚪ Sem responsável atribuído",
      keywords: "sem responsavel avulso",
    });

    return opts;
  }, [users, currentUser]);

  const selectedTargetUser = useMemo(() => {
    if (targetAssigneeId === "all" || targetAssigneeId === "unassigned") return null;
    return users.find((u) => u.id === targetAssigneeId) || null;
  }, [users, targetAssigneeId]);

  // Gera o texto formatado para o WhatsApp
  const generatedText = useMemo(() => {
    const baseSummary = generateWhatsAppSummary({
      demands,
      clients,
      users,
      statuses,
      dateScope,
      selectedIds: initialSelectedIds,
      grouping,
      targetAssigneeId: targetAssigneeId as any,
      allowedPriorities,
      includeTime,
      includeClient,
      includeStatus,
      includeChecklist,
    });

    if (customHeaderNote.trim()) {
      return `📌 _${customHeaderNote.trim()}_\n\n${baseSummary}`;
    }

    return baseSummary;
  }, [
    demands,
    clients,
    users,
    statuses,
    dateScope,
    initialSelectedIds,
    grouping,
    targetAssigneeId,
    allowedPriorities,
    includeTime,
    includeClient,
    includeStatus,
    includeChecklist,
    customHeaderNote,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      showToast("Resumo copiado para o WhatsApp com sucesso!", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Falha ao copiar:", err);
      showToast("Não foi possível acessar a área de transferência.", "error");
    }
  };

  const handleOpenWhatsApp = () => {
    const url = buildWhatsAppShareUrl(generatedText, selectedTargetUser?.phone);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Resumo para WhatsApp"
      maxWidth="720px"
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
            <WhatsAppIcon size={16} style={{ color: "#25D366" }} />
            <span>Formatado com emojis e destaques</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedTargetUser?.phone && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenWhatsApp}
                title={`Enviar direto para ${selectedTargetUser.name || selectedTargetUser.phone}`}
                style={{ color: "#25D366" }}
              >
                <ExternalLink size={14} />
                Enviar p/ {selectedTargetUser.name?.split(" ")[0] || "WhatsApp"}
              </button>
            )}

            {!selectedTargetUser?.phone && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenWhatsApp}
                title="Abrir no WhatsApp Web"
              >
                <ExternalLink size={14} />
                WhatsApp Web
              </button>
            )}

            <button
              type="button"
              className="btn btn-accent"
              onClick={handleCopy}
              style={{
                backgroundColor: copied ? "var(--color-success, #10b981)" : "#25D366",
                color: "#ffffff",
                borderColor: "transparent",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado com sucesso!" : "Copiar Texto"}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Barra de Filtros e Opções de Geração */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: "14px 16px",
            borderRadius: "12px",
            background: "var(--surface-sunken, rgba(255,255,255,0.03))",
            border: "1px solid var(--border)",
          }}
        >
          {/* Linha 1: Período e Agrupamento */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Escopo de Data */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📅 Período
              </label>
              <div className="filter-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="filter-tab"
                  data-active={dateScope === "today" || undefined}
                  onClick={() => setDateScope("today")}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  data-active={dateScope === "overdue_and_today" || undefined}
                  onClick={() => setDateScope("overdue_and_today")}
                >
                  Atrasadas + Hoje
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  data-active={dateScope === "open_all" || undefined}
                  onClick={() => setDateScope("open_all")}
                >
                  Todas Abertas
                </button>
                {initialSelectedIds.length > 0 && (
                  <button
                    type="button"
                    className="filter-tab"
                    data-active={dateScope === "selected" || undefined}
                    onClick={() => setDateScope("selected")}
                  >
                    Selecionadas ({initialSelectedIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Modo de Agrupamento */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Organização
              </label>
              <div className="filter-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="filter-tab"
                  data-active={grouping === "assignee" || undefined}
                  onClick={() => setGrouping("assignee")}
                >
                  👤 Por Responsável
                </button>
                <button
                  type="button"
                  className="filter-tab"
                  data-active={grouping === "priority" || undefined}
                  onClick={() => setGrouping("priority")}
                >
                  🚨 Por Prioridade
                </button>
              </div>
            </div>
          </div>

          {/* Linha 2: Responsável / Destinatário */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              👤 Responsável / Destinatário
            </label>
            <div style={{ maxWidth: 360 }}>
              <Combobox
                value={targetAssigneeId}
                onChange={(v) => setTargetAssigneeId(v || "all")}
                options={userOptions}
                ariaLabel="Filtrar por responsável para WhatsApp"
                searchPlaceholder="Buscar responsável…"
                clearOption={{ label: "👥 Toda a Equipe (Geral)", icon: <Users size={14} /> }}
              />
            </div>
          </div>

          {/* Linha 3: Filtro de Prioridades (Urgente, Médio, etc.) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Prioridades incluídas
              </label>
              <div style={{ display: "flex", gap: 8, fontSize: "0.72rem" }}>
                <button
                  type="button"
                  onClick={setOnlyUrgentAndMedium}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Apenas Urgente & Médio
                </button>
                <span style={{ color: "var(--border)" }}>·</span>
                <button
                  type="button"
                  onClick={setAllPriorities}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Todas
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "urgent", label: "Urgente", emoji: "🔴", color: "#ef4444" },
                { key: "high", label: "Alta", emoji: "🟠", color: "#f97316" },
                { key: "medium", label: "Médio", emoji: "🟡", color: "#eab308" },
                { key: "low", label: "Baixa", emoji: "🟢", color: "#10b981" },
                { key: "none", label: "Outras", emoji: "⚪", color: "#64748b" },
              ].map((p) => {
                const isActive = allowedPriorities.includes(p.key as DemandPriority);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePriority(p.key as DemandPriority)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isActive
                        ? `1px solid ${p.color}`
                        : "1px solid var(--border)",
                      background: isActive
                        ? `${p.color}15`
                        : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linha 4: Toggles de detalhes */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              ⏰ Horários de entrega
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeClient}
                onChange={(e) => setIncludeClient(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              🏢 Nome do cliente / Interno
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeChecklist}
                onChange={(e) => setIncludeChecklist(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              ☑️ Progresso de checklist
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "var(--text-secondary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeStatus}
                onChange={(e) => setIncludeStatus(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              🏷️ Status atual
            </label>
          </div>
        </div>

        {/* Recado adicional opcional */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)" }}>
            Recado adicional no topo (opcional):
          </label>
          <input
            type="text"
            value={customHeaderNote}
            onChange={(e) => setCustomHeaderNote(e.target.value)}
            placeholder="Ex: Pessoal, foco total nessas entregas até as 17h hoje!"
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
            }}
          />
        </div>

        {/* Visualização Prévia estilo WhatsApp */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <WhatsAppIcon size={14} style={{ color: "#25D366" }} />
              Pré-visualização do texto
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
              Pronto para colar em qualquer conversa ou grupo
            </span>
          </div>

          <div
            style={{
              position: "relative",
              borderRadius: "12px",
              background: "#0c1514",
              border: "1px solid rgba(37, 211, 102, 0.25)",
              padding: "16px",
              maxHeight: "260px",
              overflowY: "auto",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
                fontSize: "0.82rem",
                lineHeight: 1.55,
                color: "#e1e7e5",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {generatedText}
            </pre>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
