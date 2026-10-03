"use client";

import { useEffect, useState } from "react";
import { Maximize2, Trash2, X } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import { CONTENT_TYPES } from "@/lib/contentTypes";
import { CONTENT_CHANNELS } from "@/types/cronogramas";
import type { NewPlanItem } from "@/lib/contentPlans";
import type { Demand } from "@/types/demandas";

interface Props {
  mode: "create" | "edit";
  role: NewPlanItem["role"];
  demand?: Demand;
  defaultChannel?: string;
  onSubmit: (item: NewPlanItem) => Promise<void>;
  onOpenDetails?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-tertiary)",
};

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "5px 12px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.76rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        color: active ? "#fff" : "var(--text-secondary)",
        background: active ? color : "var(--color-surface-sunken)",
        border: `1px solid ${active ? color : "var(--border)"}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

/** Modal único para criar e editar um item do cronograma. */
export default function PlanItemModal({
  mode,
  role,
  demand,
  defaultChannel = "FEED",
  onSubmit,
  onOpenDetails,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(demand?.title ?? "");
  const [date, setDate] = useState(demand?.due_date ?? "");
  const [contentType, setContentType] = useState<string>(demand?.content_type ?? "");
  const [channel, setChannel] = useState(demand?.type ?? defaultChannel);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isPost = role === "post";
  const heading =
    mode === "edit"
      ? "Editar conteúdo"
      : role === "captacao"
        ? "Nova captação"
        : "Novo conteúdo";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        title,
        date: date || null,
        role,
        contentType: isPost ? contentType || null : null,
        channel: isPost ? channel || null : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!demand || !onDelete || saving) return;
    setSaving(true);
    try {
      await onDelete(demand.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="glass-card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: 22,
          borderRadius: 20,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Nome</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Ex.: Como combinar ácidos"
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--color-surface-sunken)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              fontFamily: "inherit",
            }}
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Data</span>
          <div>
            <DatePicker value={date || null} onChange={(value) => setDate(value ?? "")} />
          </div>
        </div>

        {isPost && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Formato</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CONTENT_TYPES.map((type) => (
                  <Chip
                    key={type.id}
                    active={contentType === type.id}
                    color={type.color}
                    onClick={() => setContentType(contentType === type.id ? "" : type.id)}
                  >
                    {type.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={labelStyle}>Canal</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CONTENT_CHANNELS.map((item) => (
                  <Chip
                    key={item.value}
                    active={channel === item.value}
                    color={item.color}
                    onClick={() => setChannel(item.value)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {mode === "edit" && demand && onOpenDetails && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onOpenDetails(demand.id)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Maximize2 size={13} /> Abrir detalhes
            </button>
          )}
          {mode === "edit" && demand && onDelete && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (confirmingDelete ? remove() : setConfirmingDelete(true))}
              onBlur={() => setConfirmingDelete(false)}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--color-danger, #e5484d)",
              }}
            >
              <Trash2 size={13} /> {confirmingDelete ? "Confirmar exclusão" : "Excluir"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!title.trim() || saving}>
            {mode === "edit" ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
