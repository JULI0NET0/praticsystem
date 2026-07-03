"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FolderOpen, Hash, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOperacao } from "./OperacaoProvider";
import OperacaoIcon from "./OperacaoIcon";

/**
 * Árvore de navegação estilo ClickUp: Espaço → Pastas(Áreas) → Listas.
 */
export default function OperacaoTree() {
  const { space } = useOperacao();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (areaId: string) =>
    setCollapsed((c) => ({ ...c, [areaId]: !c[areaId] }));

  return (
    <aside
      className="operacao-tree glass-card"
      style={{
        width: 264,
        flexShrink: 0,
        padding: 16,
        height: "fit-content",
        maxHeight: "calc(100dvh - 120px)",
        overflowY: "auto",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Espaço */}
      <Link
        href="/admin/operacao"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 14,
          marginBottom: 8,
          background: pathname === "/admin/operacao" ? "rgba(217,72,15,0.12)" : "transparent",
          border: `1px solid ${pathname === "/admin/operacao" ? "rgba(217,72,15,0.25)" : "var(--border)"}`,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.01em" }}>
          {space.name}
        </span>
      </Link>

      {/* Áreas (Pastas) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {space.areas.map((area) => {
          const isCollapsed = collapsed[area.id];
          return (
            <div key={area.id}>
              <button
                onClick={() => toggle(area.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                <motion.span
                  animate={{ rotate: isCollapsed ? 0 : 90 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex", color: "var(--text-tertiary)" }}
                >
                  <ChevronRight size={14} />
                </motion.span>
                <OperacaoIcon name={area.icon} size={15} color="var(--text-secondary)" />
                <span style={{ fontWeight: 700, fontSize: "0.82rem", flex: 1, textAlign: "left" }}>
                  {area.name}
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 700 }}>
                  {area.lists.length}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: "hidden", paddingLeft: 14 }}
                  >
                    {area.lists.map((list) => {
                      const href = `/admin/operacao/${area.id}/${list.id}`;
                      const active = pathname === href;
                      return (
                        <Link
                          key={list.id}
                          href={href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 10px",
                            borderRadius: 10,
                            marginTop: 2,
                            background: active ? "rgba(217,72,15,0.12)" : "transparent",
                            color: active ? "var(--accent)" : "var(--text-secondary)",
                            fontWeight: active ? 700 : 500,
                            fontSize: "0.8rem",
                          }}
                        >
                          {list.isTemplate ? (
                            <FolderOpen size={13} style={{ flexShrink: 0 }} />
                          ) : (
                            <Hash size={13} style={{ flexShrink: 0 }} />
                          )}
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {list.name}
                          </span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
