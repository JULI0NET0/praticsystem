"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { CATEGORICAL_RAMP } from "@/lib/statusColors";
import type { DemandStatus, DemandStatusCategory } from "@/types/demandas";
import { useDemandas, slugifyStatus } from "./DemandasProvider";

const CATEGORY_LABELS: Record<DemandStatusCategory, string> = {
  nao_iniciado: "Não iniciado",
  ativo: "Em andamento",
  fechado: "Concluído",
};

const CATEGORIES: DemandStatusCategory[] = ["nao_iniciado", "ativo", "fechado"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatusManagerModal({ isOpen, onClose }: Props) {
  const { statuses, demands, upsertStatus, deleteStatus, reorderStatuses } = useDemandas();
  const [newLabel, setNewLabel] = useState("");

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= statuses.length) return;
    const ids = statuses.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderStatuses(ids);
  };

  const addStatus = async () => {
    const label = newLabel.trim();
    if (!label) return;

    let id = slugifyStatus(label);
    if (statuses.some((s) => s.id === id)) id = `${id}_${Date.now().toString(36)}`;

    await upsertStatus({
      id,
      label,
      color: CATEGORICAL_RAMP[statuses.length % CATEGORICAL_RAMP.length],
      category: "ativo",
      position: statuses.length,
    });
    setNewLabel("");
  };

  const patch = (status: DemandStatus, changes: Partial<DemandStatus>) => {
    upsertStatus({ ...status, ...changes });
  };

  return (
    <DialogShell isOpen={isOpen} onClose={onClose} title="Gerenciar status" maxWidth="640px">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          A ordem define as colunas do Kanban. A categoria <strong>Concluído</strong> é a que o
          checkbox da lista usa para marcar uma demanda como feita — mantenha ao menos um status
          nessa categoria.
        </p>

        {statuses.map((status, index) => {
          const inUse = demands.filter((d) => d.status === status.id).length;

          return (
            <div
              key={status.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 10,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--color-surface-sunken)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  type="button"
                  aria-label="Mover para cima"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  style={iconButtonStyle(index === 0)}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  onClick={() => move(index, 1)}
                  disabled={index === statuses.length - 1}
                  style={iconButtonStyle(index === statuses.length - 1)}
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              <input
                type="color"
                value={status.color}
                onChange={(event) => patch(status, { color: event.target.value })}
                aria-label={`Cor de ${status.label}`}
                style={{
                  width: 30,
                  height: 30,
                  padding: 0,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "transparent",
                  cursor: "pointer",
                }}
              />

              <input
                defaultValue={status.label}
                onBlur={(event) => {
                  const label = event.target.value.trim();
                  if (label && label !== status.label) patch(status, { label });
                  else event.target.value = status.label;
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--color-surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              />

              <select
                value={status.category}
                onChange={(event) =>
                  patch(status, { category: event.target.value as DemandStatusCategory })
                }
                aria-label={`Categoria de ${status.label}`}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--color-surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>

              <span
                title={`${inUse} demanda(s) neste status`}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {inUse}
              </span>

              <button
                type="button"
                aria-label={`Excluir ${status.label}`}
                onClick={() => deleteStatus(status.id)}
                disabled={inUse > 0}
                title={inUse > 0 ? "Mova as demandas antes de excluir" : "Excluir status"}
                style={{
                  ...iconButtonStyle(inUse > 0),
                  color: inUse > 0 ? "var(--text-tertiary)" : "var(--color-danger)",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addStatus();
            }}
            placeholder="Nome do novo status…"
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--color-surface-sunken)",
              color: "var(--text-primary)",
              fontSize: "0.84rem",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            className="btn btn-accent"
            onClick={addStatus}
            disabled={!newLabel.trim()}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

function iconButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
    color: "var(--text-secondary)",
  };
}
