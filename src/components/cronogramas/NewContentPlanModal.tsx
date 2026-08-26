"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarRange, Info, ListPlus, Video } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { formatMonthRef, toISODateLocal } from "@/lib/contentSchedule";
import { createContentPlan, fetchContractHint, previewPlan } from "@/lib/contentPlans";
import { formatDueDateLabel } from "@/lib/dueDate";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import {
  channelColor,
  CONTENT_CHANNELS,
  WEEKDAY_LABELS,
  type ContentPlan,
  type ContentPlanDraft,
  type ContractHint,
} from "@/types/cronogramas";
import { clientLabel } from "@/types/demandas";
import type { Weekday } from "@/lib/contentSchedule";

function currentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyDraft(): ContentPlanDraft {
  return {
    clientId: null,
    contractId: null,
    title: "",
    monthRef: currentMonthRef(),
    periodKind: "month",
    weeks: 4,
    startDate: toISODateLocal(new Date()),
    postsPerWeek: 3,
    weekdays: [1, 3, 5],
    channels: ["FEED"],
    contentTemplateId: null,
    captureTemplateId: null,
    includeCapture: false,
    captureFrequency: null,
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (plan: ContentPlan) => void;
}

export default function NewContentPlanModal({ isOpen, onClose, onCreated }: Props) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { clients, statuses, templates } = useDemandas();

  const [draft, setDraft] = useState<ContentPlanDraft>(emptyDraft);
  const [hint, setHint] = useState<ContractHint | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reabrir parte do zero — ajuste durante o render, não em efeito
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDraft(emptyDraft());
      setHint(null);
      setSaving(false);
    }
  }

  const patch = (changes: Partial<ContentPlanDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  /** Escolher o cliente puxa o contrato ativo e pré-preenche o que ele souber. */
  const chooseClient = async (clientId: string | null) => {
    patch({ clientId, contractId: null });
    setHint(null);
    if (!clientId) return;

    const contract = await fetchContractHint(clientId);
    if (!contract) return;

    setHint(contract);
    patch({
      contractId: contract.contractId,
      // O contrato é sugestão, não trava: tudo segue editável abaixo
      postsPerWeek: contract.postsPerWeek ?? draft.postsPerWeek,
      includeCapture: contract.contentCapture,
      captureFrequency: contract.captureFrequency,
    });
  };

  const preview = useMemo(() => previewPlan(draft), [draft]);

  const clientOptions = useMemo<ComboboxOption[]>(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: clientLabel(client),
        keywords: client.name,
        icon: <Building2 size={14} />,
      })),
    [clients],
  );

  const templateOptions = (kind: string) =>
    templates
      .filter((template) => template.kind === kind)
      .map((template) => ({
        value: template.id,
        label: template.name,
        description: template.description ?? undefined,
        icon: <ListPlus size={14} />,
      }));

  const toggleWeekday = (day: Weekday) =>
    patch({
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter((current) => current !== day)
        : [...draft.weekdays, day].sort((a, b) => a - b),
    });

  const toggleChannel = (channel: string) =>
    patch({
      channels: draft.channels.includes(channel)
        ? draft.channels.filter((current) => current !== channel)
        : [...draft.channels, channel],
    });

  const submit = async () => {
    if (!draft.clientId || !currentUser || saving) return;
    const initialStatus = statuses[0]?.id;
    if (!initialStatus) {
      showToast("Nenhum status configurado nas Demandas.", "error");
      return;
    }

    setSaving(true);
    try {
      const { plan, created } = await createContentPlan(draft, currentUser.id, initialStatus);
      showToast(`Cronograma criado com ${created} demandas.`, "success");
      onCreated(plan);
      onClose();
    } catch (err) {
      showToast("Erro ao criar cronograma: " + ((err as Error)?.message ?? ""), "error");
    } finally {
      setSaving(false);
    }
  };

  const totalItems = preview.postDates.length + preview.captureDates.length;

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Novo cronograma de conteúdo"
      maxWidth="680px"
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.76rem", color: "var(--text-tertiary)" }}>
            {totalItems > 0
              ? `${preview.postDates.length} posts${
                  preview.captureDates.length
                    ? ` · ${preview.captureDates.length} captações`
                    : ""
                }`
              : "Nenhuma data no período"}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={submit}
              disabled={!draft.clientId || totalItems === 0 || saving}
            >
              {saving ? "Gerando…" : `Gerar ${totalItems} demandas`}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Cliente">
          <Combobox
            value={draft.clientId}
            onChange={chooseClient}
            options={clientOptions}
            ariaLabel="Cliente do cronograma"
            searchPlaceholder="Buscar cliente…"
            placeholder="Escolha o cliente"
          />
          {hint && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.74rem",
                color: "var(--color-info-ink)",
              }}
            >
              <Info size={12} />
              Contrato: {hint.serviceName ?? "sem serviço"}
              {hint.postsPerWeek ? ` · ${hint.postsPerWeek} posts/semana` : ""}
              {hint.contentCapture ? ` · captação ${hint.captureFrequency ?? ""}` : ""}
            </span>
          )}
        </Field>

        <Field label="Título" hint="Em branco, vira “Cronograma de conteúdo”.">
          <input
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder={`Conteúdo ${formatMonthRef(draft.monthRef)}`}
            style={inputStyle}
          />
        </Field>

        {/* Período */}
        <Field label="Período">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="filter-tabs">
              <button
                type="button"
                className="filter-tab"
                data-active={draft.periodKind === "month" || undefined}
                onClick={() => patch({ periodKind: "month" })}
              >
                Mês fechado
              </button>
              <button
                type="button"
                className="filter-tab"
                data-active={draft.periodKind === "weeks" || undefined}
                onClick={() => patch({ periodKind: "weeks" })}
              >
                Por semanas
              </button>
            </div>

            {draft.periodKind === "month" ? (
              <input
                type="month"
                value={draft.monthRef}
                onChange={(event) => patch({ monthRef: event.target.value })}
                aria-label="Competência"
                style={{ ...inputStyle, width: 170 }}
              />
            ) : (
              <>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => patch({ startDate: event.target.value })}
                  aria-label="Início"
                  style={{ ...inputStyle, width: 160 }}
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={draft.weeks}
                  onChange={(event) => patch({ weeks: Number(event.target.value) || 1 })}
                  aria-label="Semanas"
                  style={{ ...inputStyle, width: 78 }}
                />
                <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>semanas</span>
              </>
            )}
          </div>
        </Field>

        {/* Cadência */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "start" }}>
          <Field label="Posts por semana">
            <input
              type="number"
              min={1}
              max={14}
              value={draft.postsPerWeek}
              onChange={(event) => patch({ postsPerWeek: Number(event.target.value) || 1 })}
              style={{ ...inputStyle, width: 82 }}
            />
          </Field>

          <Field label="Dias de publicação">
            <div style={{ display: "flex", gap: 5 }}>
              {WEEKDAY_LABELS.map((day) => {
                const active = draft.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    title={day.label}
                    aria-pressed={active}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent)" : "var(--color-surface-sunken)",
                      color: active ? "var(--color-text-on-accent)" : "var(--text-secondary)",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <Field label="Canais">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CONTENT_CHANNELS.map((channel) => {
              const active = draft.channels.includes(channel.value);
              return (
                <button
                  key={channel.value}
                  type="button"
                  onClick={() => toggleChannel(channel.value)}
                  aria-pressed={active}
                  style={{
                    padding: "5px 11px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    color: active ? "#fff" : "var(--text-secondary)",
                    background: active ? channelColor(channel.value) : "var(--color-surface-sunken)",
                    border: `1px solid ${active ? channelColor(channel.value) : "var(--border)"}`,
                  }}
                >
                  {channel.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Templates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Template dos posts">
            <Combobox
              value={draft.contentTemplateId}
              onChange={(value) => patch({ contentTemplateId: value })}
              options={templateOptions("conteudo")}
              ariaLabel="Template dos posts"
              clearOption={{ label: "Sem checklist", icon: <ListPlus size={14} /> }}
            />
          </Field>

          <Field label="Template das captações">
            <Combobox
              value={draft.captureTemplateId}
              onChange={(value) => patch({ captureTemplateId: value })}
              options={templateOptions("captacao")}
              ariaLabel="Template das captações"
              clearOption={{ label: "Sem checklist", icon: <ListPlus size={14} /> }}
            />
          </Field>
        </div>

        {/* Trilha de captação */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={draft.includeCapture}
            onChange={(event) => patch({ includeCapture: event.target.checked })}
          />
          <Video size={14} />
          Gerar também a trilha de captação
          {hint?.captureFrequency ? ` (${hint.captureFrequency})` : ""}
        </label>

        {/* Prévia — sem ela o erro só aparece depois de 12 demandas criadas */}
        <Field label="Prévia das datas">
          {totalItems === 0 ? (
            <span style={{ fontSize: "0.78rem", color: "var(--color-danger)" }}>
              Nenhuma data cai nos dias marcados. Revise o período ou os dias da semana.
            </span>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 160,
                overflowY: "auto",
                padding: 10,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--color-surface-sunken)",
              }}
            >
              <PreviewRow
                icon={<CalendarRange size={12} />}
                label="Posts"
                dates={preview.postDates}
              />
              {preview.captureDates.length > 0 && (
                <PreviewRow
                  icon={<Video size={12} />}
                  label="Captações"
                  dates={preview.captureDates}
                />
              )}
            </div>
          )}
        </Field>
      </div>
    </DialogShell>
  );
}

function PreviewRow({
  icon,
  label,
  dates,
}: {
  icon: React.ReactNode;
  label: string;
  dates: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.68rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-tertiary)",
        }}
      >
        {icon} {label} · {dates.length}
      </span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {dates.map((date) => (
          <span
            key={date}
            style={{
              padding: "2px 8px",
              borderRadius: "var(--radius-badge)",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--border)",
              whiteSpace: "nowrap",
            }}
          >
            {formatDueDateLabel(date).label}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
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

function Field({
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
      {hint && <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{hint}</span>}
    </div>
  );
}
