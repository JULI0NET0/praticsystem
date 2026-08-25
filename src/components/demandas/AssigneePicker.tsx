"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemandas } from "./DemandasProvider";

/** Avatar circular com iniciais como fallback — mesmo padrão de ChatMessageItem. */
export function UserAvatar({
  name,
  avatarUrl,
  size = 24,
  ring = true,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "var(--accent)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-on-accent)",
        fontSize: Math.max(9, Math.round(size * 0.38)),
        fontWeight: 700,
        border: ring ? "2px solid var(--color-surface-raised)" : "none",
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        (name || "?").substring(0, 2).toUpperCase()
      )}
    </div>
  );
}

/** Pilha de avatares sobrepostos (com "+N" quando estoura o limite). */
export function AssigneeStack({
  assigneeIds,
  allTeam,
  size = 24,
  max = 4,
}: {
  assigneeIds: string[];
  allTeam?: boolean;
  size?: number;
  max?: number;
}) {
  const { getUser } = useDemandas();

  if (allTeam) {
    return (
      <span
        title="Time todo"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: "var(--radius-badge)",
          fontSize: "0.66rem",
          fontWeight: 700,
          color: "var(--accent)",
          background: "color-mix(in oklab, var(--accent) 10%, transparent)",
          border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)",
          whiteSpace: "nowrap",
        }}
      >
        <Users size={11} /> Time todo
      </span>
    );
  }

  if (!assigneeIds?.length) return null;

  const shown = assigneeIds.slice(0, max);
  const rest = assigneeIds.length - shown.length;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((id, index) => {
        const user = getUser(id);
        return (
          <div key={id} style={{ marginLeft: index === 0 ? 0 : -size * 0.3 }}>
            <UserAvatar
              name={user?.name ?? "?"}
              avatarUrl={user?.avatar_url ?? user?.avatarUrl}
              size={size}
            />
          </div>
        );
      })}
      {rest > 0 && (
        <div
          style={{
            marginLeft: -size * 0.3,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--color-surface-inset)",
            border: "2px solid var(--color-surface-raised)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(9, Math.round(size * 0.34)),
            fontWeight: 800,
            color: "var(--text-secondary)",
          }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}

interface Props {
  assigneeIds: string[];
  allTeam: boolean;
  onChange: (assigneeIds: string[], allTeam: boolean) => void;
}

export default function AssigneePicker({ assigneeIds, allTeam, onChange }: Props) {
  const { users } = useDemandas();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const toggleUser = (id: string) => {
    const next = assigneeIds.includes(id)
      ? assigneeIds.filter((x) => x !== id)
      : [...assigneeIds, id];
    onChange(next, false);
  };

  const summary = allTeam
    ? "Time todo"
    : assigneeIds.length === 0
      ? "Ninguém"
      : `${assigneeIds.length} responsáve${assigneeIds.length > 1 ? "is" : "l"}`;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--color-surface-sunken)",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          width: "100%",
        }}
      >
        {allTeam || assigneeIds.length === 0 ? (
          <Users size={14} />
        ) : (
          <AssigneeStack assigneeIds={assigneeIds} size={20} max={3} />
        )}
        <span>{summary}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-card"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 20,
              padding: 6,
              width: "min(280px, 90vw)",
              maxHeight: 300,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <PickerRow
              label="Time todo"
              active={allTeam}
              onClick={() => onChange([], !allTeam)}
              icon={<Users size={16} color="var(--accent)" />}
            />
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            {users.map((user) => (
              <PickerRow
                key={user.id}
                label={user.name || user.email}
                active={!allTeam && assigneeIds.includes(user.id)}
                onClick={() => toggleUser(user.id)}
                icon={
                  <UserAvatar
                    name={user.name || user.email}
                    avatarUrl={user.avatar_url ?? user.avatarUrl}
                    size={22}
                    ring={false}
                  />
                }
              />
            ))}
            {users.length === 0 && (
              <span
                style={{
                  padding: 10,
                  fontSize: "0.76rem",
                  color: "var(--text-tertiary)",
                }}
              >
                Nenhum membro da equipe carregado.
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PickerRow({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        background: active ? "var(--color-surface-sunken)" : "transparent",
        color: "var(--text-primary)",
        fontSize: "0.82rem",
        fontWeight: 600,
      }}
    >
      {icon}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
      {active && <Check size={15} color="var(--accent)" />}
    </button>
  );
}
