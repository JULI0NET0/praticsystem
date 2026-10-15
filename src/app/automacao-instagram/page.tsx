import { Suspense } from "react";
import { getIgConfig, getSupabaseAdmin, type IgAutomation } from "@/lib/instagram";
import { buildDailySeries, statsByAutomation } from "@/lib/instagramStats";
import AutomationsClient, { type DashboardData } from "./AutomationsClient";

export const dynamic = "force-dynamic";

const SERIES_DAYS = 30;

export default async function InstagramAutomationPage() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const since30 = new Date(now.getTime() - SERIES_DAYS * 86_400_000).toISOString();
  const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [
    config,
    automationsRes,
    logsRes,
    pendingCountRes,
    failedCountRes,
    sentCountRes,
    contactsRes,
    contactsCountRes,
    newContactsRes,
    commentsCountRes,
    clicksCountRes,
    queueStatsRes,
    clickRowsRes,
    contactsSeriesRes,
    sentSeriesRes,
  ] = await Promise.all([
    getIgConfig(supabase),
    supabase.from("ig_automations").select("*").order("created_at", { ascending: false }),
    supabase.from("ig_logs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("ig_message_queue").select("id", head).eq("status", "pending"),
    supabase.from("ig_message_queue").select("id", head).eq("status", "failed"),
    supabase.from("ig_message_queue").select("id", head).eq("status", "sent"),
    supabase.from("ig_contacts").select("*").order("last_seen_at", { ascending: false }).limit(500),
    supabase.from("ig_contacts").select("id", head),
    supabase.from("ig_contacts").select("id", head).gte("first_seen_at", since7),
    supabase.from("ig_message_queue").select("id", head).not("comment_id", "is", null),
    supabase.from("ig_link_clicks").select("id", head),
    // Por automação: as linhas mais recentes (o PostgREST corta em 1000 por padrão).
    supabase
      .from("ig_message_queue")
      .select("automation_id, status, comment_id")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("ig_link_clicks")
      .select("automation_id, clicked_at")
      .order("clicked_at", { ascending: false })
      .limit(1000),
    supabase.from("ig_contacts").select("first_seen_at").gte("first_seen_at", since30).limit(1000),
    supabase
      .from("ig_message_queue")
      .select("sent_at")
      .eq("status", "sent")
      .gte("sent_at", since30)
      .limit(1000),
  ]);

  const clickRows = clickRowsRes.data || [];
  const dashboard: DashboardData = {
    counts: {
      contacts: contactsCountRes.count || 0,
      newContacts7d: newContactsRes.count || 0,
      comments: commentsCountRes.count || 0,
      sent: sentCountRes.count || 0,
      clicks: clicksCountRes.count || 0,
    },
    series: buildDailySeries(
      {
        contatos: (contactsSeriesRes.data || []).map((r) => r.first_seen_at),
        dms: (sentSeriesRes.data || []).map((r) => r.sent_at).filter(Boolean),
        cliques: clickRows.filter((r) => r.clicked_at >= since30).map((r) => r.clicked_at),
      },
      SERIES_DAYS,
      now
    ),
    automationStats: statsByAutomation(queueStatsRes.data || [], clickRows),
  };

  return (
    <Suspense>
      <AutomationsClient
        initialConfig={config}
        initialAutomations={(automationsRes.data || []) as IgAutomation[]}
        initialLogs={logsRes.data || []}
        initialContacts={contactsRes.data || []}
        dashboard={dashboard}
        queueStats={{
          pending: pendingCountRes.count || 0,
          failed: failedCountRes.count || 0,
          sent: sentCountRes.count || 0,
        }}
      />
    </Suspense>
  );
}
