"use client";

import { useState } from "react";
import { List, Task } from "@/types/operacao";
import { useOperacao } from "./OperacaoProvider";
import TaskCard from "./TaskCard";

interface Props {
  list: List;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

export default function KanbanBoard({ list, tasks, onOpenTask }: Props) {
  const { moveTask } = useOperacao();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);

  const handleDrop = (statusId: string) => {
    if (dragId) moveTask(dragId, statusId);
    setDragId(null);
    setOverStatus(null);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        paddingBottom: 12,
        alignItems: "flex-start",
      }}
    >
      {list.statuses.map((status) => {
        const colTasks = tasks.filter((t) => t.statusId === status.id);
        const isOver = overStatus === status.id;
        return (
          <div
            key={status.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStatus(status.id);
            }}
            onDragLeave={() => setOverStatus((s) => (s === status.id ? null : s))}
            onDrop={() => handleDrop(status.id)}
            style={{
              width: 280,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 12,
              borderRadius: 18,
              background: isOver ? "rgba(217,72,15,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${isOver ? "rgba(217,72,15,0.35)" : "var(--border)"}`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.color }} />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-secondary)",
                }}
              >
                {status.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "1px 8px",
                  borderRadius: 8,
                }}
              >
                {colTasks.length}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 40 }}>
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  fields={list.customFields}
                  onOpen={onOpenTask}
                  draggable
                  onDragStart={setDragId}
                />
              ))}
              {colTasks.length === 0 && (
                <div
                  style={{
                    padding: "16px 8px",
                    textAlign: "center",
                    fontSize: "0.72rem",
                    color: "var(--text-tertiary)",
                    border: "1px dashed var(--border)",
                    borderRadius: 12,
                  }}
                >
                  Arraste tarefas aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
