"use client";

import { motion } from "framer-motion";
import { CheckSquare, Calendar } from "lucide-react";
import { FieldDef, Task } from "@/types/operacao";
import FieldChip, { checklistProgress } from "./FieldChip";

interface Props {
  task: Task;
  fields: FieldDef[];
  onOpen: (taskId: string) => void;
  onDragStart?: (taskId: string) => void;
  draggable?: boolean;
}

export default function TaskCard({ task, fields, onOpen, onDragStart, draggable }: Props) {
  const progress = checklistProgress(task.subtasks);
  const chipFields = fields.filter(
    (f) => (f.type === "label" || f.type === "dropdown") && task.customValues[f.key],
  );
  const dueDate = task.dueDate || (task.customValues["data"] as string | undefined);

  return (
    <motion.div
      layout
      draggable={draggable}
      onDragStart={() => onDragStart?.(task.id)}
      onClick={() => onOpen(task.id)}
      whileHover={{ y: -2 }}
      className="glass-card"
      style={{
        padding: 14,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--card-inner-bg)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
          {task.title}
        </span>
      </div>

      {chipFields.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chipFields.map((f) => (
            <FieldChip key={f.id} field={f} value={task.customValues[f.key]} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {dueDate && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              color: "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            <Calendar size={12} />
            {new Date(String(dueDate) + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
        {progress.total > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.7rem",
              color: progress.pct === 100 ? "#22C55E" : "var(--text-tertiary)",
              fontWeight: 700,
            }}
          >
            <CheckSquare size={12} />
            {progress.done}/{progress.total}
          </span>
        )}
      </div>

      {progress.total > 0 && (
        <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress.pct}%`,
              background: progress.pct === 100 ? "#22C55E" : "var(--accent)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
