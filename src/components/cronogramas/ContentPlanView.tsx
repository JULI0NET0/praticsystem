"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { CalendarRange, ChevronLeft, Lightbulb, PenLine, Trash2, Trophy } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/CustomToast";
import { formatMonthRef } from "@/lib/contentSchedule";
import {
  deleteContentPlan,
  fetchContentPlan,
  fetchPlanDemands,
  updateContentPlan,
} from "@/lib/contentPlans";
import { useDemandas } from "@/components/demandas/DemandasProvider";
import DemandModal from "@/components/demandas/DemandModal";
import PlanItemRow from "./PlanItemRow";
import DeletePlanDialog from "./DeletePlanDialog";
import BatchActionsBar from "@/components/demandas/BatchActionsBar";
import MentionTextarea from "@/components/demandas/MentionTextarea";
import type { QuickCatalogs } from "@/lib/quickParse";
import {
  channelColor,
  channelLabel,
  CONTENT_PLAN_STATUS_LABELS,
  type ContentPlan,
} from "@/types/cronogramas";
import { clientLabel, type Demand } from "@/types/demandas";

const BlockEditor = dynamic(() => import("@/components/notas/BlockEditor"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 14, color: "var(--text-tertiary)", fontSize: "0.84rem" }}>
      Carregando editor…
    </div>
  ),
});

const SAVE_DELAY = 900;

export default function ContentPlanView({ planId }: { planId: string }) {
  const { showToast } = useToast();
  const { getClient, demands: allDemands, users, clients } = useDemandas();

  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [planDemands, setPlanDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  const load = useCallback(async () => {
    try {
      const [planRow, demandRows] = await Promise.all([
        fetchContentPlan(planId),
        fetchPlanDemands(planId),
      ]);
      setPlan(planRow);
      setPlanDemands(demandRows);
    } catch (err) {
      showToast("Erro ao carregar cronograma: " + ((err as Error)?.message ?? ""), "error");
    } finally {
      setLoading(false);
    }
  }, [planId, showToast]);

  useEffect(() => {
    let cancelled = false;
    fetchContentPlan(planId)
      .then((planRow) => {
        if (!cancelled) setPlan(planRow);
        return fetchPlanDemands(planId);
      })
      .then((demandRows) => {
        if (!cancelled) {
          setPlanDemands(demandRows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        showToast("Erro ao carregar cronograma: " + ((err as Error)?.message ?? ""), "error");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, showToast]);

  /**
   * As linhas vêm do provider de demandas quando ele já as tem em memória —
   * assim marcar uma etapa concluída no modal reflete aqui na hora, em vez de
   * esperar um recarregamento da página.
   */
  const rows = useMemo(() => {
    const live = new Map(allDemands.map((demand) => [demand.id, demand]));
    return planDemands.map((demand) => live.get(demand.id) ?? demand);
  }, [planDemands, allDemands]);

  const posts = rows.filter(
    (demand) => demand.plan_role !== "captacao" && demand.plan_role !== "roteiro",
  );
  // Roteiro e captação na mesma seção: `position` já os intercala aos pares
  // na geração, então o roteiro cai logo acima da captação que ele serve.
  const producao = rows
    .filter((demand) => demand.plan_role === "captacao" || demand.plan_role === "roteiro")
    .sort((a, b) => a.position - b.position);
  const captures = producao.filter((demand) => demand.plan_role === "captacao");
  const donePosts = posts.filter((demand) => demand.status_category === "fechado").length;

  const catalogs = useMemo<QuickCatalogs>(
    () => ({
      users: users.map((user) => ({ id: user.id, label: user.name || user.email })),
      clients: clients.map((item) => ({
        id: item.id,
        label: clientLabel(item),
        alias: item.name,
      })),
    }),
    [users, clients],
  );

  /** Seleção com shift/meta-click, mesmo gesto da lista de Demandas. */
  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitTitle = () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!plan || !trimmed || trimmed === plan.title) return;
    setPlan({ ...plan, title: trimmed });
    updateContentPlan(plan.id, { title: trimmed }).catch((err) =>
      showToast("Erro ao renomear: " + ((err as Error)?.message ?? ""), "error"),
    );
  };

  const confirmDelete = async (deleteDemands: boolean) => {
    if (!plan) return;
    setDeleteOpen(false);
    try {
      await deleteContentPlan(plan.id, { deleteDemands });
      showToast(
        deleteDemands ? "Cronograma e demandas excluídos." : "Cronograma excluído.",
        "success",
      );
      window.location.href = "/admin/cronogramas";
    } catch (err) {
      showToast("Erro ao excluir: " + ((err as Error)?.message ?? ""), "error");
    }
  };

  const saveField = (field: "description" | "results", content: unknown) => {
    if (!plan) return;
    window.clearTimeout(timers[field]);
    timers[field] = window.setTimeout(() => {
      updateContentPlan(plan.id, { [field]: content } as Partial<ContentPlan>).catch((err) =>
        showToast("Erro ao salvar: " + ((err as Error)?.message ?? ""), "error"),
      );
    }, SAVE_DELAY);
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
        Carregando cronograma…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
        Cronograma não encontrado.{" "}
        <Link href="/admin/cronogramas" style={{ color: "var(--accent)" }}>
          Voltar
        </Link>
      </div>
    );
  }

  const client = getClient(plan.client_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <Link
        href="/admin/cronogramas"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={14} /> Cronogramas
      </Link>

      <PageHeader
        eyebrow={client ? clientLabel(client) : "Cronograma"}
        title={
          editingTitle ? (
            <MentionTextarea
              value={titleDraft}
              onChange={setTitleDraft}
              catalogs={catalogs}
              rows={1}
              onSubmit={commitTitle}
              ariaLabel="Nome do cronograma"
              placeholder="Nome do cronograma…"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleDraft(plan.title);
                setEditingTitle(true);
              }}
              title="Clique para renomear"
              style={{
                padding: "2px 6px",
                marginLeft: -6,
                border: "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                cursor: "text",
                font: "inherit",
                color: "inherit",
                textAlign: "left",
              }}
            >
              {plan.title}
            </button>
          )
        }
        subtitle={`${formatMonthRef(plan.month_ref)} · ${posts.length} conteúdos · ${donePosts} publicados${
          captures.length ? ` · ${captures.length} captações` : ""
        }`}
        actions={
          <>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "var(--text-secondary)",
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--border)",
              }}
            >
              {CONTENT_PLAN_STATUS_LABELS[plan.status]}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteOpen(true)}
              title="Excluir cronograma"
            >
              <Trash2 size={15} /> Excluir
            </button>
          </>
        }
      />

      {/* Canais do plano */}
      {plan.channels.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {plan.channels.map((channel) => (
            <span
              key={channel}
              style={{
                padding: "2px 9px",
                borderRadius: "var(--radius-badge)",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: channelColor(channel),
                background: `color-mix(in oklab, ${channelColor(channel)} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${channelColor(channel)} 32%, transparent)`,
              }}
            >
              {channelLabel(channel)}
            </span>
          ))}
        </div>
      )}

      <Section title="Planejamento" icon={<Lightbulb size={14} />}>
        <div style={editorBoxStyle}>
          <BlockEditor
            key={`desc-${plan.id}`}
            content={plan.description ?? undefined}
            bucket="demand-attachments"
            placeholder="Ideias, estratégia, referências e observações do mês…"
            onChange={(content) => saveField("description", content)}
          />
        </div>
      </Section>

      {producao.length > 0 && (
        <Section
          title="Roteiro e captação"
          icon={<PenLine size={14} />}
          count={producao.length}
        >
          {producao.map((demand) => (
            <PlanItemRow
              key={demand.id}
              demand={demand}
              onOpen={setSelectedId}
              selected={selectedIds.has(demand.id)}
              onSelect={toggleSelection}
            />
          ))}
        </Section>
      )}

      <Section title="Conteúdos" icon={<CalendarRange size={14} />} count={posts.length}>
        {posts.length === 0 ? (
          <Empty>Nenhum conteúdo neste cronograma.</Empty>
        ) : (
          posts.map((demand) => (
            <PlanItemRow
              key={demand.id}
              demand={demand}
              onOpen={setSelectedId}
              selected={selectedIds.has(demand.id)}
              onSelect={toggleSelection}
            />
          ))
        )}
      </Section>

      <Section title="Resultados" icon={<Trophy size={14} />}>
        <div style={editorBoxStyle}>
          <BlockEditor
            key={`res-${plan.id}`}
            content={plan.results ?? undefined}
            bucket="demand-attachments"
            placeholder="Métricas, prints, aprendizados do período…"
            onChange={(content) => saveField("results", content)}
          />
        </div>
      </Section>

      <DemandModal
        demandId={selectedId}
        onClose={() => {
          setSelectedId(null);
          load();
        }}
      />

      {/* A mesma barra das Demandas: status, prazo, prioridade, concluir, excluir */}
      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds(new Set())}
        onSelectAll={() => setSelectedIds(new Set(rows.map((demand) => demand.id)))}
        totalVisible={rows.length}
      />

      <DeletePlanDialog
        isOpen={deleteOpen}
        planId={plan.id}
        planTitle={plan.title}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
}

/** Timers de autosave por campo — fora do componente, um por montagem basta. */
const timers: Record<string, number> = {};

const editorBoxStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--color-surface-sunken)",
  padding: "6px 12px",
};

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-tertiary)",
        }}
      >
        {icon}
        {title}
        {count !== undefined && (
          <span
            style={{
              fontWeight: 700,
              background: "var(--color-surface-sunken)",
              padding: "1px 8px",
              borderRadius: 8,
            }}
          >
            {count}
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", padding: "8px 0" }}>
      {children}
    </span>
  );
}
