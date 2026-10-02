"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import { CONTENT_TYPES } from "@/lib/contentTypes";
import { CONTENT_CHANNELS } from "@/types/cronogramas";
import type { NewPlanItem } from "@/lib/contentPlans";

interface Props {
  role: NewPlanItem["role"];
  defaultChannel?: string;
  onSubmit: (item: NewPlanItem) => Promise<void>;
  onCancel: () => void;
}

const fieldStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-primary)",
  fontSize: "0.8rem",
  fontFamily: "inherit",
};

/** Formulário compacto para acrescentar um conteúdo ao cronograma. */
export default function AddPlanItemForm({ role, defaultChannel = "FEED", onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [channel, setChannel] = useState(defaultChannel);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        title,
        date: date || null,
        role,
        contentType: contentType || null,
        channel: role === "post" ? channel : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        padding: 10,
        borderRadius: 10,
        border: "1px dashed var(--border)",
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
          if (event.key === "Escape") onCancel();
        }}
        placeholder="Nome do conteúdo…"
        style={{ ...fieldStyle, flex: "1 1 220px" }}
      />
      <DatePicker value={date || null} onChange={(value) => setDate(value ?? "")} />
      {role === "post" && (
        <>
          <select value={contentType} onChange={(event) => setContentType(event.target.value)} style={fieldStyle}>
            <option value="">Formato</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} style={fieldStyle}>
            {CONTENT_CHANNELS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={submit} disabled={!title.trim() || saving}>
        <Plus size={13} /> Adicionar
      </button>
      <button type="button" className="btn btn-secondary" onClick={onCancel} aria-label="Cancelar">
        <X size={13} />
      </button>
    </div>
  );
}
