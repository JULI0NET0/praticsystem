"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Search, Sun, Moon, Bell, LogOut, User, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { NAV_GROUPS } from "@/lib/navConfig";
import { notifications } from "@/mocks/db";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar ao navegar
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Focus search ao abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = '';
      setSearchQuery("");
      setSearchResults([]);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Busca
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const q = searchQuery.toLowerCase();
        const results: any[] = [];

        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, nome_fantasia')
          .or(`name.ilike.%${q}%,nome_fantasia.ilike.%${q}%`)
          .limit(4);

        clients?.forEach(c => {
          results.push({
            id: c.id,
            title: c.nome_fantasia || c.name,
            subtitle: 'Cliente',
            href: `/admin/clients/${c.id}`
          });
        });

        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const filteredGroups = NAV_GROUPS
    .filter(group => !currentUser || group.roles.includes(currentUser.role))
    .map(group => ({
      ...group,
      items: group.items.filter(item => !currentUser || item.roles.includes(currentUser.role))
    }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9998
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Menu</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Profile Card */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => handleNavigate('/admin/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  borderRadius: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  ) : (
                    (currentUser?.name || "??").substring(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentUser?.name || "Usuário"}
                    <span style={{ fontSize: '1.1rem' }}>{currentUser?.emoji || ""}</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {currentUser?.role || "Indefinido"}
                  </p>
                </div>
                <ChevronRight size={18} color="var(--text-secondary)" />
              </motion.div>

              {/* Search */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)'
              }}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar clientes, serviços..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-16px' }}
                  >
                    {searchResults.map(result => (
                      <motion.button
                        key={result.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleNavigate(result.href)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: 'rgba(217, 72, 15, 0.06)',
                          border: '1px solid rgba(217, 72, 15, 0.1)',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <User size={16} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{result.title}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{result.subtitle}</p>
                        </div>
                        <ChevronRight size={14} color="var(--text-secondary)" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nav Groups */}
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <p style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    marginBottom: '10px',
                    paddingLeft: '4px'
                  }}>
                    {group.title}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.items.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <motion.button
                          key={item.href}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleNavigate(item.href)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '14px 16px',
                            borderRadius: '14px',
                            backgroundColor: isActive ? 'rgba(217, 72, 15, 0.12)' : 'transparent',
                            border: isActive ? '1px solid rgba(217, 72, 15, 0.15)' : '1px solid transparent',
                            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            minHeight: '48px'
                          }}
                        >
                          <Icon size={20} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
                          <span style={{ fontWeight: isActive ? 600 : 500, fontSize: '0.95rem', flex: 1 }}>
                            {item.label}
                          </span>
                          {isActive && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent)',
                              boxShadow: '0 0 8px var(--accent)'
                            }} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Separator */}
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Utilities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Theme Toggle */}
                {mounted && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '48px'
                    }}
                  >
                    {resolvedTheme === 'dark' ? <Sun size={20} color="var(--text-secondary)" /> : <Moon size={20} color="var(--text-secondary)" />}
                    <span style={{ fontWeight: 500, fontSize: '0.95rem', flex: 1 }}>
                      {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    </span>
                    <div style={{
                      width: '44px',
                      height: '26px',
                      borderRadius: '13px',
                      backgroundColor: resolvedTheme === 'dark' ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                      border: '1px solid var(--border)',
                      position: 'relative',
                      transition: 'background 0.3s'
                    }}>
                      <motion.div
                        animate={{ x: resolvedTheme === 'dark' ? 20 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          position: 'absolute',
                          top: '2px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      />
                    </div>
                  </motion.button>
                )}

                {/* Notifications */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigate('/admin/profile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: '48px'
                  }}
                >
                  <Bell size={20} color="var(--text-secondary)" />
                  <span style={{ fontWeight: 500, fontSize: '0.95rem', flex: 1 }}>Notificações</span>
                </motion.button>
              </div>

              {/* Separator */}
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Logout */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '48px'
                }}
              >
                <LogOut size={20} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Sair da Conta</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
