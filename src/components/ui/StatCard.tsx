"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Sufixo discreto ao lado do número (ex.: "hrs", "%"). */
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
  density?: "standard" | "compact";
  className?: string;
  onClick?: () => void;
}

const TREND_COLOR = {
  up: "var(--color-success-ink)",
  down: "var(--color-danger-ink)",
  neutral: "var(--color-text-tertiary)",
} as const;

/**
 * KPI do mockup: label micro em caixa alta, número grande em
 * tabular-nums, ícone num tile pequeno. A hierarquia vem do peso,
 * não do tamanho.
 */
export default function StatCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
  subtitle,
  density = "standard",
  className,
  onClick,
}: StatCardProps) {
  const compact = density === "compact";
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn("surface", className)}
      onClick={onClick}
      style={{
        padding: compact ? "10px 12px" : "14px 16px",
        minHeight: compact ? 68 : 84,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 6,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && (
          <span
            style={{
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-sunken)",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: "var(--text-micro)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: compact ? 19 : 24,
            fontWeight: 650,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: "var(--text-caption)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {unit}
          </span>
        )}
        {trend && trendValue && (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: "var(--text-micro)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: TREND_COLOR[trend],
            }}
          >
            {trend !== "neutral" && <TrendIcon size={12} />}
            {trendValue}
          </span>
        )}
      </div>

      {subtitle && (
        <span
          style={{
            fontSize: "var(--text-micro)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
