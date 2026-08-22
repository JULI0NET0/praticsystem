"use client";

import { cn } from "@/lib/cn";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  lines?: number;
  className?: string;
}

export default function Skeleton({
  width = "100%",
  height = 14,
  radius = "var(--radius-sm)",
  lines = 1,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(className)}
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === lines - 1 && lines > 1 ? "70%" : width,
            height,
            borderRadius: radius,
            background: "var(--color-surface-inset)",
            animation: "skeleton-pulse 1.4s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
