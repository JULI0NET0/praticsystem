"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      // Cmd + T: Toggle Theme
      if (isCmdOrCtrl && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }

      // Cmd + H: Home
      if (isCmdOrCtrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        router.push("/");
      }

      // Cmd + /: Toggle Shortcut Help
      if (isCmdOrCtrl && e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-shortcuts"));
      }

      // Cmd + B: Toggle Sidebar (via Custom Event)
      if (isCmdOrCtrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
      }

      // Cmd + K: Quick Search / Command Palette
      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-search"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, resolvedTheme, setTheme]);
}
