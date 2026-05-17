"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface DropdownMenuItem {
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  danger?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export default function DropdownMenu({ trigger, items, align = 'left', className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }} className={className}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="glass-card context-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              [align === 'left' ? 'left' : 'right']: 0,
              minWidth: '220px',
              zIndex: 9999,
              padding: '8px',
              borderRadius: '18px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)'
            }}
          >
            {items.map((item, index) => (
              item.separator ? (
                <div key={index} className="context-menu-separator" />
              ) : (
                <button
                  key={index}
                  className="context-menu-item"
                  style={{
                    color: item.danger ? '#EF4444' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(217, 72, 15, 0.15)';
                    e.currentTarget.style.color = item.danger ? '#EF4444' : 'var(--accent)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = item.danger ? '#EF4444' : 'var(--text-primary)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action?.();
                    setIsOpen(false);
                  }}
                >
                  {item.icon && <item.icon size={18} />}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.shortcut && <span className="context-menu-shortcut" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6, fontFamily: 'monospace' }}>{item.shortcut}</span>}
                </button>
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
