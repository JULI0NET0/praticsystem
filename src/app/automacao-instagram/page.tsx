import { Suspense } from "react";
import { getIgConfig, getSupabaseAdmin, type IgAutomation } from "@/lib/instagram";
import AutomationsClient from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function InstagramAutomationPage() {
  const supabase = getSupabaseAdmin();

  const [config, automationsRes, logsRes, pendingCountRes, failedCountRes] = await Promise.all([
    getIgConfig(supabase),
    supabase.from("ig_automations").select("*").order("created_at", { ascending: false }),
    supabase.from("ig_logs").select("*").order("created_at", { ascending: false }).limit(15),
    supabase.from("ig_message_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ig_message_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return (
    <Suspense>
      <AutomationsClient
        initialConfig={config}
        initialAutomations={(automationsRes.data || []) as IgAutomation[]}
        initialLogs={logsRes.data || []}
        queueStats={{
          pending: pendingCountRes.count || 0,
          failed: failedCountRes.count || 0,
        }}
      />
    </Suspense>
  );
}
