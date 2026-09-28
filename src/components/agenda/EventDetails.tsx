"use client";

import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Link2,
  Pencil,
  Shield,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { GoogleIcon } from "@/components/SocialIcons";
import { getAgendaCategory } from "@/lib/agendaCategories";
import { fullDayLabel, timeLabel, type AgendaItem } from "@/lib/agendaItems";
import { tint } from "@/lib/tint";

interface EventDetailsProps {
  item: AgendaItem;
  clientName: string | null;
  onClose: () => void;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDemand: () => void;
}

export default function EventDetails({
  item,
  clientName,
  onClose,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenDemand,
}: EventDetailsProps) {
  const category = getAgendaCategory(item.type);
  const completed = item.status === "completed";
  const readOnly = item.isInvoice;
  const fromDemand = Boolean(item.demandId);

  const visibilityText = item.assignAllTeam
    ? "Visível para toda a equipe"
    : fromDemand
      ? "Visível para os responsáveis da demanda"
      : item.visibility === "public"
        ? "Visível para todos"
        : "Apenas para mim";
  const isShared = item.assignAllTeam || item.visibility === "public" || fromDemand;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: "var(--radius-badge)",
              background: tint(category?.color, 12),
              fontSize: "var(--text-micro)",
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: category?.color }} />
            {category?.label ?? "Compromisso"}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-h3)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              overflowWrap: "anywhere",
              textDecoration: completed ? "line-through" : "none",
            }}
          >
            {item.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="btn btn-ghost btn-icon"
          style={{ flexShrink: 0 }}
        >
          <X size={18} />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <Row icon={<CalendarDays size={18} />}>{fullDayLabel(item.start)}</Row>
        {!item.allDay && (
          <Row icon={<Clock size={18} />} numeric>
            {timeLabel(item)}
          </Row>
        )}
        {clientName && <Row icon={<Building2 size={18} />}>{clientName}</Row>}
        <Row
          icon={
            isShared ? (
              <Shield size={18} color="var(--color-success)" />
            ) : (
              <ShieldOff size={18} color="var(--color-text-tertiary)" />
            )
          }
        >
          {visibilityText}
        </Row>
        <Row
          icon={
            completed ? (
              <CheckCircle2 size={18} color="var(--color-success)" />
            ) : (
              <Clock size={18} color="var(--color-warning)" />
            )
          }
          last={!item.googleEventId}
        >
          {readOnly
            ? item.invoiceStatus === "paid"
              ? "Pago"
              : "Pendente"
            : completed
              ? "Concluído"
              : "Agendado"}
        </Row>
        {item.googleEventId && (
          <Row icon={<GoogleIcon size={16} />} last>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--color-info-ink)", fontWeight: 500 }}>
              Sincronizado com Google ({item.googleAccount || "agenciapratic"})
            </span>
          </Row>
        )}
      </div>

      {fromDemand && (
        <p
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-input)",
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--color-border-subtle)",
            fontSize: "var(--text-caption)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Link2 size={14} aria-hidden="true" /> Gerado a partir de uma demanda — edite por lá
        </p>
      )}

      {item.description && (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: "var(--radius-card)",
            background: "var(--color-surface-sunken)",
            fontSize: "var(--text-data)",
            lineHeight: 1.5,
            color: "var(--color-text-secondary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {item.description}
        </p>
      )}

      {fromDemand ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-accent" onClick={onOpenDemand} style={{ flex: 1, minHeight: 44 }}>
            <Link2 size={15} /> Abrir demanda
          </button>
        </div>
      ) : (
        !readOnly && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={onDelete}
              aria-label="Excluir compromisso"
              style={{ width: 44, height: 44, flexShrink: 0, color: "var(--color-danger)" }}
            >
              <Trash2 size={18} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={onEdit} style={{ flex: 1, minHeight: 44 }}>
              <Pencil size={15} /> Editar
            </button>
            <button type="button" className="btn btn-accent" onClick={onToggleComplete} style={{ flex: 1, minHeight: 44 }}>
              <Check size={15} /> {completed ? "Reabrir" : "Concluir"}
            </button>
          </div>
        )
      )}
    </div>
  );
}

function Row({
  icon,
  children,
  numeric,
  last,
}: {
  icon: ReactNode;
  children: ReactNode;
  numeric?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 46,
        padding: "0 14px",
        borderBottom: last ? "none" : "1px solid var(--color-border-subtle)",
        fontSize: "var(--text-body)",
        color: "var(--color-text-primary)",
        fontVariantNumeric: numeric ? "tabular-nums" : undefined,
      }}
    >
      <span aria-hidden="true" style={{ display: "flex", color: "var(--color-text-tertiary)" }}>
        {icon}
      </span>
      <span style={{ flexGrow: 1 }}>{children}</span>
    </div>
  );
}
