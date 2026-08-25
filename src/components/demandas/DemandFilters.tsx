"use client";

import { Eye, EyeOff, RotateCcw, UserCircle2 } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/hooks/useAuth";
import {
  clientLabel,
  PRIORITY_LABELS,
  type DemandFilters as Filters,
  type DemandPriority,
  type DemandScope,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";

const SCOPES: { value: DemandScope | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "client", label: "Clientes" },
  { value: "internal", label: "Internas" },
];

const PRIORITIES: DemandPriority[] = ["urgent", "high", "medium", "low", "none"];

export default function DemandFilters() {
  const { currentUser } = useAuth();
  const { filters, setFilters, resetFilters, clients, users, statuses } = useDemandas();

  const mineActive = !!currentUser && filters.assigneeId === currentUser.id;
  const isDirty = hasActiveFilter(filters);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Linha 1: escopo + busca */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: "var(--color-surface-sunken)",
            border: "1px solid var(--border)",
          }}
        >
          {SCOPES.map((scope) => {
            const active = filters.scope === scope.value;
            return (
              <button
                key={scope.value}
                type="button"
                onClick={() => setFilters({ scope: scope.value })}
                aria-pressed={active}
                style={{
                  padding: "5px 12px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--color-text-on-accent)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {scope.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchInput
            value={filters.search}
            onChange={(value: string) => setFilters({ search: value })}
            placeholder="Buscar por título ou cliente…"
          />
        </div>
      </div>

      {/* Linha 2: recortes */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {currentUser && (
          <ToggleChip
            active={mineActive}
            onClick={() =>
              setFilters({ assigneeId: mineActive ? null : currentUser.id })
            }
            icon={<UserCircle2 size={13} />}
            label="Minhas"
          />
        )}

        <ToggleChip
          active={filters.hideCompleted}
          onClick={() => setFilters({ hideCompleted: !filters.hideCompleted })}
          icon={filters.hideCompleted ? <EyeOff size={13} /> : <Eye size={13} />}
          label={filters.hideCompleted ? "Concluídas ocultas" : "Mostrando concluídas"}
        />

        <select
          value={filters.clientId ?? ""}
          onChange={(event) => setFilters({ clientId: event.target.value || null })}
          aria-label="Filtrar por cliente"
          style={selectStyle}
        >
          <option value="">Todos os clientes</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {clientLabel(client)}
            </option>
          ))}
        </select>

        <select
          value={filters.assigneeId ?? ""}
          onChange={(event) => setFilters({ assigneeId: event.target.value || null })}
          aria-label="Filtrar por responsável"
          style={selectStyle}
        >
          <option value="">Todos os responsáveis</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email}
            </option>
          ))}
        </select>

        <select
          value={filters.status ?? ""}
          onChange={(event) => setFilters({ status: event.target.value || null })}
          aria-label="Filtrar por status"
          style={selectStyle}
        >
          <option value="">Todos os status</option>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={filters.priority ?? ""}
          onChange={(event) =>
            setFilters({ priority: (event.target.value || null) as DemandPriority | null })
          }
          aria-label="Filtrar por prioridade"
          style={selectStyle}
        >
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>

        {isDirty && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.74rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            <RotateCcw size={12} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function hasActiveFilter(filters: Filters): boolean {
  return (
    filters.scope !== "all" ||
    filters.clientId !== null ||
    filters.assigneeId !== null ||
    filters.priority !== null ||
    filters.status !== null ||
    filters.hideCompleted ||
    filters.search.trim() !== ""
  );
}

const selectStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  color: "var(--text-secondary)",
  fontSize: "0.74rem",
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  maxWidth: 190,
};

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: "0.74rem",
        fontWeight: 700,
        background: active ? "var(--accent)" : "var(--color-surface-sunken)",
        color: active ? "var(--color-text-on-accent)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
