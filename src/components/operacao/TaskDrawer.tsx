"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ChevronDown, Clapperboard, CheckCircle2 } from "lucide-react";
import { List } from "@/types/operacao";
import { useOperacao } from "./OperacaoProvider";
import { useToast } from "@/components/CustomToast";
import StatusPill from "./StatusPill";
import CustomFieldControl from "./CustomFieldControl";
import { checklistProgress } from "./FieldChip";

interface Props {
  list: List;
  taskId: string | null;
  onClose: () => void;
}

export default function TaskDrawer({ list, taskId, onClose }: Props) {
  const { getTask, updateTask, updateCustomValue, toggleAction, moveTask, deleteTask, generateEditingTasks } = useOperacao();
  const { showToast } = useToast();
  const [statusOpen, setStatusOpen] = useState(false);

  const task = taskId ? getTask(taskId) : undefined;
  const isOpen = !!task;
  const status = task ? list.statuses.find((s) => s.id === task.statusId) : undefined;
  const progress = task ? checklistProgress(task.subtasks) : { done: 0, total: 0, pct: 0 };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && task && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}
        >
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
              width: "min(560px, 100vw)",
              height: "100dvh",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
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
                  <StatusPill status={status} />
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
                        width: 220,
                      }}
                    >
                      {list.statuses.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            moveTask(task.id, s.id);
                            setStatusOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: s.id === task.statusId ? "rgba(255,255,255,0.06)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-primary)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textAlign: "left",
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          {s.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    deleteTask(task.id);
                    onClose();
                  }}
                  title="Excluir tarefa"
                  style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: 6 }}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={onClose}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 6 }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>
              <input
                value={task.title}
                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  outline: "none",
                  letterSpacing: "-0.02em",
                }}
              />

              {/* Ação de captação → gerar edições (regra §10.4.8) */}
              {task.taskType === "captacao" && (() => {
                const gerado = !!task.customValues["edicoes_geradas"];
                return (
                  <button
                    disabled={gerado}
                    onClick={() => {
                      const created = generateEditingTasks(task.id);
                      if (created.length) showToast("Tarefas de edição criadas nas filas!", "success");
                    }}
                    className={gerado ? "btn btn-secondary" : "btn btn-accent"}
                    style={{ alignSelf: "flex-start", cursor: gerado ? "default" : "pointer", opacity: gerado ? 0.7 : 1 }}
                  >
                    {gerado ? (
                      <>
                        <CheckCircle2 size={16} /> Edições geradas
                      </>
                    ) : (
                      <>
                        <Clapperboard size={16} /> Confirmar captação → gerar edições
                      </>
                    )}
                  </button>
                );
              })()}

              {/* Campos personalizados */}
              {list.customFields.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  {list.customFields.map((f) => (
                    <CustomFieldControl
                      key={f.id}
                      field={f}
                      value={task.customValues[f.key] ?? null}
                      onChange={(v) => updateCustomValue(task.id, f.key, v)}
                    />
                  ))}
                </div>
              )}

              {/* Descrição */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)" }}>
                  Descrição
                </label>
                <textarea
                  className="input-dark"
                  value={task.description ?? ""}
                  onChange={(e) => updateTask(task.id, { description: e.target.value })}
                  placeholder="Briefing, referências, informações importantes..."
                  style={{ minHeight: 90, padding: 12, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              {/* Subtarefas / checklists */}
              {task.subtasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Etapas</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: progress.pct === 100 ? "var(--color-success)" : "var(--text-secondary)" }}>
                      {progress.done}/{progress.total} ações · {progress.pct}%
                    </span>
                  </div>
                  {task.subtasks.map((st) => {
                    const stProg = checklistProgress([st]);
                    return (
                      <div key={st.id} className="glass-card" style={{ padding: 14, background: "var(--card-inner-bg)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.84rem" }}>{st.name}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 700 }}>
                            {stProg.done}/{stProg.total}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {st.actions.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => toggleAction(a.id)}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                padding: "7px 8px",
                                borderRadius: 8,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                                width: "100%",
                              }}
                            >
                              <span
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 5,
                                  flexShrink: 0,
                                  marginTop: 1,
                                  border: `1.5px solid ${a.done ? "var(--color-success)" : "var(--border)"}`,
                                  background: a.done ? "var(--color-success)" : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontSize: "0.7rem",
                                }}
                              >
                                {a.done ? "✓" : ""}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: a.done ? "var(--text-tertiary)" : "var(--text-secondary)",
                                  textDecoration: a.done ? "line-through" : "none",
                                  lineHeight: 1.4,
                                }}
                              >
                                {a.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
