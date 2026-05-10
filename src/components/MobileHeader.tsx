"use client";

import ThemeLogo from "./ThemeLogo";
import { Menu, Bell } from "lucide-react";
import { useState, useEffect } from "react";

export default function MobileHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <header className="mobile-header glass-card">
      <ThemeLogo width={140} height={32} align="left" />
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button style={{ color: 'var(--text-primary)', position: 'relative' }}>
          <Bell size={20} />
          <div style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', backgroundColor: 'var(--accent)', borderRadius: '50%', border: '2px solid var(--glass-bg)' }} />
        </button>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          style={{ color: 'var(--text-primary)' }}
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
