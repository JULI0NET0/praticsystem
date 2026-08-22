"use client";

import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONE: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  accent: "badge-accent",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
};

/** Cor do ponto indicador — segue o "ink" de cada família. */
const DOT: Record<BadgeTone, string> = {
  neutral: "var(--color-text-tertiary)",
  accent: "var(--color-terracotta-700)",
  success: "var(--color-success-ink)",
  warning: "var(--color-warning-ink)",
  danger: "var(--color-danger-ink)",
  info: "var(--color-info-ink)",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export default function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn("badge", TONE[tone], className)} {...props}>
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: DOT[tone],
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
