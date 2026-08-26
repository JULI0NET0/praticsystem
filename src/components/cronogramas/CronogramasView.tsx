"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarRange, Plus, Search, Video } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/CustomToast";
import { formatMonthRef } from "@/lib/contentSchedule";
import { fetchContentPlans } from "@/lib/contentPlans";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import {
  channelColor,
  channelLabel,
  CONTENT_PLAN_STATUS_LABELS,
  type ContentPlan,
} from "@/types/cronogramas";
import { clientLabel } from "@/types/demandas";
import NewContentPlanModal from "./NewContentPlanModal";

export default function CronogramasView() {
  const { showToast } = useToast();
  const { getClient, demands } = useDemandas();

  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchContentPlans()
      .then((rows) => {
        if (cancelled) return;
        setPlans(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        showToast("Erro ao carregar cronogramas: " + ((err as Error)?.message ?? ""), "error");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const reload = useCallback(() => {
    fetchContentPlans().then(setPlans).catch(() => undefined);
  }, []);

  /** Progresso vem das demandas em memória, sem uma consulta por cartão. */
  const progressOf = useCallback(
    (planId: string) => {
      const items = demands.filter((demand) => demand.plan_id === planId);
      return {
        total: items.length,
        done: items.filter((demand) => demand.status_category === "fechado").length,
        captures: items.filter((demand) => demand.plan_role === "captacao").length,
      };
    },
    [demands],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return plans;
    return plans.filter((plan) => {
      const client = getClient(plan.client_id);
      return `${plan.title} ${clientLabel(client)} ${plan.month_ref}`
        .toLowerCase()
        .includes(term);
    });
  }, [plans, search, getClient]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <PageHeader
        eyebrow="Operação"
        title="Cronogramas"
        subtitle={
          loading
            ? "Carregando…"
            : `${plans.length} cronograma${plans.length === 1 ? "" : "s"} de conteúdo`
        }
        actions={
          <button type="button" className="btn btn-accent" onClick={() => setNewOpen(true)}>
            <Plus size={16} /> Novo cronograma
          </button>
        }
      />

      <div className="filter-bar">
        <label className="filter-control filter-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cliente ou competência…"
            aria-label="Buscar cronograma"
          />
        </label>
      </div>

      {!loading && visible.length === 0 && (
        <div
          className="glass-card"
          style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}
        >
          {plans.length === 0
            ? "Nenhum cronograma ainda. Crie o primeiro a partir do contrato de um cliente."
            : "Nenhum cronograma corresponde à busca."}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {visible.map((plan) => {
          const client = getClient(plan.client_id);
          const progress = progressOf(plan.id);
          const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

          return (
            <motion.div key={plan.id} whileHover={{ y: -2 }}>
              <Link
                href={`/admin/cronogramas/${plan.id}`}
                className="glass-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 18,
                  height: "100%",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarRange size={15} color="var(--accent)" />
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--accent)",
                    }}
                  >
                    {formatMonthRef(plan.month_ref)}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {CONTENT_PLAN_STATUS_LABELS[plan.status]}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {plan.title}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {clientLabel(client) || "Cliente removido"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {plan.channels.slice(0, 4).map((channel) => (
                    <span
                      key={channel}
                      style={{
                        padding: "1px 8px",
                        borderRadius: "var(--radius-badge)",
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        color: channelColor(channel),
                        background: `color-mix(in oklab, ${channelColor(channel)} 14%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${channelColor(channel)} 30%, transparent)`,
                      }}
                    >
                      {channelLabel(channel)}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: "var(--color-surface-inset)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <span>
                      {progress.done}/{progress.total} concluídas
                    </span>
                    {progress.captures > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Video size={11} /> {progress.captures}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <NewContentPlanModal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={reload}
      />
    </motion.div>
  );
}
