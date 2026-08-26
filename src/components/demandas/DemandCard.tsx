"use client";

import { motion } from "framer-motion";
import { MessageSquare, Paperclip } from "lucide-react";
import { clientLabel, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { AssigneeStack } from "./AssigneePicker";
import { AgendaLinkChip, ClientChip, InternalChip } from "./DemandRow";
import { PriorityBadge } from "./PriorityFlag";
import DueChip from "./DueChip";

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  selected?: boolean;
  onSelect?: (id: string, event: React.MouseEvent) => void;
}

export default function DemandCard({
  demand,
  onOpen,
  onDragStart,
  onDragEnd,
  onContextMenu,
  selected = false,
  onSelect,
}: Props) {
  const { getClient, commentsOf, attachmentsOf } = useDemandas();

  const client = getClient(demand.client_id);
  const done = demand.status_category === "fechado";

  // Contagem vem agregada da listagem; quando o drawer já carregou os detalhes
  // desta demanda, prefere-se o que está em memória (reflete o que acabou de
  // ser escrito, sem esperar um refresh).
  const loadedComments = commentsOf(demand.id);
  const loadedAttachments = attachmentsOf(demand.id);
  const commentCount = loadedComments.length || demand.comment_count || 0;
  const attachmentCount = loadedAttachments.length || demand.attachment_count || 0;

  return (
    <motion.div
      layout
      draggable
      onDragStart={() => onDragStart?.(demand.id)}
      onDragEnd={() => onDragEnd?.()}
      whileHover={{ y: -2 }}
      onClick={(event) => {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
          event.preventDefault();
          onSelect?.(demand.id, event);
          return;
        }
        onOpen(demand.id);
      }}
      onContextMenu={onContextMenu}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        background: selected
          ? "color-mix(in oklab, var(--accent) 12%, var(--color-surface-raised))"
          : "var(--color-surface-raised)",
        border: selected
          ? "1px solid var(--accent)"
          : "1px solid var(--border)",
        boxShadow: selected ? "0 0 0 1px var(--accent)" : "none",
        cursor: "grab",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {client ? <ClientChip label={clientLabel(client)} /> : <InternalChip />}
        <PriorityBadge priority={demand.priority} compact />
        {demand.agenda_subject && <AgendaLinkChip subject={demand.agenda_subject} />}
      </div>

      <span
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          lineHeight: 1.35,
          color: done ? "var(--text-tertiary)" : "var(--text-primary)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {demand.title}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <DueChip dueDate={demand.due_date} dueTime={demand.due_time} />
        <AssigneeStack
          assigneeIds={demand.assignee_ids ?? []}
          allTeam={demand.assign_all_team}
          size={22}
          max={3}
        />
      </div>

      {(commentCount > 0 || attachmentCount > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--text-tertiary)",
          }}
        >
          {commentCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MessageSquare size={12} /> {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Paperclip size={12} /> {attachmentCount}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
