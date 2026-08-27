"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CalendarClock,
  CalendarRange,
  Clapperboard,
  ListChecks,
  Lock,
  MessageSquare,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { CONTENT_TYPES, getContentType } from "@/lib/contentTypes";
import { GoogleIcon } from "@/components/SocialIcons";
import { DEMAND_AGENDA_SUBJECTS, getAgendaCategory } from "@/lib/agendaCategories";
import {
  clientLabel,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  type AgendaSubject,
  type Demand,
  type DemandPriority,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import AssigneePicker from "./AssigneePicker";
import AttachmentList from "./AttachmentList";
import CommentThread from "./CommentThread";
import ChecklistSection from "./ChecklistSection";
import { PriorityFlag } from "./PriorityFlag";

// TipTap não roda no servidor — mesmo tratamento de src/app/admin/notas/[id]
const BlockEditor = dynamic(() => import("@/components/notas/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "16px 0", color: "var(--text-tertiary)", fontSize: "0.84rem" }}>
      Carregando editor…
    </div>
  ),
});

const PRIORITIES: DemandPriority[] = ["none", "low", "medium", "high", "urgent"];

/** Descrição salva com atraso, para não gravar a cada tecla (igual às Notas). */
const DESCRIPTION_SAVE_DELAY = 900;

interface Props {
  demandId: string | null;
  onClose: () => void;
}

/**
 * Detalhe da demanda numa caixa centralizada, estilo Notion — larga o
 * bastante para descrição e comentários respirarem lado a lado das
 * propriedades, e mais próxima da linguagem do resto da aplicação do
 * que o slide-over lateral que havia aqui antes.
 */
export default function DemandModal({ demandId, onClose }: Props) {
  const {
    getDemand,
    getStatus,
    statuses,
    clients,
    updateDemand,
    deleteDemand,
    loadDetails,
  } = useDemandas();
  const { confirm } = useConfirm();

  const [titleDraft, setTitleDraft] = useState("");
  // Guarda de QUAL demanda e de QUAL título o rascunho veio.
  const [syncedFrom, setSyncedFrom] = useState<{ id: string | null; title: string }>({
    id: null,
    title: "",
  });
  const loadedFor = useRef<string | null>(null);
  const descriptionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const demand = demandId ? getDemand(demandId) : undefined;
  const isOpen = !!demand;
  const storedTitle = demand?.title ?? "";

  // Ressincroniza o rascunho ao trocar de demanda E quando o título guardado
  // muda. A segunda condição é o que importa em `/admin/demandas?d=<id>`:
  // ali o modal renderiza antes de `demands` carregar, e uma guarda só pelo
  // id deixaria o campo vazio para sempre. Digitar não dispara nada — só
  // `titleDraft` muda, e `storedTitle` continua igual ao sincronizado.
  if (demandId !== syncedFrom.id || storedTitle !== syncedFrom.title) {
    setSyncedFrom({ id: demandId, title: storedTitle });
    setTitleDraft(storedTitle);
  }

  // Carrega comentários e anexos uma vez por demanda aberta
  useEffect(() => {
    if (!demandId) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === demandId) return;
    loadedFor.current = demandId;
    loadDetails(demandId);
  }, [demandId, loadDetails]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    // Trava o scroll do fundo enquanto o modal está aberto
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    };
  }, []);

  // A textarea cresce com o conteúdo. Além de acomodar títulos longos, isto
  // fixa uma altura explícita — sem ela o elemento fica à mercê do flex do
  // corpo rolável, que o comprimia até sumir.
  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [titleDraft, isOpen]);

  const statusOptions = useMemo<ComboboxOption[]>(
    () => statuses.map((status) => ({ value: status.id, label: status.label, color: status.color })),
    [statuses],
  );

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

  const contentTypeOptions = useMemo<ComboboxOption[]>(
    () =>
      CONTENT_TYPES.map((type) => ({
        value: type.id,
        label: type.label,
        color: type.color,
      })),
    [],
  );

  const priorityOptions = useMemo<ComboboxOption[]>(
    () =>
      PRIORITIES.map((priority) => ({
        value: priority,
        label: PRIORITY_LABELS[priority],
        icon: <PriorityFlag priority={priority} size={13} />,
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

  if (typeof document === "undefined") return null;

  const scheduleDescriptionSave = (id: string, content: unknown) => {
    if (descriptionTimer.current) clearTimeout(descriptionTimer.current);
    descriptionTimer.current = setTimeout(() => {
      updateDemand(id, { description: content as Record<string, unknown> });
    }, DESCRIPTION_SAVE_DELAY);
  };

  const status = demand ? getStatus(demand.status) : undefined;

  const commitTitle = () => {
    if (!demand) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === demand.title) {
      setTitleDraft(demand.title);
      return;
    }
    updateDemand(demand.id, { title: trimmed });
  };

  const handleDelete = async () => {
    if (!demand) return;
    const ok = await confirm({
      title: "Excluir demanda",
      message: `Excluir a demanda "${demand.title}"?`,
      variant: "danger",
      confirmText: "Excluir",
    });
    if (!ok) return;
    deleteDemand(demand.id);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && demand && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(12px, 4vh, 48px) clamp(12px, 4vw, 48px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "var(--color-scrim)" }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={demand.title}
            className="demand-modal-container"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              width: "min(70vw, 1040px)",
              maxWidth: "100%",
              maxHeight: "min(86vh, 100%)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: "var(--radius-lg, 16px)",
              background: "var(--color-surface-raised)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Barra superior */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Criada em{" "}
                {new Date(demand.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                {demand.completed_at &&
                  ` · concluída em ${new Date(demand.completed_at).toLocaleDateString("pt-BR")}`}
              </span>

              {/* Volta para o cronograma que gerou esta demanda */}
              {demand.plan_id && (
                <Link
                  href={`/admin/cronogramas/${demand.plan_id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: "var(--radius-badge)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    color: "var(--accent)",
                    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <CalendarRange size={11} />
                  {demand.plan_role === "captacao" ? "Captação" : "Cronograma"}
                </Link>
              )}

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  aria-label="Excluir demanda"
                  onClick={handleDelete}
                  style={iconButtonStyle("var(--color-danger)")}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={onClose}
                  style={iconButtonStyle("var(--text-secondary)")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Corpo rolável */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "22px clamp(18px, 3vw, 34px) 28px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <textarea
                ref={titleRef}
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    (event.target as HTMLTextAreaElement).blur();
                  }
                }}
                rows={1}
                aria-label="Título da demanda"
                style={{
                  width: "100%",
                  resize: "none",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "clamp(1.25rem, 2.4vw, 1.6rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  padding: 0,
                  overflow: "hidden",
                  // Itens de flex encolhem por padrão; sem isto a textarea
                  // era comprimida a zero pelos irmãos altos abaixo.
                  flexShrink: 0,
                  minHeight: "1.3em",
                }}
              />

              {/* Cabeçalho em duas linhas: identidade na primeira,
                  tempo e urgência na segunda. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Combobox
                    value={demand.client_id}
                    onChange={(value) => updateDemand(demand.id, { client_id: value })}
                    options={clientOptions}
                    ariaLabel="Cliente"
                    searchPlaceholder="Buscar cliente…"
                    clearOption={{ label: "Demanda interna", icon: <Lock size={14} /> }}
                    renderTrigger={({ selected }) => (
                      <>
                        {selected[0] ? <Building2 size={14} /> : <Lock size={14} />}
                        <span className="combobox-trigger-label">
                          {selected[0]?.label ?? "Demanda interna"}
                        </span>
                      </>
                    )}
                  />

                  <Combobox
                    value={demand.status}
                    onChange={(value) => value && updateDemand(demand.id, { status: value })}
                    options={statusOptions}
                    ariaLabel="Status"
                    renderTrigger={({ selected }) => (
                      <>
                        <span
                          className="combobox-dot"
                          style={{ background: status?.color ?? "var(--border)" }}
                        />
                        <span className="combobox-trigger-label">
                          {selected[0]?.label ?? "Sem status"}
                        </span>
                      </>
                    )}
                  />

                  <AssigneePicker
                    assigneeIds={demand.assignee_ids ?? []}
                    allTeam={demand.assign_all_team}
                    onChange={(assigneeIds, allTeam) =>
                      updateDemand(demand.id, {
                        assignee_ids: assigneeIds,
                        assign_all_team: allTeam,
                      })
                    }
                  />

                  <Combobox
                    value={demand.agenda_subject ?? null}
                    onChange={(value) =>
                      updateDemand(demand.id, { agenda_subject: value as AgendaSubject | null })
                    }
                    options={agendaSubjectOptions}
                    ariaLabel="Assunto na Agenda"
                    clearOption={{ label: "Não aparece na agenda", icon: <Calendar size={14} /> }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {/* As três informações de data andam juntas, num bloco só */}
                  <div
                    className="demand-modal-dates-wrap"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--color-surface-sunken)",
                    }}
                  >
                    <CalendarClock size={14} color="var(--text-tertiary)" />
                    <DateField
                      label="Início"
                      type="date"
                      value={demand.start_date ?? ""}
                      onChange={(value) => updateDemand(demand.id, { start_date: value })}
                    />
                    <FieldDivider />
                    <DateField
                      label="Entrega"
                      type="date"
                      value={demand.due_date ?? ""}
                      onChange={(value) => updateDemand(demand.id, { due_date: value })}
                    />
                    <FieldDivider />
                    <DateField
                      label="Hora"
                      type="time"
                      value={demand.due_time?.slice(0, 5) ?? ""}
                      onChange={(value) => updateDemand(demand.id, { due_time: value })}
                    />
                  </div>

                  {/* Formato só faz sentido em conteúdo — some nas demais */}
                  {(demand.plan_id || demand.content_type) && (
                    <Combobox
                      value={demand.content_type ?? null}
                      onChange={(value) => updateDemand(demand.id, { content_type: value })}
                      options={contentTypeOptions}
                      ariaLabel="Formato do conteúdo"
                      clearOption={{ label: "Sem formato", icon: <Clapperboard size={14} /> }}
                      renderTrigger={({ selected }) => {
                        const type = getContentType(demand.content_type);
                        return (
                          <>
                            {type ? (
                              <type.icon size={13} color={type.color} />
                            ) : (
                              <Clapperboard size={13} />
                            )}
                            <span
                              className="combobox-trigger-label"
                              style={type ? { color: type.color } : undefined}
                            >
                              {selected[0]?.label ?? "Sem formato"}
                            </span>
                          </>
                        );
                      }}
                    />
                  )}

                  <Combobox
                    value={demand.priority}
                    onChange={(value) =>
                      value && updateDemand(demand.id, { priority: value as DemandPriority })
                    }
                    options={priorityOptions}
                    ariaLabel="Prioridade"
                    renderTrigger={({ selected }) => (
                      <>
                        <PriorityFlag priority={demand.priority} size={13} />
                        <span
                          className="combobox-trigger-label"
                          style={{ color: PRIORITY_COLORS[demand.priority] }}
                        >
                          {selected[0]?.label ?? PRIORITY_LABELS[demand.priority]}
                        </span>
                      </>
                    )}
                  />
                </div>

                {demand.agenda_subject && (
                  <AgendaLinkStatus subject={demand.agenda_subject} agendaEvent={demand.agenda_event} />
                )}
              </div>

              <Section title="Descrição">
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--color-surface-sunken)",
                    padding: "6px 12px",
                  }}
                >
                  <BlockEditor
                    key={demand.id}
                    content={demand.description ?? undefined}
                    bucket="demand-attachments"
                    placeholder="Detalhe o projeto/demanda… '/' para blocos, '@' para mencionar"
                    onChange={(content) => scheduleDescriptionSave(demand.id, content)}
                  />
                </div>
              </Section>

              <Section title="Checklist" icon={<ListChecks size={14} />}>
                <ChecklistSection demandId={demand.id} />
              </Section>

              <Section title="Anexos" icon={<Paperclip size={14} />}>
                <AttachmentList demandId={demand.id} />
              </Section>

              <Section title="Comentários" icon={<MessageSquare size={14} />}>
                <CommentThread demandId={demand.id} />
              </Section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function iconButtonStyle(color: string): React.CSSProperties {
  return {
    display: "flex",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    borderRadius: "var(--radius-sm)",
    color,
  };
}

/** Rótulo + campo numa peça só, para as datas caberem todas numa linha. */
function DateField({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: "date" | "time";
  value: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 6px",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontSize: "0.62rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--text-tertiary)",
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value || null)}
        aria-label={label}
        style={{
          border: "none",
          background: "transparent",
          outline: "none",
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          fontSize: "0.78rem",
          fontWeight: 600,
          fontFamily: "inherit",
          padding: 0,
        }}
      />
    </label>
  );
}

/** Pílula que mostra o assunto vinculado à Agenda e, se aplicável, o status de sync com o Google. */
function AgendaLinkStatus({
  subject,
  agendaEvent,
}: {
  subject: AgendaSubject;
  agendaEvent: Demand["agenda_event"];
}) {
  const category = getAgendaCategory(subject);

  if (!agendaEvent) {
    return (
      <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
        Defina uma data de entrega para isto aparecer na agenda.
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: "var(--radius-badge)",
        fontSize: "0.7rem",
        fontWeight: 700,
        color: category?.color ?? "var(--text-secondary)",
        background: "var(--color-surface-sunken)",
        border: "1px solid var(--border)",
        width: "fit-content",
      }}
    >
      <Calendar size={12} />
      {category?.label ?? "Na agenda"}
      {agendaEvent.google_event_id && (
        <>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>
            ·
          </span>
          <GoogleIcon size={11} />
          Sincronizado com Google
        </>
      )}
    </span>
  );
}

function FieldDivider() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }}
    />
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-tertiary)",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
