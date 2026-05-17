"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  User
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import ThemeLogo from "./ThemeLogo";
import { motion, AnimatePresence } from "framer-motion";

const CLIENT_NAV = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/demands", label: "Minhas Demandas", icon: ClipboardList },
  { href: "/client/contracts", label: "Contratos & Notas", icon: FileText },
  { href: "/client/feedback", label: "Falar com Agência", icon: MessageSquare },
];

export default function ClientSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string, top: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      style={{
        width: isExpanded ? '210px' : '80px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'transparent',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 50,
      }}
    >
      {/* Tooltip Liquid Glass Global em Position Fixed para evitar cortes */}
      <AnimatePresence>
        {!isExpanded && activeTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'fixed',
              left: '90px', // 80px da barra + 10px
              top: activeTooltip.top,
              transform: 'translateY(-50%)',
              background: 'rgba(15, 15, 15, 0.85)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              padding: '8px 16px',
              borderRadius: '14px',
              zIndex: 999999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em' }}>
              {activeTooltip.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: isExpanded ? '32px 16px' : '32px 16px', height: '90px', display: 'flex', alignItems: 'center', transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <ThemeLogo width={160} height={35} isCollapsed={!isExpanded} />
      </div>

      <nav style={{ flex: 1, padding: isExpanded ? '24px 16px' : '24px 12px', transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CLIENT_NAV.map((item) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredPath === item.href;

            return (
              <li
                key={item.href}
                onMouseEnter={(e) => {
                  setHoveredPath(item.href);
                  if (!isExpanded) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({ label: item.label, top: rect.top + rect.height / 2 });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredPath(null);
                  setActiveTooltip(null);
                }}
                style={{ position: 'relative' }}
              >
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      layoutId="client-sidebar-hover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(217, 72, 15, 0.1)',
                        borderRadius: '12px',
                        zIndex: 0
                      }}
                    />
                  )}
                </AnimatePresence>

                <Link
                  href={item.href}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isExpanded ? '12px 16px' : '12px 0',
                    borderRadius: '12px',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(217, 72, 15, 0.05)' : 'transparent',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    textDecoration: 'none',
                    justifyContent: isExpanded ? 'flex-start' : 'center',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={20} />
                  </div>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden' }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: isExpanded ? '24px' : '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div
          onMouseEnter={(e) => {
            setHoveredPath('client-profile');
            if (!isExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({ label: "John Doe — Acme Corp", top: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={() => {
            setHoveredPath(null);
            setActiveTooltip(null);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isExpanded ? '8px' : '0', justifyContent: isExpanded ? 'flex-start' : 'center', position: 'relative' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', flexShrink: 0 }}>JD</div>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: 1, overflow: 'hidden' }}
              >
                <p style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>John Doe</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Acme Corp</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => window.location.href = '/login'}
          onMouseEnter={(e) => {
            setHoveredPath('client-logout');
            if (!isExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({ label: "Sair do Portal", top: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={() => {
            setHoveredPath(null);
            setActiveTooltip(null);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: isExpanded ? '12px 16px' : '12px 0', borderRadius: '12px',
            background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ minWidth: '20px', minHeight: '20px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={20} />
          </div>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
}
