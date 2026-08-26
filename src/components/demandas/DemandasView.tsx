"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, SlidersHorizontal, List, LayoutGrid } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import type { DemandListGroupBy, DemandView } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandFilters from "./DemandFilters";
import DemandViewSwitcher from "./DemandViewSwitcher";
import DemandGroupBySwitcher from "./DemandGroupBySwitcher";
import DemandListView from "./DemandListView";
import DemandKanban from "./DemandKanban";
import DemandModal from "./DemandModal";
import NewDemandModal from "./NewDemandModal";
import StatusManagerModal from "./StatusManagerModal";
import BatchActionsBar from "./BatchActionsBar";

const VIEW_STORAGE_KEY = "pratic-demandas-view";
const GROUPBY_STORAGE_KEY = "pratic-demandas-groupby";

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

export default function DemandasView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visibleDemands, demands, loading, filters } = useDemandas();

  const [view, setView] = useState<DemandView>(readStoredView);
  const [groupBy, setGroupBy] = useState<DemandListGroupBy>(readStoredGroupBy);
  const [explicitId, setExplicitId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);

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
    return { open, overdue, total: visibleDemands.length };
  }, [visibleDemands]);

  const subtitle = loading
    ? "Carregando…"
    : `${counts.total} de ${demands.length} demandas · ${counts.open} em aberto` +
      (counts.overdue > 0 ? ` · ${counts.overdue} atrasada${counts.overdue > 1 ? "s" : ""}` : "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <PageHeader
        eyebrow="Operação"
        title="Demandas"
        subtitle={subtitle}
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStatusManagerOpen(true)}
            >
              <SlidersHorizontal size={15} /> Status
            </button>
            <button type="button" className="btn btn-accent" onClick={() => setNewOpen(true)}>
              <Plus size={16} /> Nova demanda <kbd style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: 4 }}>N</kbd>
            </button>
          </>
        }
      />

      <DemandFilters />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <DemandViewSwitcher active={view} onChange={changeView} />

        {view === "list" && (
          <>
            <DemandGroupBySwitcher active={groupBy} onChange={changeGroupBy} />
            {groupBy === "status" && (
              <button
                type="button"
                onClick={() => setStatusManagerOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: "1px dashed var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                }}
              >
                <SlidersHorizontal size={14} />
                Gerenciar status
              </button>
            )}
          </>
        )}
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
        />
      )}

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

      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        totalVisible={visibleDemands.length}
      />
    </motion.div>
  );
}


