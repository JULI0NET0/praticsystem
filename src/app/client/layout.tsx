"use client";

import ClientSidebar from "@/components/ClientSidebar";
import { ReactNode } from "react";
import InteractiveBackground from "@/components/InteractiveBackground";
import ShortcutOverlay from "@/components/ShortcutOverlay";
import GlobalClientControls from "@/components/GlobalClientControls";
import { AuthProvider } from "@/hooks/useAuth";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <InteractiveBackground />
        <ShortcutOverlay />
        <GlobalClientControls />
        
        <ClientSidebar />
        
        <main style={{ flex: 1, padding: '40px', position: 'relative', overflowY: 'auto', maxHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
