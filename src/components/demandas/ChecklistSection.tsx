"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ListPlus, Plus, Trash2, X } from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { LinkifiedText } from "@/lib/linkify";
import { groupChecklist, type DemandChecklistItem } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";

const NEW_GROUP = "__novo__";

export default function ChecklistSection({ demandId }: { demandId: string }) {
  const {
    checklistOf,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    applyTemplate,
    templates,
  } = useDemandas();
  const reduceMotion = useReducedMotion();

  const items = checklistOf(demandId);
  const groups = useMemo(() => groupChecklist(items), [items]);

  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const total = items.length;
  const done = items.filter((item) => item.done).length;

  const templateOptions = useMemo<ComboboxOption[]>(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: template.name,
        description: template.description ?? undefined,
        icon: <ListPlus size={14} />,
      })),
    [templates],
  );

  const submitDraft = async (groupName: string) => {
    const label = draft.trim();
    if (!label) return;
    await addChecklistItem(demandId, groupName, label);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabeçalho: progresso geral + aplicar template */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {total > 0 && (
          <>
            <div
              style={{
                flex: 1,
                minWidth: 120,
                height: 5,
                borderRadius: 999,
                background: "var(--color-surface-inset)",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={false}
                animate={{ width: `${Math.round((done / total) * 100)}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: "100%", background: "var(--accent)" }}
              />
            </div>
            <span
              style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-tertiary)" }}
            >
              {done}/{total}
            </span>
          </>
        )}

        <Combobox
          value={null}
          onChange={(templateId) => templateId && applyTemplate(demandId, templateId)}
          options={templateOptions}
          ariaLabel="Aplicar template"
          searchPlaceholder="Buscar template…"
          renderTrigger={() => (
            <>
              <ListPlus size={14} />
              <span className="combobox-trigger-label">Aplicar template</span>
            </>
          )}
        />
      </div>

      {total === 0 && (
        <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
          Nenhuma etapa ainda. Aplique um template ou adicione uma etapa abaixo.
        </span>
      )}

      {groups.map((group) => (
        <section key={group.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-secondary)",
              }}
            >
              {group.name || "Sem etapa"}
            </span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)" }}>
              {group.done}/{group.items.length}
            </span>
          </div>

          <AnimatePresence initial={false}>
            {group.items.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                reduceMotion={!!reduceMotion}
                onToggle={() => toggleChecklistItem(item)}
                onRemove={() => removeChecklistItem(item)}
              />
            ))}
          </AnimatePresence>

          {adding === group.name ? (
            <InlineAdd
              value={draft}
              onChange={setDraft}
              onSubmit={() => submitDraft(group.name)}
              onCancel={() => {
                setAdding(null);
                setDraft("");
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdding(group.name);
                setDraft("");
              }}
              style={addButtonStyle}
            >
              <Plus size={12} /> Adicionar ação
            </button>
          )}
        </section>
      ))}

      {/* Etapa nova, fora dos grupos existentes */}
      {adding === NEW_GROUP ? (
        <InlineAdd
          value={draft}
          onChange={setDraft}
          placeholder="Nome da etapa…"
          onSubmit={async () => {
            const name = draft.trim();
            if (!name) return;
            await addChecklistItem(demandId, name, "Primeira ação");
            setDraft("");
            setAdding(null);
          }}
          onCancel={() => {
            setAdding(null);
            setDraft("");
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(NEW_GROUP);
            setDraft("");
          }}
          style={{ ...addButtonStyle, alignSelf: "flex-start" }}
        >
          <Plus size={12} /> Nova etapa
        </button>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  reduceMotion,
  onToggle,
  onRemove,
}: {
  item: DemandChecklistItem;
  reduceMotion: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout={reduceMotion ? false : "position"}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      className="checklist-row"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "5px 6px",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.done}
        aria-label={item.done ? `Desmarcar ${item.label}` : `Marcar ${item.label}`}
        style={{
          width: 15,
          height: 15,
          marginTop: 2,
          flexShrink: 0,
          borderRadius: 4,
          border: `1.5px solid ${item.done ? "var(--accent)" : "var(--color-border-strong)"}`,
          background: item.done ? "var(--accent)" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        {item.done && <Check size={10} color="var(--color-text-on-accent)" strokeWidth={3} />}
      </button>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "0.82rem",
          lineHeight: 1.45,
          color: item.done ? "var(--text-tertiary)" : "var(--text-secondary)",
          textDecoration: item.done ? "line-through" : "none",
          wordBreak: "break-word",
        }}
      >
        <LinkifiedText text={item.label} />
      </span>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${item.label}`}
        className="checklist-row-remove"
        style={{
          display: "flex",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 2,
          color: "var(--text-tertiary)",
        }}
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

function InlineAdd({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Descreva a ação…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        borderRadius: "var(--radius-sm)",
        border: "1px dashed var(--border)",
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: "0.82rem",
          color: "var(--text-primary)",
          fontFamily: "inherit",
        }}
      />
      <button type="button" onClick={onCancel} aria-label="Cancelar" style={iconBtn}>
        <X size={13} />
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "flex",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 2,
  color: "var(--text-tertiary)",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 6px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.74rem",
  fontWeight: 700,
  color: "var(--text-tertiary)",
  alignSelf: "flex-start",
};
