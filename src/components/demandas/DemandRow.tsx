"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Calendar, GripVertical, ListChecks, Lock, MessageSquare, Paperclip, Play, ArrowUpRight } from "lucide-react";
import { richTextToPlain } from "@/lib/richText";
import { getAgendaCategory } from "@/lib/agendaCategories";
import { getContentType } from "@/lib/contentTypes";
import { tint } from "@/lib/tint";
import { clientLabel, PRIORITY_COLORS, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { AssigneeStack } from "./AssigneePicker";
import { PriorityBadge } from "./PriorityFlag";
import DemandStatusPill from "./DemandStatusPill";
import DueChip from "./DueChip";

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Avisa a lista para segurar a linha no lugar durante a animação. */
  onToggleStart?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onStartTimer?: (demand: Demand) => void;
  dragging?: boolean;
  /** Falso quando o grupo que envolve a linha já mostra o status (agrupamento por status). */
  showStatusPill?: boolean;
  selected?: boolean;
  onSelect?: (id: string, event: React.MouseEvent) => void;
}

export default function DemandRow({
  demand,
  onOpen,
  onContextMenu,
  onToggleStart,
  onDragStart,
  onDragEnd,
  onStartTimer,
  dragging,
  showStatusPill = true,
  selected = false,
  onSelect,
}: Props) {
  const { getStatus, getClient, commentsOf, attachmentsOf, toggleComplete } = useDemandas();
  const reduceMotion = useReducedMotion();

  const status = getStatus(demand.status);
  const client = getClient(demand.client_id);
  const done = demand.status_category === "fechado";
  const priorityColor = PRIORITY_COLORS[demand.priority];

  const description = richTextToPlain(demand.description, 120);
  const commentCount = commentsOf(demand.id).length || demand.comment_count || 0;
  const attachmentCount = attachmentsOf(demand.id).length || demand.attachment_count || 0;

  // Do checklist interessa o progresso, não o total — some quando não há etapa
  const contentType = getContentType(demand.content_type);
  const checklistTotal = demand.checklist_total ?? 0;
  const checklistDone = demand.checklist_done ?? 0;

  return (
    <motion.div
      data-id={demand.id}
      data-demand-id={demand.id}
      // `layout` faz a linha deslizar até a nova posição quando ela é
      // concluída e cai para o fim do grupo, em vez de saltar.
      layout={reduceMotion ? false : "position"}
      // Sai desbotando quando o filtro "ocultar concluídas" a remove da lista,
      // em vez de desaparecer de um quadro para o outro.
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
      // Transições separadas: a de layout precisa de uma mola sem repique,
      // senão o deslocamento até o fim do grupo balança ao chegar.
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 40, mass: 0.8 },
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 },
      }}
      role="button"
      tabIndex={0}
      draggable={!!onDragStart}
      onDragStart={(event) => {
        // `motion.div` tipa onDragStart com o gesto de arrasto do
        // framer-motion, mas aqui o arrasto é o nativo do HTML5 (não usamos
        // a prop `drag`), então o evento real é um DragEvent.
        const dragEvent = event as unknown as React.DragEvent;
        dragEvent.dataTransfer.effectAllowed = "move";
        // Firefox só inicia o arrasto se houver payload
        dragEvent.dataTransfer.setData("text/plain", demand.id);
        onDragStart?.(demand.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={(event) => {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          event.preventDefault();
          onSelect?.(demand.id, event);
          return;
        }
        onOpen(demand.id);
      }}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(demand.id);
        }
      }}
      className={`demanda-row ${selected ? "demanda-row-selected" : ""}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "9px 10px",
        borderRadius: 10,
        cursor: "pointer",
        borderBottom: selected
          ? "1px solid color-mix(in oklab, var(--accent) 50%, transparent)"
          : "1px solid var(--border)",
        background: selected
          ? "color-mix(in oklab, var(--accent) 12%, transparent)"
          : "transparent",
        opacity: dragging ? 0.4 : 1,
        transition: "opacity 0.15s, background 0.15s, border-color 0.15s",
      }}
    >
      {onDragStart && (
        <GripVertical
          size={14}
          color="var(--text-tertiary)"
          className="demanda-row-grip"
          style={{ marginTop: 3, flexShrink: 0, cursor: "grab" }}
        />
      )}

      {/* Checkbox redondo — cor segue a prioridade, como no Todoist */}
      <div style={{ position: "relative", marginTop: 2, flexShrink: 0, lineHeight: 0 }}>
        {/* Anel que expande e some ao concluir */}
        <AnimatePresence>
          {done && !reduceMotion && (
            <motion.span
              key="ring"
              aria-hidden="true"
              initial={{ scale: 0.6, opacity: 0.55 }}
              animate={{ scale: 2.1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `2px solid ${priorityColor}`,
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={done ? "Reabrir demanda" : "Concluir demanda"}
          aria-pressed={done}
          onClick={(event) => {
            event.stopPropagation();
            onToggleStart?.(demand.id);
            toggleComplete(demand.id);
          }}
          whileTap={reduceMotion ? undefined : { scale: 0.82 }}
          animate={{
            backgroundColor: done ? priorityColor : "rgba(0,0,0,0)",
            scale: 1,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${priorityColor}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
            <motion.path
              d="M2 6.5L4.5 9L10 3"
              fill="none"
              stroke="var(--color-surface-raised)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              // O traço se desenha ao concluir e se apaga ao reabrir
              animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
            />
          </svg>
        </motion.button>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {/* Linha 1: título + descrição ao centro + ações rápidas no hover */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flex: 1 }}>
            <span className="demanda-row-title">
              <motion.span
                initial={false}
                animate={{ color: done ? "var(--text-tertiary)" : "var(--text-primary)" }}
                transition={{ duration: reduceMotion ? 0 : 0.25 }}
              >
                {demand.title}
              </motion.span>
              {/* Risco desenhado: cresce da esquerda, em vez de piscar pronto */}
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ scaleX: done ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "52%",
                  height: 1,
                  background: "var(--text-tertiary)",
                  transformOrigin: "left center",
                }}
              />
            </span>

            {description && (
              <span
                className="demanda-row-description"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: "0.78rem",
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {description}
              </span>
            )}
          </div>

          {/* Ações Rápidas no Hover */}
          <div className="demanda-row-actions" onClick={(e) => e.stopPropagation()}>
            {onStartTimer && !done && (
              <button
                type="button"
                className="demanda-action-btn"
                title="Iniciar Timer / Focar nesta demanda"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTimer(demand);
                }}
              >
                <Play size={12} fill="currentColor" />
              </button>
            )}
            <button
              type="button"
              className="demanda-action-btn"
              title="Abrir detalhes da demanda"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(demand.id);
              }}
            >
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* Linha 2: os detalhes, abaixo do próprio título */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {client ? <ClientChip label={clientLabel(client)} /> : <InternalChip />}
          <DueChip demandId={demand.id} dueDate={demand.due_date} dueTime={demand.due_time} />
          {demand.agenda_subject && <AgendaLinkChip subject={demand.agenda_subject} />}
          {showStatusPill && <DemandStatusPill status={status} size="sm" />}
          <PriorityBadge priority={demand.priority} compact />
          {contentType && (
            <span
              title={`Formato: ${contentType.label}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: "var(--radius-badge)",
                fontSize: "0.66rem",
                fontWeight: 700,
                color: contentType.color,
                background: tint(contentType.color, 14),
                border: `1px solid ${tint(contentType.color, 32)}`,
                whiteSpace: "nowrap",
              }}
            >
              <contentType.icon size={10} />
              {contentType.label}
            </span>
          )}
          <AssigneeStack
            assigneeIds={demand.assignee_ids ?? []}
            allTeam={demand.assign_all_team}
            size={20}
            max={3}
          />

          {/* Comentários e anexos */}
          {(checklistTotal > 0 || commentCount > 0 || attachmentCount > 0) && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-tertiary)",
              }}
            >
              {checklistTotal > 0 && (
                <span
                  title={`${checklistDone} de ${checklistTotal} etapas concluídas`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    color:
                      checklistDone === checklistTotal
                        ? "var(--color-success)"
                        : "var(--text-tertiary)",
                  }}
                >
                  <ListChecks size={12} /> {checklistDone}/{checklistTotal}
                </span>
              )}
              {commentCount > 0 && (
                <span
                  title={`${commentCount} comentário(s)`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <MessageSquare size={12} /> {commentCount}
                </span>
              )}
              {attachmentCount > 0 && (
                <span
                  title={`${attachmentCount} anexo(s)`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <Paperclip size={12} /> {attachmentCount}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ClientChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "var(--text-secondary)",
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
        maxWidth: 170,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <Building2 size={11} />
      {label}
    </span>
  );
}

/** Sinaliza que a demanda tem um evento-espelho (opcional) na Agenda. */
export function AgendaLinkChip({ subject }: { subject: NonNullable<Demand["agenda_subject"]> }) {
  const category = getAgendaCategory(subject);
  if (!category) return null;
  return (
    <span
      title={`Aparece na Agenda como "${category.label}"`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.68rem",
        fontWeight: 700,
        color: category.color,
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
        whiteSpace: "nowrap",
      }}
    >
      <Calendar size={11} />
      {category.label}
    </span>
  );
}

export function InternalChip() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "var(--text-tertiary)",
        background: "var(--color-surface-inset)",
        border: "1px solid var(--border)",
        whiteSpace: "nowrap",
      }}
    >
      <Lock size={11} />
      Interna
    </span>
  );
}
