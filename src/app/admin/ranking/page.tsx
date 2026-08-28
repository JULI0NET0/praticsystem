"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import RoleGuard from "@/components/auth/RoleGuard";
import type { RankingPeriod, RankingRow } from "@/lib/points";

const TEAM_ROLES = ["admin", "board", "social_media", "filmmaker"];

const TABS: { id: RankingPeriod; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "all", label: "Total" },
];

const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export default function RankingPage() {
  const { currentUser } = useAuth();
  const { fetchRanking } = usePoints();
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRanking(period).then((r) => {
      if (cancelled) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [period, fetchRanking]);

  return (
    <RoleGuard allowedRoles={TEAM_ROLES}>
      <div style={{ padding: "clamp(12px, 3vw, 32px)", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 4vw, 2rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--color-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Trophy size={32} color="var(--accent)" />
            Ranking
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "6px", fontSize: "0.9rem" }}>
            Pontos por demandas e etapas concluídas, com bônus por cumprir o prazo.
          </p>
        </div>

        <div
          style={{
            padding: "28px",
            borderRadius: "20px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: period === tab.id ? "var(--accent)" : "var(--color-surface-sunken)",
                  color: period === tab.id ? "white" : "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
              Carregando ranking...
            </p>
          ) : rows.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
              Nenhum ponto registrado ainda neste período.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                <thead>
                  <tr>
                    {["#", "Membro", "Demandas", "Checklist", "Bônus", "Total"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: h === "Membro" ? "left" : "left",
                          padding: "12px 16px",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                          letterSpacing: "0.05em",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isMe = row.user_id === currentUser?.id;
                    return (
                      <motion.tr
                        key={row.user_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{
                          background: isMe ? "color-mix(in oklab, var(--accent) 10%, transparent)" : "var(--color-surface-sunken)",
                          border: isMe ? "1px solid var(--accent)" : "1px solid transparent",
                        }}
                      >
                        <td style={{ padding: "14px 16px", fontWeight: 800, color: MEDAL_COLORS[row.rank] ?? "var(--text-secondary)" }}>
                          {row.rank}
                        </td>
                        <td style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "var(--accent)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--color-text-on-accent)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            {row.avatar_url ? (
                              <img
                                src={row.avatar_url}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                alt=""
                              />
                            ) : (
                              (row.username || row.name).replace(/^@/, "").substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {row.username ? `@${row.username}` : row.name}
                            {isMe && (
                              <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700, marginLeft: 6 }}>
                                (você)
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{row.demand_points}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{row.checklist_points}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{row.bonus_points}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                          <Award size={14} color="var(--accent)" /> {row.total_points}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
