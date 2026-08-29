"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Bell,
  LogOut,
  Loader2,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/context/NotificationContext";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import ThemeLogo from "./ThemeLogo";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_GROUPS } from "@/lib/navConfig";

// NAV_GROUPS importado de @/lib/navConfig

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, users, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string, top: number } | null>(null);

  useEffect(() => {
    setMounted(true);

    const handleToggle = () => setIsExpanded(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
    };
  }, []);

  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: isExpanded ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // Painel opaco com borda: é a borda que separa a sidebar do
        // conteúdo agora que o gutter do shell virou 0.
        background: 'var(--color-surface-raised)',
        borderRight: '1px solid var(--color-border-subtle)',
        transition: 'width var(--duration-base) var(--ease-standard)',
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
              left: 'calc(var(--sidebar-collapsed-width) + 10px)',
              top: activeTooltip.top,
              transform: 'translateY(-50%)',
              background: 'var(--color-surface-inverse)',
              border: '1px solid var(--color-border-default)',
              boxShadow: 'var(--shadow-md)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              zIndex: 999999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ color: 'var(--color-surface-canvas)', fontSize: 'var(--text-caption)', fontWeight: 600 }}>
              {activeTooltip.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
          zIndex: 10,
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div style={{
        padding: '0 12px',
        display: 'flex',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        alignItems: 'center',
        height: 'var(--header-height)',
        flexShrink: 0,
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <ThemeLogo
          width={130}
          height={28}
          align="left"
          isCollapsed={!isExpanded}
        />
      </div>

      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: isExpanded ? '0 12px' : '0 8px' }}>
          {NAV_GROUPS.filter(group => !currentUser || group.roles.includes(currentUser.role)).map((group) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 0.7, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 'var(--text-micro)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--color-text-tertiary)',
                      paddingLeft: '10px',
                      fontWeight: 600,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {group.title}
                  </motion.span>
                )}
              </AnimatePresence>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.filter(item => !currentUser || item.roles.includes(currentUser.role)).map((item) => {
                  const isActive = pathname.startsWith(item.href);
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
                      {/* Realce de hover.
                          Antes três elementos compartilhavam
                          layoutId="sidebar-hover-pill": o framer-motion
                          animava a pílula ENTRE eles, fazendo-a voar pela
                          tela ao passar da nav para o rodapé. O destaque
                          plano não precisa de layout compartilhado. */}
                      <AnimatePresence>
                        {isHovered && !isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'var(--color-surface-sunken)',
                              borderRadius: 'var(--radius-md)',
                              zIndex: 0
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div whileTap={{ scale: 0.98 }} style={{ width: '100%' }}>
                        <Link
                          href={item.href}
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: isExpanded ? '7px 10px' : '7px 0',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-ui)',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--sidebar-active-text)' : 'var(--color-text-secondary)',
                            backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                            border: isActive
                              ? '1px solid var(--color-terracotta-200)'
                              : '1px solid transparent',
                            transition: 'color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)',
                            justifyContent: isExpanded ? 'flex-start' : 'center',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ minWidth: '16px', minHeight: '16px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <item.icon size={16} strokeWidth={1.75} color={isActive ? 'var(--accent)' : 'currentColor'} />
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
        marginTop: 'auto',
        transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Profile Card / Link */}
        <div
          onMouseEnter={(e) => {
            setHoveredPath('profile-container');
            if (!isExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({ label: currentUser?.name || "Perfil do Usuário", top: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={() => {
            setHoveredPath(null);
            setActiveTooltip(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: isExpanded ? '12px 12px' : '0',
            borderRadius: 'var(--radius-input)',
            border: isExpanded ? '1px solid var(--border)' : 'none',
            backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent',
            marginBottom: '8px',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <AnimatePresence>
            {hoveredPath === 'profile-container' && !isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'absolute', inset: -8, backgroundColor: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', zIndex: 0 }}
              />
            )}
          </AnimatePresence>

          <div
            onClick={() => setShowUserSwitcher(!showUserSwitcher)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: 'var(--accent)', color: 'var(--color-text-on-accent)',
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
              ) : (currentUser.username || currentUser.name || "??").replace(/^@/, '').substring(0, 2).toUpperCase()
            ) : <Loader2 size={14} className="animate-spin" />}
            {!isExpanded && (
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--color-danger)', borderRadius: '50%', border: '2px solid var(--color-surface-raised)' }} />
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
                    width: '200px', background: 'var(--color-surface-raised)', borderRadius: '20px', border: '1px solid var(--border)', padding: '12px',
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
                        padding: '10px 12px', borderRadius: '12px', background: 'var(--color-danger-wash)',
                        border: 'none', color: 'var(--color-danger)',
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
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}
              >
                <Link
                  href="/admin/profile"
                  title={currentUser?.name}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-primary)' }}>
                    {currentUser?.username ? `@${currentUser.username}` : (currentUser?.name || "Usuário")}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser?.role || "Indefinido"}</p>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {isExpanded && (
            <div
              style={{ color: 'var(--text-secondary)', zIndex: 1, cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <div style={{ position: 'relative' }}>
                <Bell size={16} color={unreadCount > 0 ? 'var(--accent)' : 'currentColor'} />
                {unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    backgroundColor: 'var(--accent)', color: 'var(--color-text-on-accent)',
                    fontSize: '0.6rem', fontWeight: 800, width: '16px', height: '16px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg-secondary)'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
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
                      position: 'absolute', bottom: '100%', left: 0, marginBottom: '20px',
                      width: '320px', background: 'var(--color-surface-raised)', borderRadius: '24px', border: '1px solid var(--border)', padding: '20px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Notificações</h4>
                        <button
                          type="button"
                          aria-label="Preferências de Lembrete"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-notification-settings'))}
                          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                          title="Configurar Lembretes e Resumos"
                        >
                          <Settings size={14} />
                        </button>
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                      {notifications.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '20px' }}>Nenhuma notificação por enquanto.</p>
                      ) : (
                        notifications.map(notif => (
                          <motion.div
                            key={notif.id}
                            whileHover={{ x: 4 }}
                            onClick={() => {
                              markAsRead(notif.id);
                              if (notif.actionUrl) {
                                setShowNotifications(false);
                                router.push(notif.actionUrl);
                              }
                            }}
                            style={{
                              padding: '14px', borderRadius: '16px',
                              background: notif.read ? 'transparent' : 'var(--color-terracotta-100)',
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
          )}
          {isExpanded && mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              title={resolvedTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
        </div>

        {mounted && !isExpanded && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            onMouseEnter={(e) => {
              setHoveredPath('theme-toggle');
              if (!isExpanded) {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveTooltip({ label: resolvedTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro', top: rect.top + rect.height / 2 });
              }
            }}
            onMouseLeave={() => {
              setHoveredPath(null);
              setActiveTooltip(null);
            }}
            style={{
              position: 'relative',
              background: 'transparent',
              padding: isExpanded ? '16px' : '12px 0',
              borderRadius: 'var(--radius-input)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '100%',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden'
            }}
          >
            <AnimatePresence>
              {hoveredPath === 'theme-toggle' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', zIndex: 0 }}
                />
              )}
            </AnimatePresence>

            <motion.div whileTap={{ scale: 0.96 }} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ minWidth: '18px', minHeight: '18px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden' }}
                  >
                    {resolvedTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>
        )}
      </div>
    </aside>
  );
}
