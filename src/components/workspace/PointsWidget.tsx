"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";

export default function PointsWidget({ colSpan }: { colSpan: number }) {
  const { currentUser } = useAuth();
  const { summary, loading, fetchRanking } = usePoints();
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    fetchRanking("week").then((rows) => {
      if (cancelled) return;
      const mine = rows.find((r) => r.user_id === currentUser.id);
      setMyRank(mine?.rank ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, fetchRanking]);

  const gridCols = colSpan > 5 ? "repeat(2, 1fr)" : "1fr";

  const tiles = [
    { label: "Hoje", value: summary.today },
    { label: "Esta semana", value: summary.week },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: 0,
          }}
        >
          <Award size={20} color="var(--accent)" /> Pontos
        </h3>
        {myRank && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--accent)",
              background: "color-mix(in oklab, var(--accent) 12%, transparent)",
              padding: "4px 10px",
              borderRadius: 10,
            }}
          >
            #{myRank} essa semana
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5)" }}>
          <Loader2 size={20} className="animate-spin" color="var(--accent)" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 10, marginBottom: 14 }}>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              style={{
                background: "var(--card-inner-bg)",
                padding: "10px 14px",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-tertiary)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 6px",
                }}
              >
                {tile.label}
              </p>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                {tile.value} <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>pts</span>
              </h2>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/admin/ranking"
        style={{
          marginTop: "auto",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        Ver ranking completo →
      </Link>
    </div>
  );
}
