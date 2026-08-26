"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DemandasProvider, useDemandas } from "@/components/demandas/DemandasProvider";
import DemandViewSwitcher from "@/components/demandas/DemandViewSwitcher";
import DemandGroupBySwitcher from "@/components/demandas/DemandGroupBySwitcher";
import DemandListView from "@/components/demandas/DemandListView";
import DemandKanban from "@/components/demandas/DemandKanban";
import DemandModal from "@/components/demandas/DemandModal";
import StatusManagerModal from "@/components/demandas/StatusManagerModal";
import type { DemandListGroupBy, DemandView } from "@/types/demandas";

export const VIEW_STORAGE_KEY = "pratic-demandas-view";
export const GROUPBY_STORAGE_KEY = "pratic-demandas-groupby";

// Mesma chave/lógica de src/components/demandas/DemandasView.tsx, duplicada
// de propósito: importar dali arrastaria uma dependência de router para
// dentro do WorkSpace por causa de um helper de 10 linhas.
export function readStoredView(): DemandView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "list" || stored === "board") return stored;
  } catch {
    // localStorage indisponível
  }
  return "list";
}

export function readStoredGroupBy(): DemandListGroupBy {
  try {
    const stored = window.localStorage.getItem(GROUPBY_STORAGE_KEY);
    if (stored === "due" || stored === "status") return stored;
  } catch {
    // localStorage indisponível
  }
  return "due";
}

interface Props {
  view: DemandView;
  onViewChange: (view: DemandView) => void;
  groupBy: DemandListGroupBy;
  onGroupByChange: (groupBy: DemandListGroupBy) => void;
}

export default function DemandsWidget(props: Props) {
  return (
    <DemandasProvider>
      <DemandsWidgetInner {...props} />
    </DemandasProvider>
  );
}

function DemandsWidgetInner({ view, onViewChange, groupBy, onGroupByChange }: Props) {
  const { currentUser } = useAuth();
  const { demands, loading } = useDemandas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);

  // Mesmo escopo que fetchWorkspaceData já usava: aberta e (minha ou do time todo).
  const myOpenDemands = useMemo(
    () =>
      demands.filter(
        (d) =>
          d.status_category !== "fechado" &&
          (d.assignee_ids?.includes(currentUser?.id ?? "") || d.assign_all_team),
      ),
    [demands, currentUser?.id],
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: 0,
          }}
        >
          <CheckCircle2 size={20} color="var(--accent)" /> Minhas Demandas
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              background: "var(--color-surface-sunken)",
              padding: "4px 10px",
              borderRadius: 10,
            }}
          >
            {myOpenDemands.length} Pendentes
          </span>
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <DemandViewSwitcher active={view} onChange={onViewChange} />
          {view === "list" && (
            <DemandGroupBySwitcher active={groupBy} onChange={onGroupByChange} />
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", paddingRight: 4 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5)" }}>
            <Loader2 size={24} className="animate-spin" color="var(--accent)" />
          </div>
        ) : myOpenDemands.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "var(--color-surface-sunken)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Inbox size={32} strokeWidth={1} color="var(--text-tertiary)" />
            </div>
            <div>
              <p style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                Tudo em dia!
              </p>
              <p style={{ opacity: 0.7 }}>Você não tem demandas pendentes.</p>
            </div>
          </div>
        ) : view === "list" ? (
          <DemandListView demands={myOpenDemands} onOpenDemand={setSelectedId} groupBy={groupBy} />
        ) : (
          <DemandKanban
            demands={myOpenDemands}
            onOpenDemand={setSelectedId}
            onManageStatuses={() => setStatusManagerOpen(true)}
          />
        )}
      </div>

      <DemandModal demandId={selectedId} onClose={() => setSelectedId(null)} />
      <StatusManagerModal isOpen={statusManagerOpen} onClose={() => setStatusManagerOpen(false)} />
    </div>
  );
}
