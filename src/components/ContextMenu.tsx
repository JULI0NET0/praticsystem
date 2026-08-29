"use client";

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, 
  ArrowLeft, 
  Keyboard, 
  Moon, 
  Sun, 
  Home,
  Copy,
  Search,
  Hash,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/CustomToast";

interface ContextTargetInfo {
  selectedText: string;
  contextId: string | null;
  linkUrl: string | null;
}

export default function ContextMenu() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetInfo, setTargetInfo] = useState<ContextTargetInfo>({
    selectedText: "",
    contextId: null,
    linkUrl: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();

    const selection = window.getSelection()?.toString() || "";
    const selectedText = selection.trim();

    const target = e.target as HTMLElement | null;
    const dataId = target?.closest("[data-id]")?.getAttribute("data-id") || null;
    const demandId = target?.closest("[data-demand-id]")?.getAttribute("data-demand-id") || null;
    const rawId = target?.id && !target.id.startsWith("__") && !target.id.startsWith("radix") ? target.id : null;
    const contextId = dataId || demandId || rawId;

    const linkEl = target?.closest("a[href]") as HTMLAnchorElement | null;
    const linkUrl = linkEl?.href || null;

    setTargetInfo({
      selectedText,
      contextId,
      linkUrl,
    });

    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    setVisible(false);
  }, []);

  // Ajusta a posição para não vazar da viewport
  useLayoutEffect(() => {
    if (!visible || !menuRef.current) return;
    const { width, height } = menuRef.current.getBoundingClientRect();
    setPosition((prev) => ({
      x: Math.max(12, Math.min(prev.x, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(prev.y, window.innerHeight - height - 12)),
    }));
  }, [visible, targetInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleClick, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleClick, true);
    };
  }, [handleContextMenu, handleClick]);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage, "success");
    } catch {
      showToast("Não foi possível copiar para a área de transferência.", "error");
    }
  };

  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const cmdKey = isMac ? "Cmd" : "Ctrl";

  type MenuItem = 
    | { separator: true }
    | {
        label: string;
        icon?: React.ComponentType<{ size?: number }>;
        action?: () => void;
        shortcut?: string;
        highlight?: boolean;
      };

  const menuItems: MenuItem[] = [];

  // Se houver texto selecionado
  if (targetInfo.selectedText) {
    const preview = targetInfo.selectedText.length > 20 
      ? `"${targetInfo.selectedText.slice(0, 20)}..."` 
      : `"${targetInfo.selectedText}"`;

    menuItems.push({
      label: `Copiar texto`,
      icon: Copy,
      shortcut: `${cmdKey} + C`,
      action: () => copyToClipboard(targetInfo.selectedText, "Texto copiado!"),
    });

    menuItems.push({
      label: `Pesquisar ${preview} no Google`,
      icon: Search,
      action: () => {
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(targetInfo.selectedText)}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
    });

    menuItems.push({ separator: true });
  }

  // Se houver elemento com ID específico
  if (targetInfo.contextId && targetInfo.contextId !== targetInfo.selectedText) {
    const displayId = targetInfo.contextId.length > 18
      ? `${targetInfo.contextId.slice(0, 10)}...`
      : targetInfo.contextId;

    menuItems.push({
      label: `Copiar ID (${displayId})`,
      icon: Hash,
      action: () => copyToClipboard(targetInfo.contextId!, "ID copiado!"),
    });

    menuItems.push({ separator: true });
  }

  // Se clicou em um link
  if (targetInfo.linkUrl) {
    menuItems.push({
      label: "Abrir link em nova aba",
      icon: ExternalLink,
      action: () => window.open(targetInfo.linkUrl!, "_blank", "noopener,noreferrer"),
    });
    menuItems.push({
      label: "Copiar endereço do link",
      icon: LinkIcon,
      action: () => copyToClipboard(targetInfo.linkUrl!, "Link copiado!"),
    });
    menuItems.push({ separator: true });
  }

  // Ações de navegação e sistema
  menuItems.push(
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
      shortcut: `${cmdKey} + R`
    },
    { 
      label: "Ir para Home", 
      icon: Home, 
      action: () => router.push("/"),
      shortcut: `${cmdKey} + H`
    },
    { separator: true },
    { 
      label: resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro", 
      icon: resolvedTheme === "dark" ? Sun : Moon, 
      action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      shortcut: `${cmdKey} + T`
    },
    { 
      label: "Atalhos", 
      icon: Keyboard, 
      action: () => window.dispatchEvent(new CustomEvent("toggle-shortcuts")),
      shortcut: `${cmdKey} + /`
    }
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="context-menu"
          style={{ 
            top: position.y, 
            left: position.x,
            transformOrigin: "top left",
            minWidth: 220,
            maxWidth: 320,
          }}
        >
          {menuItems.map((item, index) => (
            "separator" in item ? (
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
                {item.icon && <item.icon size={16} />}
                <span style={{ 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap",
                  flex: 1,
                  textAlign: "left"
                }}>
                  {item.label}
                </span>
                {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
              </button>
            )
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
