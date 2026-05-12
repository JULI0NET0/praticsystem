"use client";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PresenceProvider } from "@/hooks/usePresence";
import { TimeTrackerProvider } from "@/hooks/useTimeTracker";
import { Loader2 } from "lucide-react";

function AdminProvidersInner({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <Loader2 size={32} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <PresenceProvider currentUser={currentUser}>
      <TimeTrackerProvider>
        {children}
      </TimeTrackerProvider>
    </PresenceProvider>
  );
}

export default function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProvidersInner>
        {children}
      </AdminProvidersInner>
    </AuthProvider>
  );
}
