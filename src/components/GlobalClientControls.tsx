"use client";

import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDemandReminders } from "@/hooks/useDemandReminders";
import ContextMenu from "@/components/ContextMenu";
import ShortcutOverlay from "@/components/ShortcutOverlay";
import InAppNotificationBanner from "@/components/notifications/InAppNotificationBanner";
import NotificationPermissionModal from "@/components/notifications/NotificationPermissionModal";
import NotificationSettingsModal from "@/components/notifications/NotificationSettingsModal";

export default function GlobalClientControls() {
  useKeyboardShortcuts();
  useDemandReminders();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsSettingsOpen(true);
    window.addEventListener("open-notification-settings", handleOpen);
    return () => window.removeEventListener("open-notification-settings", handleOpen);
  }, []);

  return (
    <>
      <InAppNotificationBanner />
      <NotificationPermissionModal />
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ContextMenu />
      <ShortcutOverlay />
    </>
  );
}
