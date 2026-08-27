"use client";

import { useMemo, useState } from "react";
import { Building2, Calendar, Lock } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import DatePicker from "@/components/ui/DatePicker";
import { useAuth } from "@/hooks/useAuth";
import { formatDueDateLabel } from "@/lib/dueDate";
import { DEMAND_AGENDA_SUBJECTS } from "@/lib/agendaCategories";
import { parseQuickInput, type QuickCatalogs, type QuickParseResult } from "@/lib/quickParse";
import {
  clientLabel,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  type AgendaSubject,
  type Demand,
  type DemandPriority,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import AssigneePicker from "./AssigneePicker";
import QuickAddInput from "./QuickAddInput";
import { PriorityFlag } from "./PriorityFlag";

const PRIORITIES: DemandPriority[] = ["none", "low", "medium", "high", "urgent"];

/** Campos que o usuário mexeu à mão — o texto do título não os sobrescreve. */
type TouchedField = "client" | "assignees" | "priority" | "due";

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
  const { clients, users, statuses, createDemand } = useDemandas();

  const [text, setText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string>("");
  const [priority, setPriority] = useState<DemandPriority>("none");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [allTeam, setAllTeam] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  // "demand" é o padrão: toda demanda nova aparece na agenda pessoal de quem
  // é responsável, a menos que a pessoa escolha "Não aparece na agenda".
  const [agendaSubject, setAgendaSubject] = useState<AgendaSubject | null>("demand");
  const [touched, setTouched] = useState<Set<TouchedField>>(new Set());
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reabrir sempre parte do zero, com quem criou já atribuído.
  // Ajuste durante o render (padrão do React para estado derivado de props).
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setText("");
      setClientId(defaultClientId ?? null);
      setStatusId(statuses[0]?.id ?? "");
      setPriority("none");
      setAssigneeIds(currentUser ? [currentUser.id] : []);
      setAllTeam(false);
      setDueDate("");
      setDueTime("");
      setAgendaSubject("demand");
      setTouched(new Set());
      setSaving(false);
    }
  }

  const touch = (field: TouchedField) =>
    setTouched((current) => new Set(current).add(field));

  const catalogs = useMemo<QuickCatalogs>(
    () => ({
      clients: clients.map((client) => ({
        id: client.id,
        label: clientLabel(client),
        alias: client.name,
      })),
      users: users.map((user) => ({
        id: user.id,
        label: user.username || user.name || user.email,
        alias: user.name,
      })),
    }),
    [clients, users],
  );

  // Prévia ao vivo do que o título já resolve — o mesmo parser do submit
  const parsed = useMemo(() => parseQuickInput(text, catalogs), [text, catalogs]);

  /** O que foi escrito no título vence, salvo onde o usuário mexeu à mão. */
  const resolve = (result: QuickParseResult) => ({
    clientId: touched.has("client") ? clientId : (result.clientId ?? clientId),
    priority: touched.has("priority") ? priority : (result.priority ?? priority),
    assigneeIds: touched.has("assignees")
      ? assigneeIds
      : result.assigneeIds.length
        ? result.assigneeIds
        : assigneeIds,
    dueDate: touched.has("due") ? dueDate || null : (result.dueDate ?? (dueDate || null)),
    dueTime: touched.has("due") ? dueTime || null : (result.dueTime ?? (dueTime || null)),
  });

  const submit = async (result: QuickParseResult) => {
    if (!result.title.trim() || saving) return;
    const merged = resolve(result);

    setSaving(true);
    const created = await createDemand({
      title: result.title,
      client_id: merged.clientId,
      status: statusId || undefined,
      priority: merged.priority,
      assignee_ids: allTeam ? [] : merged.assigneeIds,
      assign_all_team: allTeam,
      due_date: merged.dueDate,
      due_time: merged.dueTime,
      agenda_subject: agendaSubject,
    });
    setSaving(false);

    if (created) {
      onCreated(created);
      onClose();
    }
  };

  const statusOptions = useMemo<ComboboxOption[]>(
    () => statuses.map((status) => ({ value: status.id, label: status.label, color: status.color })),
    [statuses],
  );

  const clientOptions = useMemo<ComboboxOption[]>(
    () => {
      const active = clients.filter((c) => !c.status || c.status === "active" || c.status === "prospect");
      const inactive = clients.filter((c) => c.status === "inactive");

      return [
        ...active.map((client) => ({
          value: client.id,
          label: clientLabel(client),
          keywords: client.name,
          icon: <Building2 size={14} />,
        })),
        ...inactive.map((client) => ({
          value: client.id,
          label: `${clientLabel(client)} (Inativo)`,
          description: "Cliente inativo",
          keywords: `${client.name} inativo`,
          icon: <Building2 size={14} style={{ opacity: 0.6 }} />,
        })),
      ];
    },
    [clients],
  );

  const priorityOptions = useMemo<ComboboxOption[]>(
    () =>
      PRIORITIES.map((option) => ({
        value: option,
        label: PRIORITY_LABELS[option],
        icon: <PriorityFlag priority={option} size={13} />,
      })),
    [],
  );

  const agendaSubjectOptions = useMemo<ComboboxOption[]>(
    () =>
      DEMAND_AGENDA_SUBJECTS.map((subject) => ({
        value: subject.id,
        label: subject.label,
        icon: <subject.icon size={14} color={subject.color} />,
      })),
    [],
  );

  // O que os campos mostram: a resolução ao vivo, para o usuário ver o
  // efeito do que digitou antes de salvar.
  const effective = resolve(parsed);

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Nova demanda"
      maxWidth="620px"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => submit(parsed)}
            disabled={!parsed.title.trim() || saving}
          >
            {saving ? "Criando…" : "Criar demanda"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <FormField label="O que precisa ser feito?">
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--color-surface-sunken)",
            }}
          >
            <QuickAddInput
              value={text}
              onChange={setText}
              onSubmit={submit}
              autoFocus
            />
          </div>
        </FormField>

        <div className="new-demand-fields-grid">
          <FormField label="Cliente">
            <Combobox
              value={effective.clientId}
              onChange={(value) => {
                touch("client");
                setClientId(value);
              }}
              options={clientOptions}
              ariaLabel="Cliente"
              searchPlaceholder="Buscar cliente…"
              clearOption={{ label: "Demanda interna", icon: <Lock size={14} /> }}
            />
          </FormField>

          <FormField label="Status">
            <Combobox
              value={statusId}
              onChange={(value) => setStatusId(value ?? "")}
              options={statusOptions}
              ariaLabel="Status"
            />
          </FormField>

          <FormField label="Prioridade">
            <Combobox
              value={effective.priority}
              onChange={(value) => {
                touch("priority");
                setPriority((value as DemandPriority) ?? "none");
              }}
              options={priorityOptions}
              ariaLabel="Prioridade"
              renderTrigger={({ selected }) => (
                <>
                  <PriorityFlag priority={effective.priority} size={13} />
                  <span
                    className="combobox-trigger-label"
                    style={{ color: PRIORITY_COLORS[effective.priority] }}
                  >
                    {selected[0]?.label ?? PRIORITY_LABELS[effective.priority]}
                  </span>
                </>
              )}
            />
          </FormField>

          <FormField label="Responsáveis">
            <AssigneePicker
              assigneeIds={effective.assigneeIds}
              allTeam={allTeam}
              onChange={(ids, team) => {
                touch("assignees");
                setAssigneeIds(ids);
                setAllTeam(team);
              }}
            />
          </FormField>

          <FormField label="Assunto na agenda">
            <Combobox
              value={agendaSubject}
              onChange={(value) => setAgendaSubject(value as AgendaSubject | null)}
              options={agendaSubjectOptions}
              ariaLabel="Assunto na Agenda"
              clearOption={{ label: "Não aparece na agenda", icon: <Calendar size={14} /> }}
            />
          </FormField>
        </div>

        <FormField
          label="Entrega"
          hint={
            effective.dueDate
              ? `Prazo: ${formatDueDateLabel(effective.dueDate).label}${
                  effective.dueTime ? ` às ${effective.dueTime}` : ""
                }`
              : "Sem prazo. Dá para escrever no título: “sexta”, “amanhã”, “03/09”, “14h”."
          }
        >
          <DatePicker
            value={effective.dueDate ?? null}
            timeValue={effective.dueTime ?? null}
            onChange={(d, t) => {
              touch("due");
              setDueDate(d ?? "");
              if (t !== undefined) setDueTime(t ?? "");
            }}
            withTime={true}
            clearable={true}
            placeholder="Definir prazo de entrega"
          />
        </FormField>
      </div>
    </DialogShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-primary)",
  fontSize: "0.84rem",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span
        style={{
          fontSize: "0.68rem",
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
    </div>
  );
}
