"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { MOBILE_NAV_ITEMS } from "@/lib/navConfig";
import { useAuth } from "@/hooks/useAuth";

interface MobileNavProps {
  onOpenMenu: () => void;
}

export default function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname();
  const { currentUser } = useAuth();

  // Filtrar itens por role do usuário atual
  const visibleItems = MOBILE_NAV_ITEMS.filter(
    item => !currentUser || item.roles.includes(currentUser.role)
  ).slice(0, 4); // Máximo 4 itens + "Mais"

  return (
    <nav className="mobile-nav glass-card">
      {visibleItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

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
                {/* Badge para Chat (placeholder — pode integrar com unread count) */}
                {item.href === '/admin/chat' && false && (
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
                    3
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
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          minHeight: '44px',
          minWidth: '44px',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'pointer'
        }}
      >
        <Menu size={22} />
        <span style={{ fontSize: '0.6rem', fontWeight: 500 }}>Mais</span>
      </motion.button>
    </nav>
  );
}
