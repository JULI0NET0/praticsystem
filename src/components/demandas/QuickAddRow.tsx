"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { clientLabel, type Demand } from "@/types/demandas";
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
  const { createDemand, filters, clients } = useDemandas();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (parsed: QuickParseResult) => {
    if (!parsed.title.trim() || saving) return;

    let title = parsed.title.trim();
    const resolvedClientId = parsed.clientId ?? defaults?.client_id ?? filters.clientId ?? null;

    if (resolvedClientId && typeof window !== "undefined") {
      try {
        if (window.localStorage.getItem("pratic-demandas-append-client-title") === "true") {
          const client = clients.find((c) => c.id === resolvedClientId);
          if (client) {
            const cLabel = clientLabel(client);
            const lowerTitle = title.toLowerCase();
            const lowerLabel = cLabel.toLowerCase();
            const lowerName = (client.name || "").toLowerCase();
            if (!lowerTitle.includes(lowerLabel) && (!lowerName || !lowerTitle.includes(lowerName))) {
              title = `${title} - ${cLabel}`;
            }
          }
        }
      } catch {}
    }

    setSaving(true);
    const created = await createDemand({
      ...defaults,
      title,
      // O que veio escrito no título vence o padrão do grupo/coluna
      due_date: parsed.dueDate ?? defaults?.due_date ?? null,
      due_time: parsed.dueTime ?? null,
      priority: parsed.priority ?? defaults?.priority ?? undefined,
      client_id: resolvedClientId,
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
