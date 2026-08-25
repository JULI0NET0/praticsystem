"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MANAGEMENT_ROLES } from "@/lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallbackUrl?: string;
}

export default function RoleGuard({
  children,
  allowedRoles = MANAGEMENT_ROLES,
  fallbackUrl = "/admin/workspace",
}: RoleGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  const isAuthorized = currentUser && allowedRoles.includes(currentUser.role);

  useEffect(() => {
    if (!loading && (!currentUser || !allowedRoles.includes(currentUser.role))) {
      // Pequeno timeout para permitir leitura do aviso se preferir, ou auto-redirect
      // Deixamos a tela de feedback amigável com opção de redirecionamento.
    }
  }, [loading, currentUser, allowedRoles, fallbackUrl, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Loader2 size={36} color="var(--accent)" className="animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            backgroundColor: "var(--color-danger-wash, rgba(239, 68, 68, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-danger, #ef4444)",
            marginBottom: "20px",
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
          Acesso Restrito
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            maxWidth: "420px",
            lineHeight: 1.5,
            marginBottom: "24px",
            fontSize: "0.95rem",
          }}
        >
          Seu perfil ({currentUser?.role || "visitante"}) não possui permissão para acessar esta área ou visualizar estes dados.
        </p>

        <Link
          href={fallbackUrl}
          className="btn btn-accent"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Voltar para o Workspace
        </Link>
      </motion.div>
    );
  }

  return <>{children}</>;
}
