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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside 
      style={{
        width: isExpanded ? '280px' : '80px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'transparent',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ padding: '32px 24px', height: '90px', display: 'flex', alignItems: 'center' }}>
        <ThemeLogo width={180} height={40} isCollapsed={!isExpanded} />
      </div>

      <nav style={{ flex: 1, padding: '24px 16px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CLIENT_NAV.map((item) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredPath === item.href;
            
            return (
              <li 
                key={item.href}
                onMouseEnter={() => setHoveredPath(item.href)}
                onMouseLeave={() => setHoveredPath(null)}
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
                    padding: '12px 16px',
                    borderRadius: '12px',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(217, 72, 15, 0.05)' : 'transparent',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 500
                  }}
                >
                  <item.icon size={20} />
                  {isExpanded && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>JD</div>
          {isExpanded && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>John Doe</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acme Corp</p>
            </div>
          )}
        </div>

        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={20} />
          {isExpanded && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
