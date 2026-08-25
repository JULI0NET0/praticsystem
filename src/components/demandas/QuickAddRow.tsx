"use client";

import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { parseDueDateInput, formatDueDateLabel } from "@/lib/dueDate";
import type { Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";

interface Props {
  /** Valores herdados do grupo/coluna onde a linha aparece. */
  defaults?: Partial<Demand>;
  placeholder?: string;
  onCreated?: (demand: Demand) => void;
}

/**
 * Adição rápida: título + prazo escrito à mão ("amanhã", "segunda", "03/09").
 * O responsável padrão é quem está criando (regra definida em createDemand).
 */
export default function QuickAddRow({
  defaults,
  placeholder = "Adicionar demanda…",
  onCreated,
}: Props) {
  const { createDemand, filters } = useDemandas();
  const [title, setTitle] = useState("");
  const [dueText, setDueText] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedDue = parseDueDateInput(dueText);
  const dueHint = dueText.trim()
    ? parsedDue
      ? formatDueDateLabel(parsedDue).label
      : "não entendi"
    : "";

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    const created = await createDemand({
      ...defaults,
      title: trimmed,
      due_date: parsedDue ?? defaults?.due_date ?? null,
      // Respeita o filtro de cliente ativo, para não criar solto
      client_id: defaults?.client_id ?? filters.clientId ?? null,
    });
    setSaving(false);

    if (created) {
      setTitle("");
      setDueText("");
      onCreated?.(created);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px dashed var(--border)",
        background: "var(--color-surface-sunken)",
      }}
    >
      <Plus size={15} color="var(--text-tertiary)" />

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") {
            setTitle("");
            setDueText("");
          }
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <CalendarClock size={13} color="var(--text-tertiary)" />
        <input
          value={dueText}
          onChange={(event) => setDueText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="prazo"
          title='Aceita "hoje", "amanhã", "segunda", "03/09"'
          style={{
            width: 84,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: "0.76rem",
            fontWeight: 600,
            color: parsedDue ? "var(--accent)" : "var(--text-secondary)",
          }}
        />
        {dueHint && (
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: parsedDue ? "var(--accent)" : "var(--text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {dueHint}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!title.trim() || saving}
        className="btn btn-sm btn-accent"
        style={{ opacity: title.trim() ? 1 : 0.4 }}
      >
        Adicionar
      </button>
    </div>
  );
}
