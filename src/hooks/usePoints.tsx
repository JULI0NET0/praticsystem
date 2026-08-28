"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { spPeriodStartISO, type RankingPeriod, type RankingRow } from "@/lib/points";

export interface PointsSummary {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

const EMPTY_SUMMARY: PointsSummary = { today: 0, week: 0, month: 0, allTime: 0 };

function sumPoints(rows: { points: number }[] | null): number {
  return (rows ?? []).reduce((acc, r) => acc + r.points, 0);
}

export function usePoints() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState<PointsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [todayRes, weekRes, monthRes, allRes] = await Promise.all([
      supabase.from("points_events").select("points").eq("user_id", currentUser.id).gte("occurred_at", spPeriodStartISO("today")),
      supabase.from("points_events").select("points").eq("user_id", currentUser.id).gte("occurred_at", spPeriodStartISO("week")),
      supabase.from("points_events").select("points").eq("user_id", currentUser.id).gte("occurred_at", spPeriodStartISO("month")),
      supabase.from("points_events").select("points").eq("user_id", currentUser.id),
    ]);
    setSummary({
      today: sumPoints(todayRes.data),
      week: sumPoints(weekRes.data),
      month: sumPoints(monthRes.data),
      allTime: sumPoints(allRes.data),
    });
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const fetchRanking = useCallback(async (period: RankingPeriod): Promise<RankingRow[]> => {
    const { data, error } = await supabase.rpc("get_points_ranking", { p_period: period });
    if (error) {
      console.error("Erro ao buscar ranking:", error);
      return [];
    }
    return (data ?? []) as RankingRow[];
  }, []);

  return { summary, loading, refresh, fetchRanking };
}
