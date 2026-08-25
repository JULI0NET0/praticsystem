"use client";

import { useState } from "react";
import DialogShell from "@/components/DialogShell";
import { useAuth } from "@/hooks/useAuth";
import { parseDueDateInput, formatDueDateLabel } from "@/lib/dueDate";
import {
  clientLabel,
  PRIORITY_LABELS,
  type Demand,
  type DemandPriority,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import AssigneePicker from "./AssigneePicker";

const PRIORITIES: DemandPriority[] = ["none", "low", "medium", "high", "urgent"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (demand: Demand) => void;
  /** Pré-seleção herdada dos filtros ativos. */
  defaultClientId?: string | null;
}

export default function NewDemandModal({
  isOpen,
  onClose,
  onCreated,
  defaultClientId,
}: Props) {
  const { currentUser } = useAuth();
  const { clients, statuses, createDemand } = useDemandas();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [statusId, setStatusId] = useState<string>("");
  const [priority, setPriority] = useState<DemandPriority>("none");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [allTeam, setAllTeam] = useState(false);
  const [dueText, setDueText] = useState("");
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reabrir sempre parte do zero, com quem criou já atribuído.
  // Ajuste durante o render (padrão do React para estado derivado de props),
  // em vez de um efeito com setState.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTitle("");
      setClientId(defaultClientId ?? "");
      setStatusId(statuses[0]?.id ?? "");
      setPriority("none");
      setAssigneeIds(currentUser ? [currentUser.id] : []);
      setAllTeam(false);
      setDueText("");
    }
  }

  const parsedDue = parseDueDateInput(dueText);
  const dueHint = dueText.trim()
    ? parsedDue
      ? formatDueDateLabel(parsedDue).label
      : "Não entendi essa data"
    : "";

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const created = await createDemand({
      title,
      client_id: clientId || null,
      status: statusId || undefined,
      priority,
      assignee_ids: allTeam ? [] : assigneeIds,
      assign_all_team: allTeam,
      due_date: parsedDue,
    });
    setSaving(false);

    if (created) {
      onCreated(created);
      onClose();
    }
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Nova demanda"
      maxWidth="560px"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={submit}
            disabled={!title.trim() || saving}
          >
            {saving ? "Criando…" : "Criar demanda"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Título">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="O que precisa ser feito?"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Cliente" hint="Deixe em branco para uma demanda interna/operacional.">
          <select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            style={inputStyle}
          >
            <option value="">Demanda interna (sem cliente)</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Status">
            <select
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              style={inputStyle}
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Prioridade">
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as DemandPriority)}
              style={inputStyle}
            >
              {PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {PRIORITY_LABELS[option]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Responsáveis">
          <AssigneePicker
            assigneeIds={assigneeIds}
            allTeam={allTeam}
            onChange={(ids, team) => {
              setAssigneeIds(ids);
              setAllTeam(team);
            }}
          />
        </FormField>

        <FormField
          label="Entrega"
          hint={dueHint || 'Escreva em texto: "hoje", "amanhã", "segunda", "03/09".'}
        >
          <input
            value={dueText}
            onChange={(event) => setDueText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="hoje, amanhã, segunda-feira, 03/09…"
            style={{
              ...inputStyle,
              color: parsedDue ? "var(--accent)" : "var(--text-primary)",
            }}
          />
        </FormField>
      </div>
    </DialogShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-primary)",
  fontSize: "0.86rem",
  fontWeight: 600,
  fontFamily: "inherit",
  outline: "none",
};

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{hint}</span>
      )}
    </label>
  );
}
