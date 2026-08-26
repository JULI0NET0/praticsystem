"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { useDemandas } from "./DemandasProvider";

/** Opção sintética: "todo o time" vive junto dos nomes, não num toggle à parte. */
const ALL_TEAM = "__all_team__";

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
  const clean = name.replace(/^@/, "");
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "-webkit-optimize-contrast",
            backfaceVisibility: "hidden",
          }}
        />
      ) : (
        (clean || "?").substring(0, 2).toUpperCase()
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
          background: "color-mix(in oklab, var(--accent) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--accent) 28%, transparent)",
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
        const handle = user?.username ? `@${user.username}` : (user?.name ?? "?");
        return (
          <div key={id} style={{ marginLeft: index === 0 ? 0 : -size * 0.3 }}>
            <UserAvatar
              name={handle}
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

  const options = useMemo<ComboboxOption[]>(
    () => [
      {
        value: ALL_TEAM,
        label: "Time todo",
        icon: <Users size={15} color="var(--accent)" />,
        description: "Todos os membros da equipe",
      },
      ...users.map((user) => {
        const handle = user.username ? `@${user.username}` : (user.name || user.email);
        return {
          value: user.id,
          label: handle,
          description: user.name && user.username ? user.name : undefined,
          keywords: `${user.username || ""} ${user.name || ""} ${user.email || ""}`.trim(),
          icon: (
            <UserAvatar
              name={handle}
              avatarUrl={user.avatar_url ?? user.avatarUrl}
              size={20}
              ring={false}
            />
          ),
        };
      }),
    ],
    [users],
  );

  const value = allTeam ? [ALL_TEAM] : assigneeIds;

  const handleChange = (next: string[]) => {
    const pickedTeam = next.includes(ALL_TEAM);
    // "Time todo" é exclusivo: marcar limpa os nomes, marcar um nome o desmarca
    if (pickedTeam && !allTeam) {
      onChange([], true);
      return;
    }
    onChange(next.filter((id) => id !== ALL_TEAM), false);
  };

  return (
    <Combobox
      multiple
      value={value}
      onChange={handleChange}
      options={options}
      ariaLabel="Responsáveis"
      placeholder="Ninguém"
      searchPlaceholder="Buscar pessoa…"
      renderTrigger={({ selected }) => (
        <>
          {allTeam ? (
            <Users size={14} color="var(--accent)" />
          ) : selected.length ? (
            <AssigneeStack assigneeIds={assigneeIds} size={20} max={3} />
          ) : (
            <Users size={14} />
          )}
          <span className="combobox-trigger-label">
            {allTeam
              ? "Time todo"
              : selected.length === 0
                ? "Ninguém"
                : selected.length === 1
                  ? selected[0].label
                  : `${selected.length} responsáveis`}
          </span>
        </>
      )}
    />
  );
}
