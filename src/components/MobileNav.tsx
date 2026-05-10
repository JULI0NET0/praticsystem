"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, FileText, Settings } from "lucide-react";
import { motion } from "framer-motion";

const MOBILE_ITEMS = [
  { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clientes", icon: Users },
  { href: "/admin/services", label: "Serviços", icon: Briefcase },
  { href: "/admin/contracts", label: "Contratos", icon: FileText },
  { href: "/admin/profile", label: "Menu", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav glass-card">
      {MOBILE_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Link key={item.href} href={item.href} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <div style={{ 
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'color 0.2s'
            }}>
              <item.icon size={20} />
              <span style={{ fontSize: '0.625rem', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </div>
            {isActive && (
              <motion.div 
                layoutId="mobile-nav-active"
                style={{
                  position: 'absolute',
                  top: '-12px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 10px var(--accent)'
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
