// Mantém em sincronia com os valores hardcoded nas triggers de
// setup_database.sql (BLOCO 17: demands_award_points / demand_checklist_award_points).
export const POINTS = {
  DEMAND_COMPLETED: 10,
  CHECKLIST_ITEM_COMPLETED: 2,
  ON_TIME_BONUS: 5,
} as const;

export type RankingPeriod = "today" | "week" | "month" | "all";

export interface RankingRow {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  demand_points: number;
  checklist_points: number;
  bonus_points: number;
  total_points: number;
  rank: number;
}

/** Timestamp ISO -> 'YYYY-MM-DD' no fuso de SP. */
export function toSPISODate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(isoTimestamp));
}

/**
 * Espelha exatamente a condição SQL de demands_award_points() no BLOCO 17,
 * para o toast de "+N pts" mostrar o mesmo resultado que o trigger gravou.
 */
export function isOnTime(dueDate: string | null | undefined, completedAtISO: string | null | undefined): boolean {
  if (!dueDate || !completedAtISO) return false;
  return toSPISODate(completedAtISO) <= dueDate;
}

/**
 * Mesma fórmula de getDateRange() em src/app/admin/management/page.tsx —
 * meia-noite de HOJE no fuso de SP, com janela rolante de -7/-30 dias.
 */
export function spPeriodStartISO(period: Exclude<RankingPeriod, "all">): string {
  const spDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const todayStart = `${spDate}T00:00:00-03:00`;
  if (period === "today") return todayStart;

  const d = new Date(todayStart);
  d.setDate(d.getDate() - (period === "week" ? 7 : 30));
  return d.toISOString();
}
