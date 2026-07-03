"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ListChecks } from "lucide-react";
import { useOperacao } from "@/components/operacao/OperacaoProvider";
import OperacaoIcon from "@/components/operacao/OperacaoIcon";

export default function OperacaoOverviewPage() {
  const { space } = useOperacao();

  const totalTasks = space.areas.reduce(
    (sum, a) => sum + a.lists.reduce((s, l) => s + l.tasks.length, 0),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: "flex", flexDirection: "column", gap: 28 }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--accent)",
          }}
        >
          Espaço
        </span>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
          {space.name}
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>
          {space.areas.length} áreas · {totalTasks} tarefas ativas · réplica da operação da agência
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {space.areas.map((area) => {
          const areaTasks = area.lists.reduce((s, l) => s + l.tasks.length, 0);
          const firstList = area.lists[0];
          return (
            <motion.div key={area.id} whileHover={{ y: -3 }}>
              <Link
                href={firstList ? `/admin/operacao/${area.id}/${firstList.id}` : "#"}
                className="glass-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: 24,
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "rgba(217,72,15,0.12)",
                      border: "1px solid rgba(217,72,15,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <OperacaoIcon name={area.icon} size={22} color="var(--accent)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{area.name}</h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                      {area.lists.length} listas
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {area.lists.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ListChecks size={13} color="var(--text-tertiary)" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    {areaTasks} tarefas
                  </span>
                  <ArrowRight size={16} color="var(--accent)" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
