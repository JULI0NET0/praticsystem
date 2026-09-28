"use client";

import { useMemo } from "react";
import { Shield, ShieldOff, X } from "lucide-react";
import Combobox from "@/components/ui/Combobox";
import { AGENDA_CATEGORIES } from "@/lib/agendaCategories";
import { tint } from "@/lib/tint";

export interface EventFormData {
  title: string;
  type: string;
  /** Horário local no formato do <input type="datetime-local">: YYYY-MM-DDTHH:mm. */
  date: string;
  client_id: string;
  visibility: "public" | "private";
  status: string;
  description: string;
}

export interface AgendaClient {
  id: string;
  name: string;
  nome_fantasia?: string | null;
  status?: string | null;
}

interface EventFormFieldsProps {
  value: EventFormData;
  onChange: (next: EventFormData) => void;
  clients: AgendaClient[];
  autoFocusTitle?: boolean;
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: "var(--text-caption)",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
} as const;

/** Assuntos que o usuário pode escolher — Pagamento vem das faturas, não daqui. */
const SELECTABLE_CATEGORIES = AGENDA_CATEGORIES.filter((c) => c.id !== "payment");

export function EventFormFields({ value, onChange, clients, autoFocusTitle }: EventFormFieldsProps) {
  const [datePart = "", timePart = "10:00"] = value.date.split("T");
  const set = <K extends keyof EventFormData>(key: K, next: EventFormData[K]) =>
    onChange({ ...value, [key]: next });

  const clientOptions = useMemo(
    () =>
      clients
        .filter((c) => !c.status || c.status === "active" || c.status === "prospect" || c.id === value.client_id)
        .map((c) => ({
          value: c.id,
          label: `${c.nome_fantasia || c.name}${c.status === "inactive" ? " (inativo)" : ""}`,
          keywords: c.name,
        })),
    [clients, value.client_id],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <label style={labelStyle}>
        Título
        <input
          type="text"
          className="input-dark"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Reunião de alinhamento"
          autoFocus={autoFocusTitle}
        />
      </label>

      <div role="group" aria-label="Assunto" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={labelStyle}>Assunto</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SELECTABLE_CATEGORIES.map((category) => {
            const active = value.type === category.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => set("type", category.id)}
                style={{
                  minHeight: 40,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? category.color : "var(--color-border-subtle)"}`,
                  background: active ? tint(category.color, 12) : "var(--color-surface-raised)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--text-ui)",
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: category.color }} />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 10 }}>
        <label style={labelStyle}>
          Data
          <input
            type="date"
            className="input-dark"
            value={datePart}
            onChange={(e) => e.target.value && set("date", `${e.target.value}T${timePart}`)}
          />
        </label>
        <label style={labelStyle}>
          Horário
          <input
            type="time"
            className="input-dark"
            value={timePart}
            onChange={(e) => e.target.value && set("date", `${datePart}T${e.target.value}`)}
          />
        </label>
      </div>

      <div style={labelStyle}>
        Cliente (opcional)
        <Combobox
          value={value.client_id || null}
          onChange={(next) => set("client_id", next ?? "")}
          options={clientOptions}
          ariaLabel="Cliente"
          placeholder="Nenhum"
          searchPlaceholder="Buscar cliente…"
          clearOption={{ label: "Nenhum" }}
        />
      </div>

      <label style={labelStyle}>
        Observações
        <textarea
          className="input-dark"
          rows={3}
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Adicione detalhes"
          style={{ resize: "none" }}
        />
      </label>

      <VisibilitySwitch
        isPublic={value.visibility === "public"}
        onChange={(isPublic) => set("visibility", isPublic ? "public" : "private")}
      />
    </div>
  );
}

interface EventFormPanelProps extends EventFormFieldsProps {
  isEditing: boolean;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Cabeçalho, campos e rodapé do formulário. O corpo rola; título e botões
 * ficam fixos — no popover do desktop e na gaveta do mobile.
 */
export function EventFormPanel({ isEditing, saving, onSubmit, onCancel, ...fields }: EventFormPanelProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 8px 20px",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "var(--text-h3)", fontWeight: 700 }}>
          {isEditing ? "Editar compromisso" : "Novo compromisso"}
        </h2>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onCancel} aria-label="Fechar" style={{ width: 44, height: 44 }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20 }}>
        <EventFormFields {...fields} />
      </div>
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 10,
          padding: "12px 20px 16px",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, minHeight: 44 }}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-accent" disabled={saving} style={{ flex: 2, minHeight: 44 }}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar compromisso"}
        </button>
      </div>
    </form>
  );
}

function VisibilitySwitch({ isPublic, onChange }: { isPublic: boolean; onChange: (isPublic: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublic}
      onClick={() => onChange(!isPublic)}
      style={{
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        textAlign: "left",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--color-border-subtle)",
        background: "var(--color-surface-raised)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
      }}
    >
      {isPublic ? (
        <Shield size={18} color="var(--color-success)" aria-hidden="true" />
      ) : (
        <ShieldOff size={18} color="var(--color-text-tertiary)" aria-hidden="true" />
      )}
      <span style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "var(--text-body)", fontWeight: 600 }}>
          {isPublic ? "Visível para a equipe" : "Só para mim"}
        </span>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--color-text-secondary)" }}>
          {isPublic ? "Também envia para o Google Agenda" : "Não vai para o Google Agenda"}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 26,
          boxSizing: "border-box",
          padding: 3,
          borderRadius: 999,
          display: "flex",
          justifyContent: isPublic ? "flex-end" : "flex-start",
          background: isPublic ? "var(--color-terracotta)" : "var(--color-border-subtle)",
          transition: "background var(--duration-fast) var(--ease-standard)",
        }}
      >
        <span style={{ width: 20, height: 20, borderRadius: 999, background: "#ffffff" }} />
      </span>
    </button>
  );
}
