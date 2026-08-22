"use client";

import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/** Convite à ação, nunca só um aviso de ausência. */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(className)}
      style={{
        textAlign: "center",
        padding: compact ? "24px 16px" : "48px 24px",
        border: "1px dashed var(--color-border-default)",
        borderRadius: "var(--radius-card)",
        background: "var(--color-surface-sunken)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon && (
        <span style={{ color: "var(--color-text-muted)", marginBottom: 2 }}>
          {icon}
        </span>
      )}
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-h3)",
          fontWeight: 500,
          color: "var(--color-text-primary)",
        }}
      >
        {title}
      </span>
      {description && (
        <p
          style={{
            fontSize: "var(--text-ui)",
            color: "var(--color-text-secondary)",
            maxWidth: 340,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
