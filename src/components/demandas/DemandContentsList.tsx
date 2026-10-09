"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import PlanItemRow from "@/components/cronogramas/PlanItemRow";
import { formatMonthRef } from "@/lib/contentSchedule";
import { clientLabel, type Demand } from "@/types/demandas";
import type { ContentPlan } from "@/types/cronogramas";
import { useDemandas } from "./DemandasProvider";

interface Props {
  demands: Demand[];
  onOpenDemand: (id: string) => void;
  selectedIds?: Set<string>;
  onSelectDemand?: (id: string, event: React.MouseEvent) => void;
}

interface PlanGroup {
  plan: ContentPlan;
  demands: Demand[];
}

interface ClientGroup {
  key: string;
  label: string;
  plans: PlanGroup[];
}

function byDueDate(a: Demand, b: Demand): number {
  const da = a.due_date ?? "9999-99-99";
  const db = b.due_date ?? "9999-99-99";
  if (da !== db) return da.localeCompare(db);
  return (a.position ?? 0) - (b.position ?? 0);
}

/** Posts visíveis, agrupados por cliente e, dentro, por cronograma. */
function groupContents(
  demands: Demand[],
  plans: ContentPlan[],
  labelOf: (clientId: string | null) => string,
): ClientGroup[] {
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const clients = new Map<string, { label: string; plans: Map<string, Demand[]> }>();

  for (const demand of demands) {
    const plan = demand.plan_id ? plansById.get(demand.plan_id) : undefined;
    if (!plan) continue;

    const clientId = demand.client_id ?? plan.client_id ?? null;
    const key = clientId ?? "__none__";
    let client = clients.get(key);
    if (!client) {
      client = { label: labelOf(clientId) || "Sem cliente", plans: new Map() };
      clients.set(key, client);
    }
    const list = client.plans.get(plan.id) ?? [];
    list.push(demand);
    client.plans.set(plan.id, list);
  }

  return [...clients.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "pt-BR"))
    .map(([key, client]) => ({
      key,
      label: client.label,
      plans: [...client.plans.entries()]
        .map(([planId, items]) => ({
          plan: plansById.get(planId)!,
          demands: [...items].sort(byDueDate),
        }))
        .sort((a, b) => {
          const month = (b.plan.month_ref ?? "").localeCompare(a.plan.month_ref ?? "");
          if (month !== 0) return month;
          return a.plan.title.localeCompare(b.plan.title, "pt-BR");
        }),
    }));
}

export default function DemandContentsList({
  demands,
  onOpenDemand,
  selectedIds,
  onSelectDemand,
}: Props) {
  const { contentPlans, contentPlansLoading, getClient } = useDemandas();

  const groups = useMemo(() => {
    if (!contentPlans) return [];
    return groupContents(demands, contentPlans, (clientId) => clientLabel(getClient(clientId)));
  }, [demands, contentPlans, getClient]);

  if (contentPlansLoading || !contentPlans) {
    return (
      <p style={{ margin: 0, padding: "28px 8px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.86rem" }}>
        Carregando conteúdos…
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p style={{ margin: 0, padding: "28px 8px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.86rem" }}>
        Nenhum conteúdo nos cronogramas cadastrados.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {groups.map((client) => (
        <section key={client.key} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2
            style={{
              margin: 0,
              padding: "0 8px",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
            }}
          >
            {client.label}
          </h2>

          {client.plans.map(({ plan, demands: items }) => (
            <div key={plan.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
                <CalendarRange size={13} color="var(--text-tertiary)" />
                <Link
                  href={`/admin/cronogramas/${plan.id}`}
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {plan.title}
                  <span style={{ fontWeight: 500, color: "var(--text-tertiary)" }}>
                    {" "}
                    · {formatMonthRef(plan.month_ref)}
                  </span>
                </Link>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-tertiary)" }}>
                  {items.length}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((demand) => (
                  <PlanItemRow
                    key={demand.id}
                    demand={demand}
                    onOpen={onOpenDemand}
                    selected={selectedIds?.has(demand.id) ?? false}
                    onSelect={onSelectDemand}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
