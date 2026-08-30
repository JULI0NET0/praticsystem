import Link from "next/link";
import { getSupabaseAdmin, type IgAutomation } from "@/lib/instagram";
import { ArrowLeft, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

interface FunnelStage {
  label: string;
  count: number;
}

function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.count || 0;

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const pct = top > 0 ? Math.round((stage.count / top) * 100) : 0;
        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-36 text-xs text-[var(--color-text-secondary)] font-medium shrink-0">
              {stage.label}
            </span>
            <div className="flex-1 bg-[var(--color-surface-sunken)] rounded-full h-8 relative overflow-hidden">
              <div
                className="h-full bg-[var(--color-terracotta)] rounded-full flex items-center justify-end px-3 transition-all"
                style={{ width: `${Math.max(pct, stage.count > 0 ? 5 : 0)}%` }}
              >
                {pct >= 15 && (
                  <span className="text-xs font-bold text-[var(--color-text-on-accent)]">
                    {stage.count}
                  </span>
                )}
              </div>
              {pct < 15 && (
                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-[var(--color-text-primary)]">
                  {stage.count}
                </span>
              )}
            </div>
            <span className="w-12 text-xs text-[var(--color-text-muted)] text-right shrink-0">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function ResultsPage() {
  const supabase = getSupabaseAdmin();

  const [automationsRes, queueRes, clicksRes] = await Promise.all([
    supabase.from("ig_automations").select("*").order("created_at", { ascending: false }),
    supabase.from("ig_message_queue").select("automation_id, status"),
    supabase.from("ig_link_clicks").select("automation_id"),
  ]);

  const automations = (automationsRes.data || []) as IgAutomation[];
  const queue = queueRes.data || [];
  const clicks = clicksRes.data || [];

  function statsFor(automationId: string | null) {
    const matches = automationId
      ? queue.filter((q) => q.automation_id === automationId)
      : queue;
    const sent = matches.filter((q) => q.status === "sent").length;
    const clickCount = (
      automationId ? clicks.filter((c) => c.automation_id === automationId) : clicks
    ).length;
    return {
      comments: matches.length,
      sent,
      clicks: clickCount,
    };
  }

  const overall = statsFor(null);

  return (
    <div className="min-h-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-primary)] px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)] flex items-center justify-center font-bold shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
                Resultados do Funil
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Comentários no Instagram ➔ DMs entregues ➔ Cliques no link rastreável
              </p>
            </div>
          </div>
          <Link
            href="/automacao-instagram"
            className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-sunken)] px-3.5 py-2 rounded-lg font-semibold text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Link>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
            Total Consolidado (Todas as Automações)
          </h2>
          <Funnel
            stages={[
              { label: "Comentários", count: overall.comments },
              { label: "DMs enviadas", count: overall.sent },
              { label: "Cliques no link", count: overall.clicks },
            ]}
          />
        </div>

        {automations.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-xs py-8 text-center bg-[var(--color-surface-raised)] border border-dashed border-[var(--color-border-default)] rounded-2xl">
            Nenhuma automação criada ainda.
          </p>
        )}

        <div className="space-y-4">
          {automations.map((automation) => {
            const stats = statsFor(automation.id);
            return (
              <div
                key={automation.id}
                className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                    {automation.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      automation.is_active
                        ? "bg-[var(--color-success-wash)] text-[var(--color-success-ink)]"
                        : "bg-[var(--color-surface-inset)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {automation.is_active ? "Ativa" : "Pausada"}
                  </span>
                </div>
                <Funnel
                  stages={[
                    { label: "Comentários", count: stats.comments },
                    { label: "DMs enviadas", count: stats.sent },
                    { label: "Cliques no link", count: stats.clicks },
                  ]}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
