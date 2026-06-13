"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { MOBILE_NAV_BY_ROLE, MOBILE_NAV_ITEMS, NAV_GROUPS } from "@/lib/navConfig";
import { useAuth } from "@/hooks/useAuth";

interface MobileNavProps {
  onOpenMenu: () => void;
  unreadChat?: number;
}

export default function MobileNav({ onOpenMenu, unreadChat = 0 }: MobileNavProps) {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  const role = currentUser?.role ?? "";
  const visibleItems = (MOBILE_NAV_BY_ROLE[role] ?? MOBILE_NAV_ITEMS).slice(0, 4);

  // Ativa "Mais" quando a rota atual existe no NAV_GROUPS mas não no bottom nav
  const bottomNavHrefs = new Set(visibleItems.map(i => i.href));
  const allNavHrefs = NAV_GROUPS.flatMap(g => g.items.map(i => i.href));
  const isDrawerRoute = !visibleItems.some(i => pathname.startsWith(i.href))
    && allNavHrefs.some(href => pathname.startsWith(href));

  return (
    <nav className="mobile-nav glass-card">
      {visibleItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        const showBadge = item.href === '/admin/chat' && unreadChat > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'color 0.2s'
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={22} />
                {showBadge && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    minWidth: '16px',
                    height: '16px',
                    borderRadius: '8px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    fontSize: '0.55rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid var(--glass-bg)'
                  }}>
                    {unreadChat > 99 ? '99+' : unreadChat}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.01em'
              }}>
                {item.label}
              </span>
            </motion.div>
            {isActive && (
              <motion.div
                layoutId="mobile-nav-active"
                style={{
                  position: 'absolute',
                  top: '-1px',
                  width: '20px',
                  height: '3px',
                  borderRadius: '0 0 4px 4px',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 2px 8px var(--accent)'
                }}
              />
            )}
          </Link>
        );
      })}

      {/* Botão "Mais" — abre o drawer */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onOpenMenu}
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: isDrawerRoute ? 'var(--accent)' : 'var(--text-secondary)',
          minHeight: '44px',
          minWidth: '44px',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer',
          transition: 'color 0.2s'
        }}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
        <span style={{ fontSize: '0.6rem', fontWeight: isDrawerRoute ? 700 : 500 }}>Mais</span>
        {isDrawerRoute && (
          <motion.div
            layoutId="mobile-nav-active"
            style={{
              position: 'absolute',
              top: '-1px',
              width: '20px',
              height: '3px',
              borderRadius: '0 0 4px 4px',
              backgroundColor: 'var(--accent)',
              boxShadow: '0 2px 8px var(--accent)'
            }}
          />
        )}
      </motion.button>
    </nav>
  );
}
