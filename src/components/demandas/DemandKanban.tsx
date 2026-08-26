"use client";

import { useState } from "react";
import { GripVertical, Plus, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { tint } from "@/lib/tint";
import type { Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandCard from "./DemandCard";
import QuickAddRow from "./QuickAddRow";
import DemandContextMenu, { useDemandContextMenu } from "./DemandContextMenu";

interface Props {
  demands: Demand[];
  onOpenDemand: (id: string) => void;
  onManageStatuses: () => void;
  selectedIds?: Set<string>;
  onSelectDemand?: (id: string, event: React.MouseEvent) => void;
}

/**
 * Kanban com drag & drop nativo HTML5 (o projeto não usa lib de DnD —
 * mesmo padrão de src/components/operacao/KanbanBoard.tsx).
 *
 * Dois arrastes convivem: o do card (move entre colunas) e o da alça no
 * cabeçalho (reordena as colunas). `dragKind` distingue os dois para que
 * soltar uma coluna não mova uma demanda e vice-versa.
 */
export default function DemandKanban({
  demands,
  onOpenDemand,
  onManageStatuses,
  selectedIds,
  onSelectDemand,
}: Props) {
  const { statuses, moveDemand, reorderStatuses, loading } = useDemandas();
  const { anchor, openFor, close } = useDemandContextMenu();

  const [dragKind, setDragKind] = useState<"card" | "column" | null>(null);
  const [dragDemandId, setDragDemandId] = useState<string | null>(null);
  const [dragStatusId, setDragStatusId] = useState<string | null>(null);
  const [overStatusId, setOverStatusId] = useState<string | null>(null);
  const [quickAddFor, setQuickAddFor] = useState<string | null>(null);

  const resetDrag = () => {
    setDragKind(null);
    setDragDemandId(null);
    setDragStatusId(null);
    setOverStatusId(null);
  };

  const handleDrop = (targetStatusId: string) => {
    if (dragKind === "card" && dragDemandId) {
      moveDemand(dragDemandId, targetStatusId);
    } else if (dragKind === "column" && dragStatusId && dragStatusId !== targetStatusId) {
      const ordered = statuses.map((s) => s.id).filter((id) => id !== dragStatusId);
      const targetIndex = ordered.indexOf(targetStatusId);
      ordered.splice(targetIndex < 0 ? ordered.length : targetIndex, 0, dragStatusId);
      reorderStatuses(ordered);
    }
    resetDrag();
  };

  if (loading) {
    return (
      <div
        className="glass-card"
        style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}
      >
        Carregando demandas…
      </div>
    );
  }

  return (
    <div
      className="demand-kanban-container"
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        paddingBottom: 12,
        alignItems: "flex-start",
      }}
    >
      {statuses.map((status) => {
        const columnDemands = demands.filter((d) => d.status === status.id);
        const isOver = overStatusId === status.id;

        return (
          <div
            key={status.id}
            className="demand-kanban-column"
            onDragOver={(event) => {
              event.preventDefault();
              setOverStatusId(status.id);
            }}
            onDragLeave={() =>
              setOverStatusId((current) => (current === status.id ? null : current))
            }
            onDrop={() => handleDrop(status.id)}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 12,
              borderRadius: 18,
              background: isOver
                ? tint(status.color, 8)
                : "var(--color-surface-sunken)",
              border: `1px solid ${isOver ? tint(status.color, 40) : "var(--border)"}`,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {/* Cabeçalho — a alça arrasta a coluna inteira */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 2px" }}>
              <span
                draggable
                onDragStart={() => {
                  setDragKind("column");
                  setDragStatusId(status.id);
                }}
                onDragEnd={resetDrag}
                title="Arraste para reordenar a coluna"
                style={{ cursor: "grab", display: "flex", alignItems: "center" }}
              >
                <GripVertical size={13} color="var(--text-tertiary)" />
              </span>

              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: status.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
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
                  background: "var(--color-surface-inset)",
                  padding: "1px 8px",
                  borderRadius: 8,
                }}
              >
                {columnDemands.length}
              </span>
              <button
                type="button"
                aria-label={`Adicionar em ${status.label}`}
                onClick={() =>
                  setQuickAddFor((current) => (current === status.id ? null : status.id))
                }
                style={{
                  display: "flex",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                <Plus size={15} color="var(--text-tertiary)" />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {quickAddFor === status.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <QuickAddRow
                    defaults={{ status: status.id }}
                    placeholder={`Nova em "${status.label}"…`}
                    onCreated={() => setQuickAddFor(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 48 }}>
              {columnDemands.map((demand) => (
                <DemandCard
                  key={demand.id}
                  demand={demand}
                  onOpen={onOpenDemand}
                  onDragStart={(id) => {
                    setDragKind("card");
                    setDragDemandId(id);
                  }}
                  onDragEnd={resetDrag}
                  onContextMenu={openFor(demand.id)}
                  selected={selectedIds?.has(demand.id)}
                  onSelect={onSelectDemand}
                />
              ))}

              {columnDemands.length === 0 && (
                <div
                  style={{
                    padding: "18px 8px",
                    textAlign: "center",
                    fontSize: "0.72rem",
                    color: "var(--text-tertiary)",
                    border: "1px dashed var(--border)",
                    borderRadius: 12,
                  }}
                >
                  Arraste demandas aqui
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Coluna final: gerenciar status */}
      <button
        type="button"
        onClick={onManageStatuses}
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "18px 12px",
          borderRadius: 18,
          border: "1px dashed var(--border)",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        <SlidersHorizontal size={15} />
        Gerenciar status
      </button>

      {anchor && (
        <DemandContextMenu anchor={anchor} onClose={close} onOpenDetails={onOpenDemand} />
      )}
    </div>
  );
}
