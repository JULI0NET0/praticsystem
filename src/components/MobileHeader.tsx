"use client";

import ThemeLogo from "./ThemeLogo";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MobileHeader() {
  const [mounted, setMounted] = useState(false);
  const { currentUser } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <header className="mobile-header">
      <ThemeLogo width={120} height={28} align="left" />
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        {/* Alternador Modo Claro / Modo Escuro */}
        <button
          aria-label={resolvedTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          title={resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          style={{
            color: 'var(--text-secondary)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--card-inner-bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.2s, color 0.2s'
          }}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          aria-label="Pesquisar"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-search'))}
          style={{
            color: 'var(--text-secondary)',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--card-inner-bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Search size={18} />
        </button>
        <button
          aria-label="Notificações"
          onClick={() => router.push('/admin/profile')}
          style={{
            color: 'var(--text-secondary)',
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--card-inner-bg)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Bell size={18} />
          <div style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: '7px',
            height: '7px',
            backgroundColor: 'var(--accent)',
            borderRadius: '50%',
            border: '2px solid var(--glass-bg)'
          }} />
        </button>
        <Link
          href="/admin/profile"
          aria-label="Meu perfil"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: 'var(--color-text-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            flexShrink: 0,
            overflow: 'hidden',
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              alt=""
            />
          ) : (
            (currentUser?.name || "??").substring(0, 2).toUpperCase()
          )}
        </Link>
      </div>
    </header>
  );
}
