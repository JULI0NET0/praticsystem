"use client";

import { motion } from "framer-motion";
import { MessageSquare, Paperclip } from "lucide-react";
import { clientLabel, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { AssigneeStack } from "./AssigneePicker";
import { ClientChip, InternalChip } from "./DemandRow";
import { PriorityBadge } from "./PriorityFlag";
import DueChip from "./DueChip";

interface Props {
  demand: Demand;
  onOpen: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
}

export default function DemandCard({
  demand,
  onOpen,
  onDragStart,
  onDragEnd,
  onContextMenu,
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
      onClick={() => onOpen(demand.id)}
      onContextMenu={onContextMenu}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        borderRadius: 12,
        background: "var(--color-surface-raised)",
        border: "1px solid var(--border)",
        cursor: "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {client ? <ClientChip label={clientLabel(client)} /> : <InternalChip />}
        <PriorityBadge priority={demand.priority} compact />
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
