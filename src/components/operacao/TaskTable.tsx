"use client";

import { List, Task } from "@/types/operacao";
import StatusPill from "./StatusPill";
import FieldChip, { checklistProgress } from "./FieldChip";

interface Props {
  list: List;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
}

export default function TaskTable({ list, tasks, onOpenTask }: Props) {
  const chipFields = list.customFields.filter((f) => f.type === "label" || f.type === "dropdown");

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Tarefa</th>
            <th>Status</th>
            {chipFields.map((f) => (
              <th key={f.id}>{f.label}</th>
            ))}
            <th>Data</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const status = list.statuses.find((s) => s.id === task.statusId);
            const progress = checklistProgress(task.subtasks);
            const dueDate = task.dueDate || (task.customValues["data"] as string | undefined);
            return (
              <tr key={task.id} style={{ cursor: "pointer" }} onClick={() => onOpenTask(task.id)}>
                <td style={{ fontWeight: 600 }}>{task.title}</td>
                <td>
                  <StatusPill status={status} size="sm" />
                </td>
                {chipFields.map((f) => (
                  <td key={f.id}>
                    <FieldChip field={f} value={task.customValues[f.key]} />
                  </td>
                ))}
                <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {dueDate ? new Date(String(dueDate) + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {progress.total > 0 ? `${progress.done}/${progress.total}` : "—"}
                </td>
              </tr>
            );
          })}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={4 + chipFields.length} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: 24 }}>
                Nenhuma tarefa nesta lista.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
