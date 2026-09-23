"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { Building2, Calendar, ListChecks, Lock, MessageSquare, Paperclip, Play, ArrowUpRight } from "lucide-react";
import { formatDueDateLabel, formatDueTime } from "@/lib/dueDate";
import { getAgendaCategory } from "@/lib/agendaCategories";
import { clientLabel, PRIORITY_COLORS, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { AssigneeStack } from "./AssigneePicker";
import DueDatePickerPopover from "./DueDatePickerPopover";

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

/** Mesmo padrão inline de `DialogShell.tsx`: só o essencial pra trocar
 * arrasto nativo (desktop, entre grupos) por swipe de toque (mobile). */
function useIsMobileRow(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const SWIPE_ACTIONS_WIDTH = 152;
const SWIPE_OPEN_THRESHOLD = SWIPE_ACTIONS_WIDTH / 2;

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
  const { getStatus, getClient, commentsOf, attachmentsOf, toggleComplete, updateDemand, showClientInTitle } =
    useDemandas();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobileRow();
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const dueTriggerRef = useRef<HTMLButtonElement>(null);

  const status = getStatus(demand.status);
  const client = getClient(demand.client_id);
  const cName = client ? clientLabel(client) : "";
  const displayClientInTitle =
    showClientInTitle &&
    cName &&
    !demand.title.toLowerCase().includes(cName.toLowerCase());
  const done = demand.status_category === "fechado";
  const priorityColor = PRIORITY_COLORS[demand.priority];

  const commentCount = commentsOf(demand.id).length || demand.comment_count || 0;
  const attachmentCount = attachmentsOf(demand.id).length || demand.attachment_count || 0;
  const checklistTotal = demand.checklist_total ?? 0;
  const checklistDone = demand.checklist_done ?? 0;
  const hasMeta = checklistTotal > 0 || commentCount > 0 || attachmentCount > 0;
  const agendaCategory = demand.agenda_subject ? getAgendaCategory(demand.agenda_subject) : null;

  const { label: dueLabel, tone: dueTone } = formatDueDateLabel(demand.due_date);
  const dueTime = formatDueTime(demand.due_time);
  const isOverdue = dueTone === "overdue";
  const dueColor = isOverdue ? "var(--color-danger)" : "var(--text-secondary)";
  const dueInteractive = !done;

  const handleComplete = () => {
    onToggleStart?.(demand.id);
    toggleComplete(demand.id);
  };

  const handleRowClick = (event: React.MouseEvent) => {
    if (isMobile && swipeOpen) {
      setSwipeOpen(false);
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.preventDefault();
      onSelect?.(demand.id, event);
      return;
    }
    onOpen(demand.id);
  };

  const handleSwipeDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset <= -SWIPE_ACTIONS_WIDTH) {
      setSwipeOpen(false);
      handleComplete();
    } else if (offset <= -SWIPE_OPEN_THRESHOLD) {
      setSwipeOpen(true);
    } else {
      setSwipeOpen(false);
    }
  };

  const checkboxSize = isMobile ? 22 : 16;
  const checkboxBorder = isMobile ? 2 : 1.5;

  return (
    <motion.div
      data-id={demand.id}
      data-demand-id={demand.id}
      layout={reduceMotion ? false : "position"}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{
        layout: { type: "spring", stiffness: 380, damping: 40, mass: 0.8 },
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 },
      }}
      role="button"
      tabIndex={0}
      draggable={!isMobile && !!onDragStart}
      onDragStart={
        !isMobile
          ? (event) => {
              // `motion.div` tipa onDragStart com o gesto do framer-motion, mas
              // aqui (sem a prop `drag`) o arrasto é o nativo do HTML5 — o
              // evento real é um DragEvent. Ver useIsMobileRow acima: no
              // mobile essa prop nem é passada, `drag="x"` assume o lugar.
              const dragEvent = event as unknown as React.DragEvent;
              dragEvent.dataTransfer.effectAllowed = "move";
              dragEvent.dataTransfer.setData("text/plain", demand.id);
              onDragStart?.(demand.id);
            }
          : undefined
      }
      onDragEnd={!isMobile ? () => onDragEnd?.() : undefined}
      onClick={handleRowClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(demand.id);
        }
      }}
      className={`demanda-row ${selected ? "demanda-row-selected" : ""}`}
      style={{
        position: "relative",
        overflow: isMobile ? "hidden" : "visible",
        borderRadius: 8,
        opacity: dragging ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {isMobile && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "stretch",
          }}
        >
          {onStartTimer && !done && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSwipeOpen(false);
                onStartTimer(demand);
              }}
              style={{
                width: 72,
                border: "none",
                background: "var(--color-surface-sunken)",
                color: "var(--text-primary)",
                fontSize: "0.7rem",
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Play size={14} fill="currentColor" />
              Timer
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSwipeOpen(false);
              handleComplete();
            }}
            style={{
              width: 80,
              border: "none",
              background: "var(--accent)",
              color: "var(--text-primary)",
              fontSize: "0.7rem",
              fontWeight: 700,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            ✓ Concluir
          </button>
        </div>
      )}

      <motion.div
        className="demanda-row-surface"
        drag={isMobile ? "x" : false}
        dragConstraints={isMobile ? { left: -SWIPE_ACTIONS_WIDTH, right: 0 } : undefined}
        dragElastic={0.08}
        animate={isMobile ? { x: swipeOpen ? -SWIPE_ACTIONS_WIDTH : 0 } : undefined}
        onDragEnd={isMobile ? handleSwipeDragEnd : undefined}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 12,
          minHeight: isMobile ? 60 : 40,
          padding: isMobile ? "8px 20px" : "0 8px",
          background: selected
            ? "color-mix(in oklab, var(--accent) 12%, var(--color-surface-canvas))"
            : "var(--color-surface-canvas)",
          cursor: "pointer",
        }}
      >
        {/* Checkbox redondo — cor segue a prioridade, como no Todoist */}
        <div style={{ position: "relative", flexShrink: 0, lineHeight: 0 }}>
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
              handleComplete();
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.82 }}
            animate={{
              backgroundColor: done ? priorityColor : "rgba(0,0,0,0)",
              scale: 1,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            style={{
              width: checkboxSize,
              height: checkboxSize,
              borderRadius: "50%",
              border: `${checkboxBorder}px solid ${priorityColor}`,
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
                animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
              />
            </svg>
          </motion.button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                style={{
                  fontSize: "0.94rem",
                  fontWeight: 600,
                  color: done ? "var(--text-tertiary)" : "var(--text-primary)",
                  textDecoration: done ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {demand.title}
                {displayClientInTitle && (
                  <span style={{ opacity: 0.8, fontWeight: 500, marginLeft: 6 }}>— {cName}</span>
                )}
              </span>
              <span
                style={{
                  fontSize: "0.81rem",
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {client ? clientLabel(client) : "Interna"}
                {" · "}
                <span style={{ fontWeight: 600, color: dueColor }}>
                  {dueLabel}
                  {dueTime && ` · ${dueTime}`}
                </span>
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ position: "relative", display: "inline-block", minWidth: 0, flexShrink: 1 }}>
                <motion.span
                  initial={false}
                  animate={{ color: done ? "var(--text-tertiary)" : "var(--text-primary)" }}
                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  style={{
                    fontSize: "0.844rem",
                    fontWeight: 600,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {demand.title}
                  {displayClientInTitle && (
                    <span style={{ opacity: 0.8, fontWeight: 500, marginLeft: 6 }}>— {cName}</span>
                  )}
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

              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {client ? clientLabel(client) : "Interna"}
              </span>

              {/* Só aparece no hover: status + contadores + agenda */}
              <div className="demanda-row-meta" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
                {showStatusPill && status && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
                    {status.label}
                  </span>
                )}

                {agendaCategory && (
                  <span
                    title={`Aparece na Agenda como "${agendaCategory.label}"`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: agendaCategory.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Calendar size={11} />
                    {agendaCategory.label}
                  </span>
                )}

                {hasMeta && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {checklistTotal > 0 && (
                      <span
                        title={`${checklistDone} de ${checklistTotal} etapas concluídas`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          color: checklistDone === checklistTotal ? "var(--color-success)" : "var(--text-tertiary)",
                        }}
                      >
                        <ListChecks size={11} /> {checklistDone}/{checklistTotal}
                      </span>
                    )}
                    {commentCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <MessageSquare size={11} /> {commentCount}
                      </span>
                    )}
                    {attachmentCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Paperclip size={11} /> {attachmentCount}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
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
        )}

        {!isMobile && (
          <>
            <button
              ref={dueTriggerRef}
              type="button"
              disabled={!dueInteractive}
              onClick={(e) => {
                if (!dueInteractive) return;
                e.stopPropagation();
                setDueOpen((prev) => !prev);
              }}
              title={dueInteractive ? "Clique para remarcar prazo" : undefined}
              style={{
                flexShrink: 0,
                width: 92,
                textAlign: "right",
                fontSize: "0.75rem",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: dueColor,
                background: "none",
                border: "none",
                padding: 0,
                cursor: dueInteractive ? "pointer" : "default",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {dueLabel}
              {dueTime && ` · ${dueTime}`}
            </button>
            {dueInteractive && (
              <DueDatePickerPopover
                open={dueOpen}
                onClose={() => setDueOpen(false)}
                anchorEl={dueTriggerRef.current}
                dueDate={demand.due_date ?? null}
                dueTime={demand.due_time ?? null}
                onSelect={(newDate, newTime) => {
                  // Tirar o prazo também limpa a hora: 14:30 sem data não significa nada
                  const patch =
                    newDate === null ? { due_date: null, due_time: null } : { due_date: newDate, due_time: newTime ?? null };
                  updateDemand(demand.id, patch);
                }}
              />
            )}
          </>
        )}

        <div style={{ flexShrink: 0, width: isMobile ? undefined : 54, display: "flex", justifyContent: "flex-end" }}>
          <AssigneeStack
            assigneeIds={demand.assignee_ids ?? []}
            allTeam={demand.assign_all_team}
            size={isMobile ? 26 : 20}
            max={3}
          />
        </div>
      </motion.div>
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
