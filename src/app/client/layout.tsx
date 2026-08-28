"use client";

import ClientSidebar from "@/components/ClientSidebar";
import { ReactNode } from "react";
import ShortcutOverlay from "@/components/ShortcutOverlay";
import GlobalClientControls from "@/components/GlobalClientControls";
import { AuthProvider } from "@/hooks/useAuth";

import { NotificationProvider } from "@/context/NotificationContext";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface-canvas)' }}>
          <ShortcutOverlay />
          <GlobalClientControls />

          <ClientSidebar />

          <main style={{ flex: 1, padding: 'var(--content-padding)', position: 'relative', overflowY: 'auto', maxHeight: '100vh' }}>
            {children}
          </main>
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}
