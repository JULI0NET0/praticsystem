"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Hash, FolderOpen, ArrowRight } from "lucide-react";
import { useOperacao } from "@/components/operacao/OperacaoProvider";
import OperacaoIcon from "@/components/operacao/OperacaoIcon";

export default function AreaPage() {
  const params = useParams<{ areaId: string }>();
  const { getArea } = useOperacao();
  const area = getArea(params.areaId);

  if (!area) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-tertiary)" }}>
        Área não encontrada.{" "}
        <Link href="/admin/operacao" style={{ color: "var(--accent)" }}>
          Voltar ao Espaço
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link href="/admin/operacao" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
          <ChevronLeft size={14} /> Espaço
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OperacaoIcon name={area.icon} size={24} color="var(--accent)" />
          <h1 style={{ fontSize: "clamp(1.4rem, 4vw, 1.75rem)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--color-text-primary)" }}>{area.name}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {area.lists.map((list) => (
          <motion.div key={list.id} whileHover={{ y: -3 }}>
            <Link
              href={`/admin/operacao/${area.id}/${list.id}`}
              className="glass-card"
              style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, height: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {list.isTemplate ? <FolderOpen size={18} color="var(--accent)" /> : <Hash size={18} color="var(--text-secondary)" />}
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>{list.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                  {list.tasks.length} tarefas
                </span>
                <ArrowRight size={15} color="var(--accent)" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
