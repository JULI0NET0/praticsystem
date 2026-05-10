"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { label: "Alternar Sidebar", key: "⌘ + B" },
  { label: "Alternar Tema", key: "⌘ + T" },
  { label: "Ir para Home", key: "⌘ + H" },
  { label: "Busca Rápida", key: "⌘ + K" },
  { label: "Ver Atalhos", key: "⌘ + /" },
  { label: "Menu de Contexto", key: "Botão Direito" },
];

export default function ShortcutOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("toggle-shortcuts", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("toggle-shortcuts", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 9999,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="shortcut-overlay"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "40px", 
                  height: "40px", 
                  borderRadius: "12px", 
                  background: "rgba(217, 72, 15, 0.1)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "var(--accent)"
                }}>
                  <Keyboard size={20} />
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Atalhos do Sistema</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ 
                  color: "var(--text-secondary)", 
                  padding: "8px", 
                  borderRadius: "50%",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <X size={20} />
              </button>
            </div>

            <div className="shortcut-grid">
              {SHORTCUTS.map((s, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <span className="shortcut-label">{s.label}</span>
                  <span className="shortcut-key">{s.key}</span>
                </div>
              ))}
            </div>

            <div style={{ 
              marginTop: "32px", 
              paddingTop: "24px", 
              borderTop: "1px solid var(--border)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              textAlign: "center"
            }}>
              Pressione <span className="shortcut-key" style={{ fontSize: "0.75rem" }}>ESC</span> para fechar
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
