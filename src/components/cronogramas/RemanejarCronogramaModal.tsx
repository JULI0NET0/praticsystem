"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Lock, Plus, Trash2, X } from "lucide-react";
import { reassignCadenceDates } from "@/lib/contentSchedule";
import { CONTENT_TYPES } from "@/lib/contentTypes";
import { CONTENT_CHANNELS, WEEKDAY_LABELS, type ContentPlan } from "@/types/cronogramas";
import type { Demand } from "@/types/demandas";

export interface RemanejamentoUpdate {
  id: string;
  dueDate: string;
  position: number;
}

export interface RemanejamentoExtra {
  title: string;
  dueDate: string;
  contentType: string | null;
  channel: string | null;
  position: number;
}

interface Props {
  plan: ContentPlan;
  posts: Demand[];
  /** Primeira `position` livre para os conteúdos extras. */
  nextPosition: number;
  onConfirm: (result: { updates: RemanejamentoUpdate[]; extras: RemanejamentoExtra[] }) => Promise<void>;
  onClose: () => void;
}

type PostRow = { kind: "post"; id: string };
type ExtraRow = {
  kind: "extra";
  key: string;
  title: string;
  contentType: string;
  channel: string;
};
type Row = PostRow | ExtraRow;

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-tertiary)",
};

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  flexShrink: 0,
};

function bySchedule(a: Demand, b: Demand): number {
  const date = (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
  if (date !== 0) return date;
  return a.position - b.position;
}

function formatSlot(iso: string | null | undefined): string {
  if (!iso) return "Sem data";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const weekday = WEEKDAY_LABELS.find((item) => item.value === date.getDay())?.label ?? "";
  return `${match[3]}/${match[2]} · ${weekday}`;
}

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Prévia do remanejamento: reordena a fila, inclui extras e só grava ao confirmar. */
export default function RemanejarCronogramaModal({
  plan,
  posts,
  nextPosition,
  onConfirm,
  onClose,
}: Props) {
  const openPosts = useMemo(
    () => posts.filter((post) => post.status_category !== "fechado").slice().sort(bySchedule),
    [posts],
  );
  const published = useMemo(
    () => posts.filter((post) => post.status_category === "fechado").slice().sort(bySchedule),
    [posts],
  );

  const [rows, setRows] = useState<Row[]>(() => openPosts.map((post) => ({ kind: "post", id: post.id })));
  const [saving, setSaving] = useState(false);

  const cadenceLabel = WEEKDAY_LABELS
    .filter((item) => plan.weekdays.includes(item.value))
    .map((item) => item.label.toLowerCase())
    .join(", ");

  const assignments = useMemo(() => {
    const dates = reassignCadenceDates({
      movableIds: rows.map((row) => (row.kind === "post" ? row.id : row.key)),
      freeDates: openPosts.map((post) => post.due_date ?? null),
      pinnedDates: published.map((post) => post.due_date ?? null),
      weekdays: plan.weekdays,
      postsPerWeek: plan.posts_per_week,
      anchor: plan.first_date || plan.start_date || localToday(),
    });
    return new Map(dates.map((item) => [item.id, item.date]));
  }, [rows, openPosts, published, plan]);

  const initialOrder = openPosts.map((post) => post.id).join("\0");
  const dirty = rows.some((row) => row.kind === "extra") || rows.filter((row) => row.kind === "post").map((row) => row.id).join("\0") !== initialOrder;
  const missingDate = rows.some((row) => !assignments.get(row.kind === "post" ? row.id : row.key));
  const blankExtra = rows.some((row) => row.kind === "extra" && !row.title.trim());
  const canConfirm = dirty && !missingDate && !blankExtra && !saving;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const move = (index: number, delta: number) => {
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const insertAt = (index: number) => {
    setRows((current) => {
      const extras = current.filter((row) => row.kind === "extra").length + 1;
      const next = current.slice();
      next.splice(index, 0, {
        kind: "extra",
        key: crypto.randomUUID(),
        title: extras === 1 ? "Conteúdo extra" : `Conteúdo extra ${extras}`,
        contentType: "extra",
        channel: plan.channels[0] ?? "FEED",
      });
      return next;
    });
  };

  const patchExtra = (key: string, patch: Partial<Omit<ExtraRow, "kind" | "key">>) => {
    setRows((current) =>
      current.map((row) => (row.kind === "extra" && row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const confirm = async () => {
    if (!canConfirm) return;
    const postRows = rows.filter((row): row is PostRow => row.kind === "post");
    const positions = postRows
      .map((row) => openPosts.find((post) => post.id === row.id)?.position ?? 0)
      .sort((a, b) => a - b);

    const updates: RemanejamentoUpdate[] = [];
    postRows.forEach((row, index) => {
      const dueDate = assignments.get(row.id);
      const current = openPosts.find((post) => post.id === row.id);
      const position = positions[index];
      if (!dueDate || !current) return;
      if ((current.due_date ?? null) === dueDate && current.position === position) return;
      updates.push({ id: row.id, dueDate, position });
    });

    let cursor = nextPosition;
    const extras: RemanejamentoExtra[] = [];
    for (const row of rows) {
      if (row.kind !== "extra") continue;
      const dueDate = assignments.get(row.key);
      if (!dueDate) return;
      extras.push({
        title: row.title.trim(),
        dueDate,
        contentType: row.contentType || null,
        channel: row.channel || null,
        position: cursor,
      });
      cursor += 1;
    }

    setSaving(true);
    try {
      await onConfirm({ updates, extras });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Remanejar cronograma"
      onClick={() => {
        if (!saving) onClose();
      }}
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
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 22,
          borderRadius: 20,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Remanejar cronograma</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.45, color: "var(--text-secondary)" }}>
          A ordem desta lista define as datas{cadenceLabel ? ` (${cadenceLabel})` : ""}. Um conteúdo extra empurra os seguintes para a próxima vaga. Nada é gravado até confirmar.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Conteúdos em aberto</span>
          {rows.length === 0 ? (
            <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              Nenhum conteúdo em aberto. Inclua um extra para ocupar a próxima vaga.
            </span>
          ) : (
            rows.map((row, index) => {
              const id = row.kind === "post" ? row.id : row.key;
              const nextDate = assignments.get(id) ?? null;
              const current = row.kind === "post" ? openPosts.find((post) => post.id === row.id) : undefined;
              const changed = row.kind === "extra" || (current?.due_date ?? null) !== nextDate;
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${changed ? "var(--accent)" : "var(--border)"}`,
                    background: changed ? "rgba(201, 100, 66, 0.1)" : "var(--color-surface-sunken)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="button" aria-label="Subir" title="Subir" disabled={index === 0 || saving} onClick={() => move(index, -1)} style={{ ...iconButtonStyle, opacity: index === 0 ? 0.4 : 1 }}>
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" aria-label="Descer" title="Descer" disabled={index === rows.length - 1 || saving} onClick={() => move(index, 1)} style={{ ...iconButtonStyle, opacity: index === rows.length - 1 ? 0.4 : 1 }}>
                      <ChevronDown size={14} />
                    </button>
                    <button type="button" aria-label="Inserir conteúdo extra acima" title="Inserir conteúdo extra acima" disabled={saving} onClick={() => insertAt(index)} style={iconButtonStyle}>
                      <Plus size={14} />
                    </button>
                    {row.kind === "post" ? (
                      <span style={{ flex: 1, minWidth: 0, fontSize: "0.88rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {current?.title || "Conteúdo"}
                      </span>
                    ) : (
                      <input
                        value={row.title}
                        aria-label="Nome do conteúdo extra"
                        onChange={(event) => patchExtra(row.key, { title: event.target.value })}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          fontFamily: "inherit",
                        }}
                      />
                    )}
                    {row.kind === "extra" && (
                      <button type="button" aria-label="Remover conteúdo extra" title="Remover conteúdo extra" disabled={saving} onClick={() => setRows((currentRows) => currentRows.filter((item) => item.kind !== "extra" || item.key !== row.key))} style={{ ...iconButtonStyle, color: "var(--color-danger, #e5484d)" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {row.kind === "extra" && (
                    <div style={{ display: "flex", gap: 8, paddingLeft: 108 }}>
                      <select
                        aria-label="Formato do conteúdo extra"
                        value={row.contentType}
                        onChange={(event) => patchExtra(row.key, { contentType: event.target.value })}
                        style={selectStyle}
                      >
                        {CONTENT_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Canal do conteúdo extra"
                        value={row.channel}
                        onChange={(event) => patchExtra(row.key, { channel: event.target.value })}
                        style={selectStyle}
                      >
                        {CONTENT_CHANNELS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 108, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    <span style={{ textDecoration: changed && row.kind === "post" ? "line-through" : "none", opacity: changed ? 0.7 : 1 }}>
                      {row.kind === "post" ? formatSlot(current?.due_date) : "Novo"}
                    </span>
                    <span aria-hidden="true">→</span>
                    <strong style={{ color: changed ? "var(--accent)" : "var(--text-primary)" }}>
                      {formatSlot(nextDate)}
                    </strong>
                  </div>
                </div>
              );
            })
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => insertAt(rows.length)}
            disabled={saving}
            style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> Incluir conteúdo extra
          </button>
          {missingDate && (
            <span style={{ fontSize: "0.78rem", color: "var(--color-danger, #e5484d)" }}>
              Não há dia da semana disponível para encaixar todos os conteúdos.
            </span>
          )}
        </div>

        {published.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Publicados — data fixa</span>
            {published.map((post) => (
              <div
                key={post.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  color: "var(--text-tertiary)",
                  fontSize: "0.82rem",
                }}
              >
                <Lock size={13} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </span>
                <span>{formatSlot(post.due_date)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={!canConfirm}>
            {saving ? "Salvando…" : "Confirmar remanejamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  fontSize: "0.78rem",
  fontFamily: "inherit",
};
