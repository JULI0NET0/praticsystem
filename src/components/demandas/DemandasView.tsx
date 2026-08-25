"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, SlidersHorizontal } from "lucide-react";
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

const VIEW_STORAGE_KEY = "pratic-demandas-view";
const GROUPBY_STORAGE_KEY = "pratic-demandas-groupby";

function readStoredView(): DemandView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "list" || stored === "board") return stored;
  } catch {
    // localStorage indisponível (janela privada, site data bloqueado)
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

  // Restaura a última visualização escolhida (preferência por navegador).
  // Ler no inicializador é seguro aqui: useSearchParams abaixo já faz esta
  // subárvore ser renderizada só no cliente, então não há hidratação a bater.
  const [view, setView] = useState<DemandView>(readStoredView);
  const [groupBy, setGroupBy] = useState<DemandListGroupBy>(readStoredGroupBy);
  const [explicitId, setExplicitId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);

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

  // ?d=<id> abre o drawer direto — usado pelo widget do WorkSpace e pela ficha
  // do cliente. Derivado da URL em vez de copiado para o estado num efeito:
  // fechar limpa o query param, então os dois voltam a ser nulos juntos.
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
              <Plus size={16} /> Nova demanda
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
        <DemandListView demands={visibleDemands} onOpenDemand={setExplicitId} groupBy={groupBy} />
      ) : (
        <DemandKanban
          demands={visibleDemands}
          onOpenDemand={setExplicitId}
          onManageStatuses={() => setStatusManagerOpen(true)}
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
    </motion.div>
  );
}
