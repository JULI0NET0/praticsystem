"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";
import DropdownMenu from "@/components/ui/DropdownMenu";
import type { DemandKanbanGroupBy, DemandListGroupBy, DemandScope, DemandView } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandFilters from "./DemandFilters";
import DemandKanbanGroupBySwitcher from "./DemandKanbanGroupBySwitcher";
import DemandListView from "./DemandListView";
import DemandKanban from "./DemandKanban";
import DemandModal from "./DemandModal";
import NewDemandModal from "./NewDemandModal";
import StatusManagerModal from "./StatusManagerModal";
import BatchActionsBar from "./BatchActionsBar";
import WhatsAppSummaryModal from "./WhatsAppSummaryModal";
import { WhatsAppIcon } from "@/components/SocialIcons";

const VIEW_STORAGE_KEY = "pratic-demandas-view";
const GROUPBY_STORAGE_KEY = "pratic-demandas-groupby";
const KANBAN_GROUPBY_STORAGE_KEY = "pratic-demandas-kanban-groupby";

const SCOPES: { value: DemandScope | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "client", label: "Clientes" },
  { value: "internal", label: "Internas" },
];

const LIST_GROUPBY_LABEL: Record<DemandListGroupBy, string> = {
  due: "Prazo",
  status: "Status",
};

function readStoredView(): DemandView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "list" || stored === "board") return stored;
  } catch {
    // localStorage indisponível
  }
  return "list";
}

function readStoredGroupBy(): DemandListGroupBy {
  try {
    const stored = window.localStorage.getItem(GROUPBY_STORAGE_KEY);
    if (stored === "due" || stored === "status") return stored;
  } catch {
    // localStorage indisponível
  }
  return "due";
}

function readStoredKanbanGroupBy(): DemandKanbanGroupBy {
  try {
    const stored = window.localStorage.getItem(KANBAN_GROUPBY_STORAGE_KEY);
    if (stored === "status" || stored === "priority") return stored;
  } catch {
    // localStorage indisponível
  }
  return "status";
}

export default function DemandasView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visibleDemands, loading, filters, setFilters } = useDemandas();

  const [view, setView] = useState<DemandView>(readStoredView);
  const [groupBy, setGroupBy] = useState<DemandListGroupBy>(readStoredGroupBy);
  const [kanbanGroupBy, setKanbanGroupBy] = useState<DemandKanbanGroupBy>(readStoredKanbanGroupBy);
  const [explicitId, setExplicitId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Estado da seleção múltipla / em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Processa query params da URL (?view=list|board, ?action=new / ?new=true)
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "list" || viewParam === "board") {
      changeView(viewParam);
    } else if (viewParam === "kanban") {
      changeView("board");
    }

    const actionParam = searchParams.get("action") || searchParams.get("new");
    if (actionParam === "new" || actionParam === "true") {
      setNewOpen(true);
    }
  }, [searchParams]);

  // Limpa seleção quando os filtros mudam ou remove demandas não mais visíveis
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleSet = new Set(visibleDemands.map((d) => d.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleSet.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [visibleDemands]);

  // Manipulação de seleção com suporte a Shift (Intervalo) e Cmd/Ctrl (Toggle)
  const handleSelectDemand = useCallback(
    (id: string, event: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (event.shiftKey && lastSelectedId) {
          const idsList = visibleDemands.map((d) => d.id);
          const lastIndex = idsList.indexOf(lastSelectedId);
          const currentIndex = idsList.indexOf(id);

          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            for (let i = start; i <= end; i++) {
              next.add(idsList[i]);
            }
            return next;
          }
        }

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });

      setLastSelectedId(id);
    },
    [lastSelectedId, visibleDemands],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(visibleDemands.map((d) => d.id)));
  }, [visibleDemands]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Atalhos de teclado locais para Demandas (N, L, K, Cmd+A, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputOrTextArea =
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable;
      if (isInputOrTextArea) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleClearSelection();
        }
      } else if (isCmdOrCtrl && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSelectAll();
      } else if ((e.key === "n" || e.key === "N") && !isCmdOrCtrl) {
        e.preventDefault();
        setNewOpen(true);
      } else if ((e.key === "l" || e.key === "L") && !isCmdOrCtrl) {
        e.preventDefault();
        changeView("list");
      } else if ((e.key === "k" || e.key === "K") && !isCmdOrCtrl) {
        e.preventDefault();
        changeView("board");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, handleClearSelection, handleSelectAll]);

  const changeView = (next: DemandView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignora
    }
  };

  const changeGroupBy = (next: DemandListGroupBy) => {
    setGroupBy(next);
    try {
      window.localStorage.setItem(GROUPBY_STORAGE_KEY, next);
    } catch {
      // ignora
    }
  };

  const changeKanbanGroupBy = (next: DemandKanbanGroupBy) => {
    setKanbanGroupBy(next);
    try {
      window.localStorage.setItem(KANBAN_GROUPBY_STORAGE_KEY, next);
    } catch {
      // ignora
    }
  };

  const deepLinkId = searchParams.get("d");
  const selectedId = explicitId ?? deepLinkId;

  const closeDrawer = () => {
    setExplicitId(null);
    if (deepLinkId) router.replace("/admin/demandas");
  };

  const counts = useMemo(() => {
    const open = visibleDemands.filter((d) => d.status_category !== "fechado").length;
    const overdue = visibleDemands.filter(
      (d) =>
        d.status_category !== "fechado" &&
        d.due_date &&
        d.due_date < new Date().toISOString().slice(0, 10),
    ).length;
    return { open, overdue };
  }, [visibleDemands]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "0 2px" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
          Demandas
        </h1>
        <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
          {loading ? (
            "Carregando…"
          ) : (
            <>
              {counts.open} em aberto
              {counts.overdue > 0 && (
                <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                  {" · "}
                  {counts.overdue} atrasada{counts.overdue > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </span>

        <div className="demandas-header-actions-desktop">
          <button
            type="button"
            className="demandas-header-icon-btn"
            onClick={() => setWhatsappModalOpen(true)}
            title="Copiar resumo formatado para o WhatsApp da equipe"
            aria-label="Resumo para WhatsApp"
          >
            <WhatsAppIcon size={15} />
          </button>
          <button
            type="button"
            className="demandas-header-icon-btn"
            onClick={() => setStatusManagerOpen(true)}
            title="Gerenciar status"
            aria-label="Gerenciar status"
          >
            <SlidersHorizontal size={15} />
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> Nova demanda
            <kbd
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                background: "color-mix(in oklab, var(--text-primary) 12%, transparent)",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              N
            </kbd>
          </button>
        </div>

        <div className="demandas-header-actions-mobile">
          <button
            type="button"
            className="demandas-header-icon-btn"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Buscar"
            aria-pressed={mobileSearchOpen}
          >
            <Search size={17} />
          </button>
          <button
            type="button"
            className="demandas-header-icon-btn"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Filtros"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </div>

      <DemandFilters
        mobileSearchOpen={mobileSearchOpen}
        onCloseMobileSearch={() => setMobileSearchOpen(false)}
        mobileFiltersOpen={mobileFiltersOpen}
        onCloseMobileFilters={() => setMobileFiltersOpen(false)}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
        }}
      >
        {SCOPES.map((scope) => {
          const active = filters.scope === scope.value;
          return (
            <button
              key={scope.value}
              type="button"
              onClick={() => setFilters({ scope: scope.value })}
              style={{
                flexShrink: 0,
                padding: "0 0 10px",
                marginBottom: -1,
                border: "none",
                borderBottom: active ? "2px solid var(--text-primary)" : "2px solid transparent",
                background: "none",
                fontSize: "0.82rem",
                fontWeight: active ? 700 : 600,
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {scope.label}
            </button>
          );
        })}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", paddingBottom: 6, flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 2,
              padding: 2,
              borderRadius: 8,
              background: "var(--color-surface-sunken)",
            }}
          >
            {(["list", "board"] as DemandView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => changeView(v)}
                aria-pressed={view === v}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: view === v ? "var(--color-surface-inset)" : "transparent",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: view === v ? "var(--text-primary)" : "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {v === "list" ? "Lista" : "Kanban"}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 14, background: "var(--border)" }} />

          {view === "list" ? (
            <DropdownMenu
              align="right"
              trigger={
                <button
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    border: "none",
                    background: "none",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Agrupar: {LIST_GROUPBY_LABEL[groupBy]} ▾
                </button>
              }
              items={[
                { label: "Prazo", icon: Calendar, action: () => changeGroupBy("due") },
                { label: "Status", icon: ListChecks, action: () => changeGroupBy("status") },
              ]}
            />
          ) : (
            <DemandKanbanGroupBySwitcher active={kanbanGroupBy} onChange={changeKanbanGroupBy} />
          )}
        </div>
      </div>

      {view === "list" ? (
        <DemandListView
          demands={visibleDemands}
          onOpenDemand={setExplicitId}
          groupBy={groupBy}
          selectedIds={selectedIds}
          onSelectDemand={handleSelectDemand}
        />
      ) : (
        <DemandKanban
          demands={visibleDemands}
          onOpenDemand={setExplicitId}
          onManageStatuses={() => setStatusManagerOpen(true)}
          selectedIds={selectedIds}
          onSelectDemand={handleSelectDemand}
          groupBy={kanbanGroupBy}
        />
      )}

      <button
        type="button"
        className="demandas-fab"
        onClick={() => setNewOpen(true)}
        aria-label="Nova demanda"
      >
        <Plus size={26} />
      </button>

      <DemandModal demandId={selectedId} onClose={closeDrawer} />

      <NewDemandModal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(demand) => setExplicitId(demand.id)}
        defaultClientId={filters.clientId}
      />

      <StatusManagerModal
        isOpen={statusManagerOpen}
        onClose={() => setStatusManagerOpen(false)}
      />

      <WhatsAppSummaryModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        initialSelectedIds={Array.from(selectedIds)}
      />

      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        totalVisible={visibleDemands.length}
        onOpenWhatsApp={() => setWhatsappModalOpen(true)}
      />
    </motion.div>
  );
}
