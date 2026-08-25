"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  Flag,
  MessageSquare,
  Paperclip,
  Trash2,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { clientLabel, PRIORITY_LABELS, type DemandPriority } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandStatusPill from "./DemandStatusPill";
import AssigneePicker from "./AssigneePicker";
import AttachmentList from "./AttachmentList";
import CommentThread from "./CommentThread";
import { PriorityFlag } from "./PriorityFlag";

// TipTap não roda no servidor — mesmo tratamento de src/app/admin/notas/[id]
const BlockEditor = dynamic(() => import("@/components/notas/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "16px 0", color: "var(--text-tertiary)", fontSize: "0.84rem" }}>
      Carregando editor…
    </div>
  ),
});

const PRIORITIES: DemandPriority[] = ["none", "low", "medium", "high", "urgent"];

/** Descrição salva com atraso, para não gravar a cada tecla (igual às Notas). */
const DESCRIPTION_SAVE_DELAY = 900;

interface Props {
  demandId: string | null;
  onClose: () => void;
}

export default function DemandDrawer({ demandId, onClose }: Props) {
  const {
    getDemand,
    getStatus,
    getClient,
    statuses,
    clients,
    updateDemand,
    deleteDemand,
    loadDetails,
  } = useDemandas();

  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const descriptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demand = demandId ? getDemand(demandId) : undefined;
  const isOpen = !!demand;

  // Trocar de demanda reinicia o rascunho do título e fecha os dropdowns.
  // Ajuste durante o render (padrão do React para estado derivado de props),
  // em vez de um efeito com setState.
  if (demandId !== draftFor) {
    setDraftFor(demandId);
    setTitleDraft(demand?.title ?? "");
    setStatusOpen(false);
    setPriorityOpen(false);
  }

  // Carrega comentários e anexos uma vez por demanda aberta
  useEffect(() => {
    if (!demandId) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === demandId) return;
    loadedFor.current = demandId;
    loadDetails(demandId);
  }, [demandId, loadDetails]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  // Garante que a última digitação da descrição seja gravada ao desmontar
  useEffect(() => {
    return () => {
      if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    };
  }, []);

  if (typeof document === "undefined") return null;

  const scheduleDescriptionSave = (id: string, content: unknown) => {
    if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    descriptionTimer.current = setTimeout(() => {
      updateDemand(id, { description: content as Record<string, unknown> });
    }, DESCRIPTION_SAVE_DELAY);
  };

  const status = demand ? getStatus(demand.status) : undefined;
  const client = demand ? getClient(demand.client_id) : undefined;

  const commitTitle = () => {
    if (!demand) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === demand.title) {
      setTitleDraft(demand.title);
      return;
    }
    updateDemand(demand.id, { title: trimmed });
  };

  const handleDelete = () => {
    if (!demand) return;
    if (!window.confirm(`Excluir a demanda "${demand.title}"?`)) return;
    deleteDemand(demand.id);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && demand && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "var(--color-scrim)" }}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-card"
            style={{
              position: "relative",
              width: "min(620px, 100vw)",
              height: "100dvh",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header: status + fechar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setStatusOpen((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <DemandStatusPill status={status} />
                  <ChevronDown size={14} color="var(--text-tertiary)" />
                </button>

                <AnimatePresence>
                  {statusOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="glass-card"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 10,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        width: 230,
                      }}
                    >
                      {statuses.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            updateDemand(demand.id, { status: option.id });
                            setStatusOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            background:
                              option.id === demand.status
                                ? "var(--color-surface-sunken)"
                                : "transparent",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: option.color,
                            }}
                          />
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  aria-label="Excluir demanda"
                  onClick={handleDelete}
                  style={{
                    display: "flex",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--color-danger)",
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={onClose}
                  style={{
                    display: "flex",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--text-secondary)",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Corpo rolável */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              {/* Título editável inline */}
              <textarea
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.target as HTMLTextAreaElement).blur();
                  }
                }}
                rows={1}
                style={{
                  width: "100%",
                  resize: "none",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                }}
              />

              {/* Propriedades */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <PropertyRow icon={<Building2 size={15} />} label="Cliente">
                  <select
                    value={demand.client_id ?? ""}
                    onChange={(event) =>
                      updateDemand(demand.id, { client_id: event.target.value || null })
                    }
                    style={selectStyle}
                  >
                    <option value="">Demanda interna (sem cliente)</option>
                    {clients.map((option) => (
                      <option key={option.id} value={option.id}>
                        {clientLabel(option)}
                      </option>
                    ))}
                  </select>
                </PropertyRow>

                <PropertyRow icon={<Users size={15} />} label="Responsáveis">
                  <AssigneePicker
                    assigneeIds={demand.assignee_ids ?? []}
                    allTeam={demand.assign_all_team}
                    onChange={(assigneeIds, allTeam) =>
                      updateDemand(demand.id, {
                        assignee_ids: assigneeIds,
                        assign_all_team: allTeam,
                      })
                    }
                  />
                </PropertyRow>

                <PropertyRow icon={<Flag size={15} />} label="Prioridade">
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setPriorityOpen((v) => !v)}
                      style={{ ...selectStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    >
                      <PriorityFlag priority={demand.priority} />
                      {PRIORITY_LABELS[demand.priority]}
                    </button>

                    <AnimatePresence>
                      {priorityOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="glass-card"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            zIndex: 10,
                            padding: 6,
                            width: 200,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {PRIORITIES.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                updateDemand(demand.id, { priority: option });
                                setPriorityOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "7px 9px",
                                borderRadius: 8,
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                background:
                                  option === demand.priority
                                    ? "var(--color-surface-sunken)"
                                    : "transparent",
                              }}
                            >
                              <PriorityFlag priority={option} />
                              {PRIORITY_LABELS[option]}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </PropertyRow>

                <PropertyRow icon={<CalendarClock size={15} />} label="Datas">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label style={dateLabelStyle}>
                      Início
                      <input
                        type="date"
                        value={demand.start_date ?? ""}
                        onChange={(event) =>
                          updateDemand(demand.id, { start_date: event.target.value || null })
                        }
                        style={dateInputStyle}
                      />
                    </label>
                    <label style={dateLabelStyle}>
                      Entrega
                      <input
                        type="date"
                        value={demand.due_date ?? ""}
                        onChange={(event) =>
                          updateDemand(demand.id, { due_date: event.target.value || null })
                        }
                        style={dateInputStyle}
                      />
                    </label>
                    <label style={dateLabelStyle}>
                      Hora
                      <input
                        type="time"
                        value={demand.due_time?.slice(0, 5) ?? ""}
                        onChange={(event) =>
                          updateDemand(demand.id, { due_time: event.target.value || null })
                        }
                        style={dateInputStyle}
                      />
                    </label>
                  </div>
                </PropertyRow>
              </div>

              {/* Descrição */}
              <Section title="Descrição">
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--color-surface-sunken)",
                    padding: "6px 10px",
                  }}
                >
                  <BlockEditor
                    key={demand.id}
                    content={demand.description ?? undefined}
                    bucket="demand-attachments"
                    placeholder="Detalhe o projeto/demanda… '/' para blocos, '@' para mencionar"
                    onChange={(content) => scheduleDescriptionSave(demand.id, content)}
                  />
                </div>
              </Section>

              {/* Anexos */}
              <Section title="Anexos" icon={<Paperclip size={14} />}>
                <AttachmentList demandId={demand.id} />
              </Section>

              {/* Comentários */}
              <Section title="Comentários" icon={<MessageSquare size={14} />}>
                <CommentThread demandId={demand.id} />
              </Section>

              <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                Criada em{" "}
                {new Date(demand.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {client && ` · ${clientLabel(client)}`}
                {demand.completed_at &&
                  ` · concluída em ${new Date(demand.completed_at).toLocaleDateString("pt-BR")}`}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-primary)",
  fontSize: "0.8rem",
  fontWeight: 600,
  fontFamily: "inherit",
};

const dateLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: "0.66rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-tertiary)",
};

const dateInputStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-primary)",
  fontSize: "0.78rem",
  fontWeight: 600,
  fontFamily: "inherit",
};

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          width: 128,
          flexShrink: 0,
          paddingTop: 6,
          fontSize: "0.76rem",
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-tertiary)",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
