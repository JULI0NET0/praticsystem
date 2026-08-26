"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarRange, Info, ListPlus, PenLine, Video } from "lucide-react";
import DialogShell from "@/components/DialogShell";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/CustomToast";
import { formatMonthRef, toISODateLocal } from "@/lib/contentSchedule";
import { createContentPlan, fetchContractHint, resolvePlanItems } from "@/lib/contentPlans";
import { CONTENT_TYPES, getContentType } from "@/lib/contentTypes";
import { DEFAULT_TITLE_TEMPLATES, TITLE_VARIABLES } from "@/lib/titleTemplate";
import { formatDueDateLabel } from "@/lib/dueDate";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import {
  channelColor,
  CONTENT_CHANNELS,
  WEEKDAY_LABELS,
  type ContentPlan,
  type ContentPlanDraft,
  type ContentPlanItemDraft,
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
    firstDate: "",
    contentTypes: ["video"],
    scriptLeadDays: 3,
    postTitleTemplate: DEFAULT_TITLE_TEMPLATES.post,
    captureTitleTemplate: DEFAULT_TITLE_TEMPLATES.captura,
    scriptTitleTemplate: DEFAULT_TITLE_TEMPLATES.roteiro,
    contentTemplateId: null,
    captureTemplateId: null,
    scriptTemplateId: null,
    includeCapture: false,
    captureFrequency: null,
  };
}

/** "terça-feira, 09/09" — confirma de olho qual ocorrência foi escolhida. */
function describeDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${weekday}, ${match[3]}/${match[2]}`;
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
  /** Formato escolhido à mão, indexado pela data. Data que sai do período
   *  perde o override sozinha — não há estado obsoleto para limpar. */
  const [typeOverrides, setTypeOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  // Reabrir parte do zero — ajuste durante o render, não em efeito
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDraft(emptyDraft());
      setHint(null);
      setTypeOverrides({});
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

  const selectedClientName = clientLabel(
    clients.find((item) => item.id === draft.clientId),
  );

  // A prévia e a criação olham para a MESMA lista: o que está na tela é
  // literalmente o que será gravado.
  const items = useMemo(
    () => resolvePlanItems(draft, selectedClientName || "Cliente", typeOverrides),
    [draft, selectedClientName, typeOverrides],
  );

  const postItems = items.filter((item) => item.role === "post");
  const productionItems = items.filter((item) => item.role !== "post");

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

  const toggleContentType = (type: string) =>
    patch({
      contentTypes: draft.contentTypes.includes(type)
        ? draft.contentTypes.filter((current) => current !== type)
        : [...draft.contentTypes, type],
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
      const { plan, created } = await createContentPlan(
        draft,
        currentUser.id,
        initialStatus,
        items,
      );
      showToast(`Cronograma criado com ${created} demandas.`, "success");
      onCreated(plan);
      onClose();
    } catch (err) {
      showToast("Erro ao criar cronograma: " + ((err as Error)?.message ?? ""), "error");
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.length;

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
              ? `${postItems.length} posts${
                  productionItems.length ? ` · ${productionItems.length} roteiro/captação` : ""
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

        <Field
          label="Primeira publicação"
          hint={
            draft.firstDate
              ? `Nada antes de ${describeDate(draft.firstDate)} será gerado.`
              : "Em branco, começa no início do período."
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="date"
              value={draft.firstDate}
              onChange={(event) => patch({ firstDate: event.target.value })}
              aria-label="Primeira publicação"
              style={{ ...inputStyle, width: 170 }}
            />
            {draft.firstDate && (
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)" }}>
                {describeDate(draft.firstDate)}
              </span>
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

        <Field label="Formatos" hint="Distribuídos em rodízio entre os posts, junto com os canais.">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CONTENT_TYPES.map((type) => {
              const active = draft.contentTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleContentType(type.id)}
                  aria-pressed={active}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 11px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    color: active ? "#fff" : "var(--text-secondary)",
                    background: active ? type.color : "var(--color-surface-sunken)",
                    border: `1px solid ${active ? type.color : "var(--border)"}`,
                  }}
                >
                  <type.icon size={12} />
                  {type.label}
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

        {/* Nomes gerados — prévia ao vivo do primeiro de cada trilha */}
        <Field
          label="Nomes das demandas"
          hint={TITLE_VARIABLES.map((variable) => variable.token).join("  ")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <TemplateField
              label="Post"
              value={draft.postTitleTemplate}
              preview={postItems[0]?.title ?? ""}
              onChange={(value) => patch({ postTitleTemplate: value })}
            />
            {draft.includeCapture && (
              <>
                <TemplateField
                  label="Roteiro"
                  value={draft.scriptTitleTemplate}
                  preview={items.find((item) => item.role === "roteiro")?.title ?? ""}
                  onChange={(value) => patch({ scriptTitleTemplate: value })}
                />
                <TemplateField
                  label="Captação"
                  value={draft.captureTitleTemplate}
                  preview={items.find((item) => item.role === "captacao")?.title ?? ""}
                  onChange={(value) => patch({ captureTitleTemplate: value })}
                />
              </>
            )}
          </div>
        </Field>

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

        {draft.includeCapture && (
          <Field
            label="Antecedência do roteiro"
            hint="Cada captação ganha um roteiro com este prazo antes dela."
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={0}
                max={30}
                value={draft.scriptLeadDays}
                onChange={(event) =>
                  patch({ scriptLeadDays: Math.max(0, Number(event.target.value) || 0) })
                }
                aria-label="Dias de antecedência do roteiro"
                style={{ ...inputStyle, width: 78 }}
              />
              <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
                dias antes da captação
              </span>
            </div>
          </Field>
        )}

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
                gap: 2,
                maxHeight: 260,
                overflowY: "auto",
                padding: 8,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--color-surface-sunken)",
              }}
            >
              {/* Ordem do processo: roteiro e captação, depois os posts */}
              {productionItems.map((item, index) => (
                <PreviewItem key={`${item.role}-${item.date}-${index}`} item={item} />
              ))}

              {postItems.map((item) => (
                <PreviewItem
                  key={`post-${item.date}`}
                  item={item}
                  onChangeType={(value) =>
                    setTypeOverrides((current) => {
                      const next = { ...current };
                      if (value) next[item.date] = value;
                      else delete next[item.date];
                      return next;
                    })
                  }
                />
              ))}
            </div>
          )}
        </Field>
      </div>
    </DialogShell>
  );
}

/**
 * Uma linha da prévia. Nos posts o formato é editável: trocar reescreve o
 * nome na hora, porque o nome já é derivado do template.
 */
function PreviewItem({
  item,
  onChangeType,
}: {
  item: ContentPlanItemDraft;
  onChangeType?: (value: string | null) => void;
}) {
  const type = getContentType(item.contentType);
  const RoleIcon =
    item.role === "roteiro" ? PenLine : item.role === "captacao" ? Video : CalendarRange;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 6px",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <RoleIcon size={12} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />

      <span
        style={{
          width: 52,
          flexShrink: 0,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
      </span>

      <span
        title={item.title}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.title}
      </span>

      {onChangeType ? (
        <Combobox
          value={item.contentType}
          onChange={onChangeType}
          options={CONTENT_TYPES.map((option) => ({
            value: option.id,
            label: option.label,
            color: option.color,
          }))}
          ariaLabel={`Formato de ${item.title}`}
          panelWidth={190}
          renderTrigger={({ selected }) => (
            <>
              {type ? <type.icon size={12} color={type.color} /> : null}
              <span
                className="combobox-trigger-label"
                style={type ? { color: type.color } : undefined}
              >
                {selected[0]?.label ?? "Formato"}
              </span>
            </>
          )}
          clearOption={{ label: "Sem formato" }}
        />
      ) : null}
    </div>
  );
}

function TemplateField({
  label,
  value,
  preview,
  onChange,
}: {
  label: string;
  value: string;
  preview: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 68,
          flexShrink: 0,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Template de nome — ${label}`}
        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
      />
      <span
        title={preview}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "0.74rem",
          fontWeight: 700,
          color: "var(--accent)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {preview || "—"}
      </span>
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
