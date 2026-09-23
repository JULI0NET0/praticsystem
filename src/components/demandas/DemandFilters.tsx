"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  Clapperboard,
  CircleDot,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserCircle2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Combobox, { type ComboboxOption } from "@/components/ui/Combobox";
import { useAuth } from "@/hooks/useAuth";
import { clientLabel, PRIORITY_LABELS, type DemandPriority } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import { UserAvatar } from "./AssigneePicker";
import { PriorityFlag } from "./PriorityFlag";
import { CONTENT_TYPES } from "@/lib/contentTypes";

const PRIORITIES: DemandPriority[] = ["urgent", "high", "medium", "low", "none"];

/** Mesmo padrão inline de `DialogShell.tsx`/`DemandRow.tsx`: só troca a
 * mecânica de overlay (popover ancorado vs. bottom-sheet) por breakpoint. */
function useIsMobileFilters(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: active ? "1px solid var(--accent-wash-strong)" : "1px solid transparent",
    background: active ? "var(--accent-wash)" : "transparent",
    color: active ? "var(--color-terracotta-ink)" : "var(--text-secondary)",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
  };
}

interface Props {
  mobileSearchOpen?: boolean;
  onCloseMobileSearch?: () => void;
  mobileFiltersOpen?: boolean;
  onCloseMobileFilters?: () => void;
}

export default function DemandFilters({
  mobileSearchOpen = false,
  onCloseMobileSearch,
  mobileFiltersOpen = false,
  onCloseMobileFilters,
}: Props) {
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
    showClientInTitle,
    setShowClientInTitle,
    visibleDemands,
  } = useDemandas();

  const isMobile = useIsMobileFilters();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const mineActive = !!currentUser && filters.assigneeId === currentUser.id;
  const isDirty = hasActiveFilter(filters);

  useEffect(() => {
    if (!popoverOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      // As opções dos Comboboxes aninhados são portais fora de popoverRef.
      if ((target as HTMLElement).closest?.(".combobox-panel")) return;
      setPopoverOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  const clientOptions = useMemo<ComboboxOption[]>(() => {
    const active = clients.filter((c) => !c.status || c.status === "active" || c.status === "prospect");
    const inactive = clients.filter((c) => c.status === "inactive");

    return [
      ...active.map((client) => ({
        value: client.id,
        label: clientLabel(client),
        keywords: client.name,
        icon: <Building2 size={14} />,
      })),
      ...inactive.map((client) => ({
        value: client.id,
        label: `${clientLabel(client)} (Inativo)`,
        description: "Cliente inativo",
        keywords: `${client.name} inativo`,
        icon: <Building2 size={14} style={{ opacity: 0.6 }} />,
      })),
    ];
  }, [clients]);

  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      users.map((user) => {
        const handle = user.username ? `@${user.username}` : (user.name || user.email);
        return {
          value: user.id,
          label: handle,
          description: user.name && user.username ? user.name : undefined,
          keywords: `${user.username || ""} ${user.name || ""} ${user.email || ""}`.trim(),
          icon: <UserAvatar name={handle} avatarUrl={user.avatar_url ?? user.avatarUrl} size={20} ring={false} />,
        };
      }),
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

  const contentTypeOptions = useMemo<ComboboxOption[]>(
    () => CONTENT_TYPES.map((type) => ({ value: type.id, label: type.label, color: type.color })),
    [],
  );

  const popoverActiveCount =
    (filters.clientId ? 1 : 0) +
    (filters.assigneeId ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.contentType ? 1 : 0) +
    (filters.hideCompleted === false ? 1 : 0) +
    (showClientInTitle ? 1 : 0) +
    (soundEnabled === false ? 1 : 0);

  const filterFields = (
    <>
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
        clearOption={{ label: "Prioridades", icon: <PriorityFlag priority="none" size={13} /> }}
      />
      <Combobox
        value={filters.contentType}
        onChange={(value) => setFilters({ contentType: value })}
        options={contentTypeOptions}
        ariaLabel="Filtrar por formato"
        searchPlaceholder="Buscar formato…"
        clearOption={{ label: "Formatos", icon: <Clapperboard size={14} /> }}
      />
    </>
  );

  // Mesmos 5 Comboboxes do popover desktop, empilhados com um rótulo acima
  // de cada um. `.combobox-trigger` tem altura fixa (34px, ver components.css)
  // — não dá pra virar uma linha de 52px via `renderTrigger` sem alterar essa
  // classe compartilhada, então o sheet mobile usa a mesma pílula do desktop.
  const mobileFilterFields = (
    <>
      <MobileFilterField label="Cliente">
        <Combobox
          value={filters.clientId}
          onChange={(value) => setFilters({ clientId: value })}
          options={clientOptions}
          ariaLabel="Filtrar por cliente"
          searchPlaceholder="Buscar cliente…"
          clearOption={{ label: "Cliente", icon: <Building2 size={14} /> }}
        />
      </MobileFilterField>
      <MobileFilterField label="Responsável">
        <Combobox
          value={filters.assigneeId}
          onChange={(value) => setFilters({ assigneeId: value })}
          options={userOptions}
          ariaLabel="Filtrar por responsável"
          searchPlaceholder="Buscar pessoa…"
          clearOption={{ label: "Responsáveis", icon: <UserCircle2 size={14} /> }}
        />
      </MobileFilterField>
      <MobileFilterField label="Status">
        <Combobox
          value={filters.status}
          onChange={(value) => setFilters({ status: value })}
          options={statusOptions}
          ariaLabel="Filtrar por status"
          searchPlaceholder="Buscar status…"
          clearOption={{ label: "Status", icon: <CircleDot size={14} /> }}
        />
      </MobileFilterField>
      <MobileFilterField label="Prioridade">
        <Combobox
          value={filters.priority}
          onChange={(value) => setFilters({ priority: value as DemandPriority | null })}
          options={priorityOptions}
          ariaLabel="Filtrar por prioridade"
          clearOption={{ label: "Prioridades", icon: <PriorityFlag priority="none" size={13} /> }}
        />
      </MobileFilterField>
      <MobileFilterField label="Formato">
        <Combobox
          value={filters.contentType}
          onChange={(value) => setFilters({ contentType: value })}
          options={contentTypeOptions}
          ariaLabel="Filtrar por formato"
          searchPlaceholder="Buscar formato…"
          clearOption={{ label: "Formatos", icon: <Clapperboard size={14} /> }}
        />
      </MobileFilterField>
    </>
  );

  const toggleFields = (
    <>
      <button
        type="button"
        aria-pressed={filters.hideCompleted}
        onClick={() => setFilters({ hideCompleted: !filters.hideCompleted })}
        style={popoverRowButtonStyle}
      >
        {filters.hideCompleted ? <EyeOff size={14} /> : <Eye size={14} />}
        <span style={{ flex: 1, textAlign: "left" }}>Concluídas</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
          {filters.hideCompleted ? "Ocultas" : "Mostrando"}
        </span>
      </button>
      <button
        type="button"
        aria-pressed={showClientInTitle}
        onClick={() => setShowClientInTitle(!showClientInTitle)}
        style={popoverRowButtonStyle}
      >
        <Building2 size={14} />
        <span style={{ flex: 1, textAlign: "left" }}>Demanda + Cliente</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
          {showClientInTitle ? "Ligado" : "Desligado"}
        </span>
      </button>
      <button
        type="button"
        aria-pressed={soundEnabled}
        onClick={() => setSoundEnabled(!soundEnabled)}
        style={popoverRowButtonStyle}
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span style={{ flex: 1, textAlign: "left" }}>Som ao concluir</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
          {soundEnabled ? "Ligado" : "Desligado"}
        </span>
      </button>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              maxWidth: 300,
              height: 32,
              padding: "0 10px",
              borderRadius: 8,
              background: "var(--color-surface-sunken)",
              color: "var(--text-tertiary)",
            }}
          >
            <Search size={14} />
            <input
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder="Buscar demanda ou cliente…"
              aria-label="Buscar demanda ou cliente"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
              }}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ search: "" })}
                aria-label="Limpar busca"
                style={{ display: "flex", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </label>

          {currentUser && (
            <button
              type="button"
              aria-pressed={mineActive}
              onClick={() => setFilters({ assigneeId: mineActive ? null : currentUser.id })}
              style={toggleStyle(mineActive)}
            >
              <UserCircle2 size={14} />
              Minhas
            </button>
          )}

          <button
            type="button"
            aria-pressed={filters.todayOnly}
            title={filters.todayOnly ? "Mostrar todas as datas" : "Filtrar demandas de hoje"}
            onClick={() => setFilters({ todayOnly: !filters.todayOnly })}
            style={toggleStyle(filters.todayOnly)}
          >
            <Calendar size={14} />
            Hoje
          </button>

          <div ref={popoverRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-pressed={popoverOpen}
              onClick={() => setPopoverOpen((prev) => !prev)}
              style={toggleStyle(popoverOpen || popoverActiveCount > 0)}
            >
              <SlidersHorizontal size={14} />
              Filtros{popoverActiveCount > 0 && ` · ${popoverActiveCount}`}
            </button>

            <AnimatePresence>
              {popoverOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 260,
                    zIndex: 40,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--color-surface-raised)",
                    boxShadow: "var(--shadow-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {filterFields}
                  <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />
                  {toggleFields}
                  {isDirty && (
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setPopoverOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        marginTop: 2,
                        padding: "6px 0",
                        borderRadius: 8,
                        border: "none",
                        background: "none",
                        color: "var(--color-terracotta-ink)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <RotateCcw size={13} />
                      Limpar
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {isMobile && (
        <>
          {mobileSearchOpen ? (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 14px",
                margin: "0 20px",
                borderRadius: 10,
                background: "var(--color-surface-sunken)",
              }}
            >
              <Search size={15} color="var(--text-tertiary)" />
              <input
                autoFocus
                value={filters.search}
                onChange={(event) => setFilters({ search: event.target.value })}
                placeholder="Buscar demanda ou cliente…"
                aria-label="Buscar demanda ou cliente"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.9rem" }}
              />
              <button
                type="button"
                onClick={() => {
                  setFilters({ search: "" });
                  onCloseMobileSearch?.();
                }}
                aria-label="Fechar busca"
                style={{ display: "flex", border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "var(--text-tertiary)" }}
              >
                <X size={16} />
              </button>
            </label>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "0 20px 4px",
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {currentUser && (
                <button
                  type="button"
                  aria-pressed={mineActive}
                  onClick={() => setFilters({ assigneeId: mineActive ? null : currentUser.id })}
                  style={mobileChipStyle(mineActive)}
                >
                  Minhas
                </button>
              )}
              <button
                type="button"
                aria-pressed={filters.todayOnly}
                onClick={() => setFilters({ todayOnly: !filters.todayOnly })}
                style={mobileChipStyle(filters.todayOnly)}
              >
                Hoje
              </button>
              <button
                type="button"
                aria-pressed={!filters.hideCompleted}
                onClick={() => setFilters({ hideCompleted: !filters.hideCompleted })}
                style={mobileChipStyle(!filters.hideCompleted)}
              >
                Concluídas
              </button>
            </div>
          )}

          <MobileFiltersSheet
            isOpen={mobileFiltersOpen}
            onClose={() => onCloseMobileFilters?.()}
            onClear={resetFilters}
            isDirty={isDirty}
            resultCount={visibleDemands.length}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          >
            {mobileFilterFields}
          </MobileFiltersSheet>
        </>
      )}
    </div>
  );
}

const popoverRowButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  height: 32,
  padding: "0 8px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
};

function mobileChipStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    height: 34,
    padding: "0 16px",
    borderRadius: 17,
    border: active ? "1px solid var(--accent-wash-strong)" : "1px solid var(--border)",
    background: active ? "var(--accent-wash)" : "transparent",
    color: active ? "var(--color-terracotta-ink)" : "var(--text-secondary)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

interface MobileFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  isDirty: boolean;
  resultCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  children: React.ReactNode;
}

/** Bottom-sheet dedicado (não é `DialogShell`: o header do mock tem "Limpar"
 * + alça, que o header fixo de DialogShell não comporta). Portal + `mounted`
 * seguem o mesmo padrão SSR-safe de `DialogShell.tsx`, permanecendo montado
 * (mesmo fechado) pra `AnimatePresence` poder tocar a saída deslizando. */
function MobileFiltersSheet({
  isOpen,
  onClose,
  onClear,
  isDirty,
  resultCount,
  soundEnabled,
  onToggleSound,
  children,
}: MobileFiltersSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "flex-end",
          background: "var(--color-scrim)",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "100%",
            maxHeight: "85dvh",
            borderRadius: "24px 24px 0 0",
            background: "var(--color-surface-canvas)",
            padding: "10px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflowY: "auto",
          }}
        >
          <div
            aria-hidden="true"
            style={{ width: 40, height: 5, borderRadius: 3, background: "var(--border)", alignSelf: "center", marginBottom: 8 }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "1.06rem", fontWeight: 700 }}>Filtros</span>
            {isDirty && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  border: "none",
                  background: "none",
                  color: "var(--color-terracotta-ink)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>

          <button
            type="button"
            onClick={onToggleSound}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 52,
              background: "none",
              border: "none",
              borderTop: "1px solid var(--border)",
              fontSize: "0.94rem",
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Som ao concluir
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                background: soundEnabled ? "var(--accent)" : "var(--color-surface-sunken)",
                position: "relative",
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: soundEnabled ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--color-surface-raised)",
                  transition: "left 0.15s",
                }}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 10,
              height: 50,
              borderRadius: 14,
              border: "none",
              background: "var(--accent)",
              color: "var(--text-primary)",
              fontSize: "0.92rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Ver {resultCount} demanda{resultCount === 1 ? "" : "s"}
          </button>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MobileFilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        height: 52,
        borderTop: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: "0.94rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
      {children}
    </div>
  );
}

function hasActiveFilter(filters: {
  scope: string;
  clientId: string | null;
  assigneeId: string | null;
  priority: string | null;
  status: string | null;
  contentType: string | null;
  hideCompleted: boolean;
  todayOnly: boolean;
  search: string;
}): boolean {
  return (
    filters.scope !== "all" ||
    filters.clientId !== null ||
    filters.assigneeId !== null ||
    filters.priority !== null ||
    filters.status !== null ||
    filters.contentType !== null ||
    filters.hideCompleted ||
    filters.todayOnly ||
    filters.search.trim() !== ""
  );
}
