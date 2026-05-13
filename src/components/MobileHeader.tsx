"use client";

import ThemeLogo from "./ThemeLogo";
import { Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function MobileHeader() {
  const [mounted, setMounted] = useState(false);
  const { currentUser } = useAuth();

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
        <button
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
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Search size={18} />
        </button>
        <button
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
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: '#fff',
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
