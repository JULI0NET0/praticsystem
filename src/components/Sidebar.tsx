"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Settings,
  Moon,
  Sun,
  Bell,
  LogOut,
  Loader2,
  Activity
} from "lucide-react";
import { notifications } from "@/mocks/db";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import ThemeLogo from "./ThemeLogo";
import { motion, AnimatePresence } from "framer-motion";

const NAV_GROUPS = [
  {
    title: "Minha Área",
    roles: ['admin', 'board', 'social_media', 'filmmaker'],
    items: [
      { href: "/admin/workspace", label: "WorkSpace", icon: LayoutDashboard, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
      { href: "/admin/schedule", label: "Minha Agenda", icon: CalendarDays, roles: ['admin', 'board', 'social_media', 'filmmaker'] },
    ]
  },
  {
    title: "Administrativo",
    roles: ['admin', 'board'],
    items: [
      { href: "/admin/dashboard", label: "Financeiro", icon: CreditCard, roles: ['admin', 'board'] },
      { href: "/admin/registrations", label: "Cadastros", icon: FileText, roles: ['admin', 'board'] },
      { href: "/admin/users", label: "Equipe", icon: ShieldAlert, roles: ['admin', 'board'] },
      { href: "/admin/management", label: "Gestão", icon: Activity, roles: ['admin', 'board'] },
    ]
  },
  {
    title: "Gestão Comercial",
    roles: ['admin', 'board', 'social_media'],
    items: [
      { href: "/admin/clients", label: "Clientes", icon: Users, roles: ['admin', 'board', 'social_media'] },
      { href: "/admin/services", label: "Serviços", icon: Briefcase, roles: ['admin', 'board'] },
      { href: "/admin/contracts", label: "Contratos", icon: FileText, roles: ['admin', 'board', 'social_media'] },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, users, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const handleToggle = () => setIsExpanded(prev => !prev);
    const handleNewNotification = (e: any) => {
      setLocalNotifications(prev => [e.detail, ...prev]);
    };

    window.addEventListener('toggle-sidebar', handleToggle);
    window.addEventListener('new-notification', handleNewNotification);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: isExpanded ? '280px' : '80px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'transparent',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '32px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          zIndex: 10
        }}
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div style={{
        padding: isExpanded ? '32px 24px' : '32px 16px',
        display: 'flex',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        alignItems: 'center',
        height: '90px'
      }}>
        <ThemeLogo
          width={220}
          height={48}
          align="left"
          isCollapsed={!isExpanded}
        />
      </div>

      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 16px' }}>
          {NAV_GROUPS.filter(group => !currentUser || group.roles.includes(currentUser.role)).map((group) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isExpanded && (
                <span style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  paddingLeft: '16px',
                  fontWeight: 600,
                  opacity: 0.7
                }}>
                  {group.title}
                </span>
              )}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.filter(item => !currentUser || item.roles.includes(currentUser.role)).map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const isHovered = hoveredPath === item.href;

                  return (
                    <li
                      key={item.href}
                      onMouseEnter={() => setHoveredPath(item.href)}
                      onMouseLeave={() => setHoveredPath(null)}
                      style={{ position: 'relative' }}
                    >
                      {/* Magnetic Hover Animation */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            layoutId="sidebar-hover-pill"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(217, 72, 15, 0.15)',
                              borderRadius: 'var(--radius-input)',
                              zIndex: 0
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div whileTap={{ scale: 0.96 }} style={{ width: '100%' }}>
                        <Link
                          href={item.href}
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-input)',
                            color: isActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                            border: isActive ? '1px solid rgba(217, 72, 15, 0.1)' : '1px solid transparent',
                            transition: 'color 0.2s',
                            justifyContent: isExpanded ? 'flex-start' : 'center'
                          }}
                        >
                          <item.icon size={20} color={isActive ? 'var(--accent)' : 'currentColor'} />
                          {isExpanded && <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>}
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div style={{
        padding: isExpanded ? '24px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        borderTop: '1px solid var(--border)',
        marginTop: 'auto'
      }}>
        {/* Profile Card / Link */}
        <div
          onMouseEnter={() => setHoveredPath('profile-container')}
          onMouseLeave={() => setHoveredPath(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: isExpanded ? '12px 16px' : '0',
            borderRadius: 'var(--radius-input)',
            border: isExpanded ? '1px solid var(--border)' : 'none',
            backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent',
            marginBottom: '8px',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            position: 'relative',
            transition: 'all 0.2s'
          }}
        >
          <AnimatePresence>
            {hoveredPath === 'profile-container' && !isExpanded && (
              <motion.div
                layoutId="sidebar-hover-pill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ position: 'absolute', inset: -8, backgroundColor: 'rgba(217, 72, 15, 0.15)', borderRadius: 'var(--radius-input)', zIndex: 0 }}
              />
            )}
          </AnimatePresence>

          <div
            onClick={() => setShowUserSwitcher(!showUserSwitcher)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem',
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              cursor: 'pointer'
            }}
          >
            {currentUser ? (
              currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (currentUser.name || "??").substring(0, 2).toUpperCase()
            ) : <Loader2 size={14} className="animate-spin" />}
            {!isExpanded && (
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#EF4444', borderRadius: '50%', border: '2px solid var(--bg-secondary)' }} />
            )}

            {/* Auth Actions Popover */}
            <AnimatePresence>
              {showUserSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: '20px',
                    width: '200px', background: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(32px)',
                    borderRadius: '20px', border: '1px solid var(--border)', padding: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 1000
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '8px' }}>Conta:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserSwitcher(false);
                      }}
                      style={{
                        padding: '10px 12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none', color: '#EF4444',
                        fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <LogOut size={16} /> Sair da Conta
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {isExpanded && (
            <>
              <Link
                href="/admin/profile"
                style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1, textDecoration: 'none' }}
              >
                <p style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentUser?.name || "Usuário"} <span style={{ fontSize: '1rem' }}>{currentUser?.emoji || ""}</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentUser?.role || "Indefinido"}</p>
              </Link>
              <div
                style={{ color: 'var(--text-secondary)', position: 'relative', zIndex: 1, cursor: 'pointer' }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <div style={{ position: 'relative' }}>
                  <Bell size={18} color={localNotifications.some(n => !n.read) ? 'var(--accent)' : 'currentColor'} />
                  {localNotifications.filter(n => !n.read).length > 0 && (
                    <div style={{
                      position: 'absolute', top: -6, right: -6,
                      backgroundColor: 'var(--accent)', color: 'white',
                      fontSize: '0.6rem', fontWeight: 800, width: '16px', height: '16px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--bg-secondary)'
                    }}>
                      {localNotifications.filter(n => !n.read).length}
                    </div>
                  )}
                </div>

                {/* Popover de Notificações */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', bottom: '100%', right: '-20px', marginBottom: '20px',
                        width: '320px', background: 'rgba(15, 15, 15, 0.98)', backdropFilter: 'blur(32px)',
                        borderRadius: '24px', border: '1px solid var(--border)', padding: '20px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 1000
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Notificações</h4>
                        <button
                          onClick={() => {
                            setLocalNotifications(localNotifications.map(n => ({ ...n, read: true })));
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Limpar tudo
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                        {localNotifications.length === 0 ? (
                          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '20px' }}>Nenhuma notificação por enquanto.</p>
                        ) : (
                          localNotifications.map(notif => (
                            <motion.div
                              key={notif.id}
                              whileHover={{ x: 4 }}
                              onClick={() => {
                                setLocalNotifications(localNotifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                              style={{
                                padding: '14px', borderRadius: '16px',
                                background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(217, 72, 15, 0.05)',
                                border: '1px solid var(--border)', display: 'flex', gap: '12px',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              {!notif.read && (
                                <div style={{
                                  width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', marginTop: '6px', flexShrink: 0
                                }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{notif.title}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>{notif.message}</p>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            onMouseEnter={() => setHoveredPath('theme-toggle')}
            onMouseLeave={() => setHoveredPath(null)}
            style={{
              position: 'relative',
              background: 'transparent',
              padding: isExpanded ? '16px' : '12px',
              borderRadius: 'var(--radius-input)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              justifyContent: isExpanded ? 'flex-start' : 'center'
            }}
          >
            <AnimatePresence>
              {hoveredPath === 'theme-toggle' && (
                <motion.div
                  layoutId="sidebar-hover-pill"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(217, 72, 15, 0.15)', borderRadius: 'var(--radius-input)', zIndex: 0 }}
                />
              )}
            </AnimatePresence>
            <motion.div whileTap={{ scale: 0.96 }} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {isExpanded && (
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              )}
            </motion.div>
          </button>
        )}
      </div>
    </aside>
  );
}
