"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ContextMenu from "@/components/ContextMenu";
import ShortcutOverlay from "@/components/ShortcutOverlay";

export default function GlobalClientControls() {
  useKeyboardShortcuts();

  return (
    <>
      <ContextMenu />
      <ShortcutOverlay />
    </>
  );
}
