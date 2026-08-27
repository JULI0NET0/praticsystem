"use client";

import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Migalhas ou rótulo de seção acima do título. */
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * O único lugar (junto do EmptyState) onde a serifa aparece: é o
 * registro editorial da marca. No resto da interface a serifa
 * atrapalharia a densidade.
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("page-header", className)}>
      <div className="page-header-info">
        {eyebrow && (
          <div
            style={{
              fontSize: "var(--text-micro)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-terracotta-700)",
              marginBottom: 4,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-h1)",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "var(--text-ui)",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
