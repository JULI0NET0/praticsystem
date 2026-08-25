"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Demand } from "@/types/demandas";
import type { QuickParseResult } from "@/lib/quickParse";
import { useDemandas } from "./DemandasProvider";
import QuickAddInput from "./QuickAddInput";

interface Props {
  /** Valores herdados do grupo/coluna onde a linha aparece. */
  defaults?: Partial<Demand>;
  placeholder?: string;
  onCreated?: (demand: Demand) => void;
}

/**
 * Adição rápida: um campo só, com os atalhos do título fazendo o
 * trabalho dos formulários (#cliente, @responsável, P1, data, hora).
 * O responsável padrão é quem está criando (regra em createDemand).
 */
export default function QuickAddRow({ defaults, placeholder, onCreated }: Props) {
  const { createDemand, filters } = useDemandas();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (parsed: QuickParseResult) => {
    if (!parsed.title.trim() || saving) return;

    setSaving(true);
    const created = await createDemand({
      ...defaults,
      title: parsed.title,
      // O que veio escrito no título vence o padrão do grupo/coluna
      due_date: parsed.dueDate ?? defaults?.due_date ?? null,
      due_time: parsed.dueTime ?? null,
      priority: parsed.priority ?? undefined,
      client_id: parsed.clientId ?? defaults?.client_id ?? filters.clientId ?? null,
      assignee_ids: parsed.assigneeIds.length ? parsed.assigneeIds : undefined,
    });
    setSaving(false);

    if (created) {
      setValue("");
      onCreated?.(created);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px dashed var(--border)",
        background: "var(--color-surface-sunken)",
      }}
    >
      <Plus size={15} color="var(--text-tertiary)" style={{ marginTop: 3, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <QuickAddInput
          value={value}
          onChange={setValue}
          onSubmit={submit}
          placeholder={placeholder ?? "Adicionar demanda…"}
          showHint={value.trim().length > 0}
        />
      </div>
    </div>
  );
}
