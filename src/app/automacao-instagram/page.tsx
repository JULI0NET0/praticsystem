import { Suspense } from "react";
import { getIgConfig, getSupabaseAdmin, type IgAutomation } from "@/lib/instagram";
import AutomationsClient from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function InstagramAutomationPage() {
  const supabase = getSupabaseAdmin();

  const [
    config,
    automationsRes,
    logsRes,
    pendingCountRes,
    failedCountRes,
    sentCountRes,
    queueListRes,
    contactsRes,
    clicksRes,
  ] = await Promise.all([
    getIgConfig(supabase),
    supabase.from("ig_automations").select("*").order("created_at", { ascending: false }),
    supabase.from("ig_logs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("ig_message_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ig_message_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("ig_message_queue").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("ig_message_queue").select("*").order("created_at", { ascending: false }).limit(60),
    supabase.from("ig_contacts").select("*").order("last_seen_at", { ascending: false }).limit(100),
    supabase.from("ig_link_clicks").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  return (
    <Suspense>
      <AutomationsClient
        initialConfig={config}
        initialAutomations={(automationsRes.data || []) as IgAutomation[]}
        initialLogs={logsRes.data || []}
        initialQueue={queueListRes.data || []}
        initialContacts={contactsRes.data || []}
        initialClicks={clicksRes.data || []}
        queueStats={{
          pending: pendingCountRes.count || 0,
          failed: failedCountRes.count || 0,
          sent: sentCountRes.count || 0,
        }}
      />
    </Suspense>
  );
}
