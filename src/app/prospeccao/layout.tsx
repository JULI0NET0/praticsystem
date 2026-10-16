"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import "@/components/prospeccao/prospeccao.css";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import RoleGuard from "@/components/auth/RoleGuard";
import { ProspeccaoProvider } from "@/components/prospeccao/ProspeccaoProvider";
import ProspeccaoFrame from "@/components/prospeccao/ProspeccaoFrame";
import { safeProspeccaoNext } from "@/lib/prospeccao/paths";

const ALLOWED_ROLES = ["admin", "board", "social_media"];

function ProspeccaoFocusGate({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || currentUser) return;
    const here = window.location.pathname + window.location.search;
    const next = safeProspeccaoNext(here) ?? "/prospeccao";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return (
      <div className="pp-focus pp-focus-loading">
        <Loader2 size={32} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="pp-focus">
        <ProspeccaoProvider>
          <ProspeccaoFrame>{children}</ProspeccaoFrame>
        </ProspeccaoProvider>
      </div>
    </RoleGuard>
  );
}

export default function ProspeccaoFocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProspeccaoFocusGate>{children}</ProspeccaoFocusGate>
    </AuthProvider>
  );
}
