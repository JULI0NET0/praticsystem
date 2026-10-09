"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface SyncResult {
  ok: boolean;
  throttled?: boolean;
  inserted?: number;
  updated?: number;
  deferred?: number;
  hasMore?: boolean;
}

let lastClientRun = 0;

/** Pede ao servidor que complete as mensagens de hoje que o webhook não viu. Limitado a 1 vez por minuto, salvo `force`. */
export async function runSync(force = false): Promise<SyncResult> {
  if (!force && Date.now() - lastClientRun < 60_000) return { ok: true, throttled: true };
  lastClientRun = Date.now();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false };
  const res = await fetch("/api/prospeccao/sync", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null);
  if (!res?.ok) return { ok: false };
  const json = await res.json().catch(() => ({}));
  return { ok: true, throttled: json.throttled, ...(json.summary ?? {}) };
}

/** Sincroniza ao abrir a Prospecção e sempre que a aba volta ao foco. */
export function useAutoSync() {
  useEffect(() => {
    runSync();
    const onFocus = () => { if (document.visibilityState === "visible") runSync(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
