"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ContextMenu from "@/components/ContextMenu";
import ShortcutOverlay from "@/components/ShortcutOverlay";
import InAppNotificationBanner from "@/components/notifications/InAppNotificationBanner";
import NotificationPermissionModal from "@/components/notifications/NotificationPermissionModal";

export default function GlobalClientControls() {
  useKeyboardShortcuts();

  return (
    <>
      <InAppNotificationBanner />
      <NotificationPermissionModal />
      <ContextMenu />
      <ShortcutOverlay />
    </>
  );
}
