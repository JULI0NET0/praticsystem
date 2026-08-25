"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DUE_BUCKET_ORDER,
  dueBucketLabel,
  dueDateBucket,
  toISODate,
  type DueBucket,
} from "@/lib/dueDate";
import { PRIORITY_ORDER, type Demand } from "@/types/demandas";
import { useDemandas } from "./DemandasProvider";
import DemandRow from "./DemandRow";
import QuickAddRow from "./QuickAddRow";

/** Prazo padrão sugerido ao adicionar dentro de cada grupo. */
function bucketDefaultDue(bucket: DueBucket): string | null {
  const today = new Date();
  switch (bucket) {
    case "hoje":
      return toISODate(today);
    case "amanha": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return toISODate(tomorrow);
    }
    default:
      return null;
  }
}

const QUICK_ADD_BUCKETS: DueBucket[] = ["hoje", "amanha", "sem_data"];

const TONE: Record<DueBucket, string> = {
  atrasada: "var(--color-danger)",
  hoje: "var(--accent)",
  amanha: "var(--color-warning)",
  semana: "var(--text-secondary)",
  depois: "var(--text-secondary)",
  sem_data: "var(--text-tertiary)",
};

interface Props {
  demands: Demand[];
  onOpenDemand: (id: string) => void;
}

export default function DemandListView({ demands, onOpenDemand }: Props) {
  const { loading } = useDemandas();
  const [collapsed, setCollapsed] = useState<Partial<Record<DueBucket, boolean>>>({});

  const groups = useMemo(() => {
    const map = new Map<DueBucket, Demand[]>();
    for (const bucket of DUE_BUCKET_ORDER) map.set(bucket, []);

    for (const demand of demands) {
      map.get(dueDateBucket(demand.due_date))!.push(demand);
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 9;
        const pb = PRIORITY_ORDER[b.priority] ?? 9;
        if (pa !== pb) return pa - pb;
        return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      });
    }

    return map;
  }, [demands]);

  if (loading) {
    return (
      <div
        className="glass-card"
        style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}
      >
        Carregando demandas…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {DUE_BUCKET_ORDER.map((bucket) => {
        const list = groups.get(bucket) ?? [];
        // Só "Hoje" e "Sem prazo" ficam visíveis quando vazios, para servir de destino do quick-add
        if (list.length === 0 && bucket !== "hoje" && bucket !== "sem_data") return null;

        const isCollapsed = collapsed[bucket] ?? false;

        return (
          <section key={bucket} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [bucket]: !isCollapsed }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {isCollapsed ? (
                <ChevronRight size={15} color="var(--text-tertiary)" />
              ) : (
                <ChevronDown size={15} color="var(--text-tertiary)" />
              )}
              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: TONE[bucket],
                }}
              >
                {dueBucketLabel(bucket)}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "var(--text-tertiary)",
                  background: "var(--color-surface-sunken)",
                  padding: "1px 8px",
                  borderRadius: 8,
                }}
              >
                {list.length}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {list.map((demand) => (
                      <DemandRow key={demand.id} demand={demand} onOpen={onOpenDemand} />
                    ))}

                    {/* Quick-add só onde o prazo do grupo é inequívoco — em
                        "Atrasadas"/"Esta semana"/"Depois" não há data óbvia
                        para herdar, e a demanda saltaria de grupo ao criar. */}
                    {QUICK_ADD_BUCKETS.includes(bucket) && (
                      <div style={{ marginTop: 8 }}>
                        <QuickAddRow
                          defaults={{ due_date: bucketDefaultDue(bucket) }}
                          placeholder={
                            bucket === "sem_data"
                              ? "Adicionar demanda sem prazo…"
                              : `Adicionar em "${dueBucketLabel(bucket)}"…`
                          }
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
