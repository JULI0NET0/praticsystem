"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, Unlink } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import { countPlanDemands } from "@/lib/contentPlans";

interface Props {
  isOpen: boolean;
  planTitle: string;
  planId: string | null;
  onClose: () => void;
  /** `deleteDemands` decide se as demandas vão junto ou ficam soltas. */
  onConfirm: (deleteDemands: boolean) => void;
}

/**
 * Exclusão de cronograma com as duas saídas explícitas.
 *
 * `CustomModal` não serve aqui: ele só tem confirmar/cancelar, e a diferença
 * entre apagar dezenas de demandas (com checklist, comentários e anexos) e
 * apenas soltá-las é grande demais para caber num "OK".
 */
export default function DeletePlanDialog({
  isOpen,
  planTitle,
  planId,
  onClose,
  onConfirm,
}: Props) {
  const [count, setCount] = useState<number | null>(null);

  // Busca a contagem real ao abrir: "apagar 14 demandas" pesa diferente de
  // um aviso genérico.
  useEffect(() => {
    if (!isOpen || !planId) return;
    let cancelled = false;
    countPlanDemands(planId).then((total) => {
      if (!cancelled) setCount(total);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, planId]);

  const label = count === null ? "as demandas" : `${count} demanda${count === 1 ? "" : "s"}`;

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir cronograma"
      maxWidth="520px"
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onConfirm(false)}>
            <Unlink size={15} /> Só o cronograma
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(true)}
            style={{
              background: "var(--color-danger)",
              color: "var(--color-text-on-danger)",
              border: "1px solid var(--color-danger)",
            }}
          >
            <Trash2 size={15} /> Apagar tudo
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--text-primary)" }}>
          Excluir <strong>{planTitle}</strong>, que tem {label}.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Option
            icon={<Unlink size={15} />}
            title="Só o cronograma"
            description={`As ${label} continuam em Demandas, sem vínculo com nenhum cronograma. Nada se perde.`}
          />
          <Option
            icon={<Trash2 size={15} color="var(--color-danger)" />}
            title="Apagar tudo"
            description={`Apaga o cronograma e as ${label}, junto com checklist, comentários e anexos de cada uma.`}
            danger
          />
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: 6,
            fontSize: "0.76rem",
            color: "var(--color-danger)",
          }}
        >
          <AlertTriangle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          As duas opções são definitivas — não há como desfazer.
        </span>
      </div>
    </DialogShell>
  );
}

function Option({
  icon,
  title,
  description,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 12,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${danger ? "var(--color-danger-wash)" : "var(--border)"}`,
        background: danger ? "var(--color-danger-wash)" : "var(--color-surface-sunken)",
      }}
    >
      <span style={{ marginTop: 2, flexShrink: 0, color: "var(--text-secondary)" }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {title}
        </span>
        <span style={{ fontSize: "0.78rem", lineHeight: 1.45, color: "var(--text-secondary)" }}>
          {description}
        </span>
      </div>
    </div>
  );
}
