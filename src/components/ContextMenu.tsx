"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, 
  ArrowLeft, 
  Keyboard, 
  Moon, 
  Sun, 
  Home,
  Monitor
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export default function ContextMenu() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
    };
  }, [handleContextMenu, handleClick]);

  const menuItems = [
    { 
      label: "Voltar", 
      icon: ArrowLeft, 
      action: () => window.history.back(),
      shortcut: "Alt + ←"
    },
    { 
      label: "Recarregar", 
      icon: RotateCcw, 
      action: () => window.location.reload(),
      shortcut: "Cmd + R"
    },
    { 
      label: "Ir para Home", 
      icon: Home, 
      action: () => router.push("/"),
      shortcut: "Cmd + H"
    },
    { separator: true },
    { 
      label: resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro", 
      icon: resolvedTheme === "dark" ? Sun : Moon, 
      action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      shortcut: "Cmd + T"
    },
    { 
      label: "Atalhos", 
      icon: Keyboard, 
      action: () => window.dispatchEvent(new CustomEvent("toggle-shortcuts")),
      shortcut: "Cmd + /"
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="context-menu"
          style={{ 
            top: position.y, 
            left: position.x,
            transformOrigin: "top left"
          }}
        >
          {menuItems.map((item, index) => (
            item.separator ? (
              <div key={index} className="context-menu-separator" />
            ) : (
              <button
                key={index}
                className="context-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  item.action?.();
                  setVisible(false);
                }}
              >
                {item.icon && <item.icon size={18} />}
                <span>{item.label}</span>
                {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
              </button>
            )
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
