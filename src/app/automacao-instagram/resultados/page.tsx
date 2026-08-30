import Link from "next/link";
import { getSupabaseAdmin, type IgAutomation } from "@/lib/instagram";

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
            <span className="w-36 text-xs text-neutral-400 shrink-0">{stage.label}</span>
            <div className="flex-1 bg-neutral-800 rounded-full h-8 relative overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full flex items-center justify-end px-3 transition-all"
                style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
              >
                {pct >= 15 && (
                  <span className="text-xs font-medium text-white">{stage.count}</span>
                )}
              </div>
              {pct < 15 && (
                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-medium text-neutral-300">
                  {stage.count}
                </span>
              )}
            </div>
            <span className="w-12 text-xs text-neutral-500 text-right shrink-0">{pct}%</span>
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
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-8 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Resultados</h1>
            <p className="text-neutral-400 text-sm">Funil: comentário → DM → clique no link</p>
          </div>
          <Link
            href="/automacao-instagram"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            ← Voltar
          </Link>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm text-neutral-400 mb-4">Total (todas as automações)</h2>
          <Funnel
            stages={[
              { label: "Comentários", count: overall.comments },
              { label: "DMs enviadas", count: overall.sent },
              { label: "Cliques no link", count: overall.clicks },
            ]}
          />
        </div>

        {automations.length === 0 && (
          <p className="text-neutral-500 text-sm py-6 text-center border border-dashed border-neutral-800 rounded-xl">
            Nenhuma automação criada ainda.
          </p>
        )}

        <div className="space-y-4">
          {automations.map((automation) => {
            const stats = statsFor(automation.id);
            return (
              <div
                key={automation.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-medium">{automation.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      automation.is_active
                        ? "bg-green-500/15 text-green-400"
                        : "bg-neutral-800 text-neutral-500"
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
