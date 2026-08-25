"use client";

import { useMemo } from "react";
import {
  Building2,
  CircleDot,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  UserCircle2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { useAuth } from "@/hooks/useAuth";
import {
  clientLabel,
  PRIORITY_LABELS,
  type DemandFilters as Filters,
  type DemandPriority,
  type DemandScope,
} from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { UserAvatar } from "./AssigneePicker";
import { PriorityFlag } from "./PriorityFlag";

const SCOPES: { value: DemandScope | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "client", label: "Clientes" },
  { value: "internal", label: "Internas" },
];

const PRIORITIES: DemandPriority[] = ["urgent", "high", "medium", "low", "none"];

export default function DemandFilters() {
  const { currentUser } = useAuth();
  const {
    filters,
    setFilters,
    resetFilters,
    clients,
    users,
    statuses,
    soundEnabled,
    setSoundEnabled,
  } = useDemandas();

  const mineActive = !!currentUser && filters.assigneeId === currentUser.id;
  const isDirty = hasActiveFilter(filters);

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

  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.name || user.email,
        keywords: user.email,
        icon: (
          <UserAvatar
            name={user.name || user.email}
            avatarUrl={user.avatar_url ?? user.avatarUrl}
            size={20}
            ring={false}
          />
        ),
      })),
    [users],
  );

  const statusOptions = useMemo<ComboboxOption[]>(
    () => statuses.map((status) => ({ value: status.id, label: status.label, color: status.color })),
    [statuses],
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Abas do escopo, acima de tudo */}
      <div className="filter-tabs" role="tablist" aria-label="Escopo das demandas">
        {SCOPES.map((scope) => (
          <button
            key={scope.value}
            type="button"
            role="tab"
            aria-selected={filters.scope === scope.value}
            data-active={filters.scope === scope.value || undefined}
            onClick={() => setFilters({ scope: scope.value })}
            className="filter-tab"
          >
            {scope.label}
          </button>
        ))}
      </div>

      {/* Opções — busca primeiro, todas na mesma métrica */}
      <div className="filter-bar">
        <label className="filter-control filter-search">
          <Search size={14} />
          <input
            value={filters.search}
            onChange={(event) => setFilters({ search: event.target.value })}
            placeholder="Buscar demanda ou cliente…"
            aria-label="Buscar demanda ou cliente"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters({ search: "" })}
              aria-label="Limpar busca"
              style={{
                display: "flex",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                color: "var(--text-tertiary)",
              }}
            >
              <X size={13} />
            </button>
          )}
        </label>

        {currentUser && (
          <button
            type="button"
            className="filter-control"
            data-active={mineActive || undefined}
            aria-pressed={mineActive}
            onClick={() => setFilters({ assigneeId: mineActive ? null : currentUser.id })}
          >
            <UserCircle2 size={14} />
            Minhas
          </button>
        )}

        {/* Rótulo fixo e ícone alternando: o texto não muda de largura, então
            a fileira não “dança” ao ligar e desligar. */}
        <button
          type="button"
          className="filter-control"
          data-active={filters.hideCompleted || undefined}
          aria-pressed={filters.hideCompleted}
          title={filters.hideCompleted ? "Mostrar concluídas" : "Ocultar concluídas"}
          onClick={() => setFilters({ hideCompleted: !filters.hideCompleted })}
        >
          {filters.hideCompleted ? <EyeOff size={14} /> : <Eye size={14} />}
          Concluídas
        </button>

        <Combobox
          value={filters.clientId}
          onChange={(value) => setFilters({ clientId: value })}
          options={clientOptions}
          ariaLabel="Filtrar por cliente"
          searchPlaceholder="Buscar cliente…"
          clearOption={{ label: "Cliente", icon: <Building2 size={14} /> }}
        />

        <Combobox
          value={filters.assigneeId}
          onChange={(value) => setFilters({ assigneeId: value })}
          options={userOptions}
          ariaLabel="Filtrar por responsável"
          searchPlaceholder="Buscar pessoa…"
          clearOption={{ label: "Responsáveis", icon: <UserCircle2 size={14} /> }}
        />

        <Combobox
          value={filters.status}
          onChange={(value) => setFilters({ status: value })}
          options={statusOptions}
          ariaLabel="Filtrar por status"
          searchPlaceholder="Buscar status…"
          clearOption={{ label: "Status", icon: <CircleDot size={14} /> }}
        />

        <Combobox
          value={filters.priority}
          onChange={(value) => setFilters({ priority: value as DemandPriority | null })}
          options={priorityOptions}
          ariaLabel="Filtrar por prioridade"
          clearOption={{
            label: "Prioridades",
            icon: <PriorityFlag priority="none" size={13} />,
          }}
        />

        <button
          type="button"
          className="filter-control filter-control-icon"
          aria-pressed={soundEnabled}
          title={soundEnabled ? "Som de conclusão ligado" : "Som de conclusão desligado"}
          aria-label={soundEnabled ? "Desligar som de conclusão" : "Ligar som de conclusão"}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        {isDirty && (
          <button type="button" className="filter-control" onClick={resetFilters}>
            <RotateCcw size={13} />
            Limpar
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
