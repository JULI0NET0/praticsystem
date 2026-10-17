"use client";

import React from "react";

export type PraticLabsLogoVariant = "cobrand" | "dot" | "badge" | "editorial";
export type PraticLabsIconStyle = "eye-accent" | "duotone" | "terracotta" | "mono";

export interface PraticLabsLogoProps {
  /** Lockup typography style (default: "cobrand" — Opção 4) */
  variant?: PraticLabsLogoVariant;
  /** Color treatment for the original Pratic P symbol (wolf + lightning) */
  iconStyle?: PraticLabsIconStyle;
  /** Renders only the symbol icon (e.g. when sidebar is collapsed) */
  collapsed?: boolean;
  /** Optional subtitle suffix for cobrand or subtitle for other variants */
  subtitle?: string;
  /** Size preset */
  size?: "md" | "lg";
  /** Additional classes for outer wrapper */
  className?: string;
}

const STEM_PATH =
  "M 50.1 69.6 L 53.0 68.5 L 208.0 68.5 L 212.8 69.7 L 214.9 72.6 L 213.9 86.4 L 183.3 214.8 L 167.6 323.1 L 162.5 376.0 L 165.1 382.4 L 171.4 383.9 L 205.0 358.5 L 211.6 357.9 L 215.6 360.9 L 215.7 369.2 L 198.6 450.1 L 198.9 455.6 L 201.1 458.4 L 209.9 459.4 L 272.0 449.5 L 276.6 450.9 L 279.1 454.4 L 277.8 463.3 L 237.2 570.7 L 225.9 616.4 L 220.5 658.0 L 220.5 776.0 L 219.4 778.9 L 53.0 779.5 L 49.8 777.7 Z";

const BOWL_PATH =
  "M 385.5 55.0 L 431.0 54.5 L 454.9 56.6 L 487.4 61.1 L 528.3 71.2 L 577.9 91.6 L 604.6 107.9 L 630.5 128.0 L 649.0 146.5 L 670.1 174.4 L 682.4 195.1 L 698.8 235.7 L 704.7 258.8 L 710.4 296.1 L 711.5 344.0 L 709.4 367.9 L 702.9 402.4 L 692.8 434.3 L 678.4 465.9 L 666.3 485.8 L 645.0 513.5 L 623.5 535.0 L 597.6 555.1 L 570.9 571.4 L 547.9 582.4 L 515.4 593.9 L 475.2 602.7 L 440.0 606.5 L 402.0 606.5 L 368.1 603.4 L 325.7 594.8 L 314.0 587.5 L 310.1 580.4 L 308.6 571.1 L 317.6 541.1 L 343.7 493.2 L 370.0 455.5 L 390.5 434.0 L 404.4 422.9 L 429.2 406.7 L 497.6 367.1 L 538.5 336.0 L 560.3 308.8 L 568.8 289.3 L 571.4 276.9 L 572.5 265.0 L 568.8 240.7 L 564.5 233.0 L 557.1 229.4 L 546.1 229.6 L 429.9 246.4 L 420.1 246.4 L 412.5 243.0 L 396.5 227.0 L 380.6 214.9 L 362.9 204.6 L 349.3 199.2 L 322.0 193.5 L 292.1 196.4 L 282.9 191.6 L 253.1 114.4 L 253.7 105.2 L 258.5 100.0 L 276.2 87.7 L 310.7 70.2 L 344.6 60.1 Z";

const EYE_PATH =
  "M 348.5 234.0 L 361.4 235.1 L 371.6 239.9 L 378.3 247.2 L 380.1 254.1 L 360.1 252.6 L 335.7 258.2 L 311.9 268.9 L 310.9 266.4 L 313.6 258.1 L 320.0 248.5 L 327.4 241.9 L 338.6 236.1 Z";

export function PraticSymbolSVG({
  iconStyle = "eye-accent",
  className = "w-5 h-5",
}: {
  iconStyle?: PraticLabsIconStyle;
  className?: string;
}) {
  if (iconStyle === "terracotta") {
    return (
      <svg viewBox="30 35 700 765" className={className} aria-hidden="true">
        <path fill="var(--color-ink, #1b1c1a)" d={STEM_PATH} />
        <path fill="var(--color-ink, #1b1c1a)" d={BOWL_PATH} />
        <path fill="var(--color-ink, #1b1c1a)" d={EYE_PATH} />
      </svg>
    );
  }

  if (iconStyle === "mono") {
    return (
      <svg viewBox="30 35 700 765" className={className} aria-hidden="true">
        <path fill="currentColor" d={STEM_PATH} />
        <path fill="currentColor" d={BOWL_PATH} />
        <path fill="currentColor" d={EYE_PATH} />
      </svg>
    );
  }

  if (iconStyle === "duotone") {
    return (
      <svg viewBox="30 35 700 765" className={className} aria-hidden="true">
        <path fill="var(--color-terracotta, #d97757)" d={STEM_PATH} />
        <path fill="var(--color-parchment, #faf9f5)" d={BOWL_PATH} />
        <path fill="var(--color-terracotta, #d97757)" d={EYE_PATH} />
      </svg>
    );
  }

  // Default: "eye-accent" (Opção 04 — Símbolo P em pergaminho sobre Ink com olho em Terracota)
  return (
    <svg viewBox="30 35 700 765" className={className} aria-hidden="true">
      <path fill="var(--color-parchment, #faf9f5)" d={STEM_PATH} />
      <path fill="var(--color-parchment, #faf9f5)" d={BOWL_PATH} />
      <path fill="var(--color-terracotta, #d97757)" d={EYE_PATH} />
    </svg>
  );
}

export default function PraticLabsLogo({
  variant = "cobrand",
  iconStyle = "eye-accent",
  collapsed = false,
  subtitle,
  size = "md",
  className = "",
}: PraticLabsLogoProps) {
  const containerClasses =
    iconStyle === "terracotta"
      ? "bg-[var(--color-terracotta)] text-[var(--color-text-on-accent)]"
      : "bg-[var(--color-ink)] text-[var(--color-parchment)] border border-[var(--color-border-subtle)]";

  const boxSize = size === "lg" ? "w-10 h-10 rounded-xl" : "w-8 h-8 rounded-xl";
  const svgSize = size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const titleSize = size === "lg" ? "text-[17px]" : "text-base";

  const iconBadge = (
    <div
      className={`${boxSize} ${containerClasses} flex items-center justify-center shrink-0 shadow-sm ${
        collapsed ? "mx-auto" : ""
      }`}
    >
      <PraticSymbolSVG iconStyle={iconStyle} className={svgSize} />
    </div>
  );

  if (collapsed) {
    return iconBadge;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {iconBadge}
      <div>
        {variant === "cobrand" && (
          <>
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`font-black ${titleSize} tracking-tight text-[var(--color-text-primary)]`}>
                pratic<span className="text-[var(--color-terracotta)]">.</span>chat
              </span>
              <span className="text-[11px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 leading-tight">
              by <strong className="font-bold text-[var(--color-text-primary)]">pratic<span className="text-[var(--color-terracotta)]">.</span>labs</strong>
              {subtitle ? ` · ${subtitle}` : ""}
            </span>
          </>
        )}

        {variant === "dot" && (
          <>
            <div className="flex items-center leading-none">
              <span className={`font-black ${titleSize} tracking-tight text-[var(--color-text-primary)]`}>
                pratic
                <span className="text-[var(--color-terracotta)]">.</span>
                <span className="font-bold text-[var(--color-terracotta)]">labs</span>
              </span>
            </div>
            {subtitle && (
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 leading-tight">
                {subtitle}
              </span>
            )}
          </>
        )}

        {variant === "badge" && (
          <>
            <div className="flex items-center gap-1.5 leading-none">
              <span className={`font-black ${titleSize} tracking-tight text-[var(--color-text-primary)]`}>
                pratic.
              </span>
              <span className="text-[11px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[var(--color-terracotta-100)] text-[var(--color-terracotta-ink)]">
                LABS
              </span>
            </div>
            {subtitle && (
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 leading-tight">
                {subtitle}
              </span>
            )}
          </>
        )}

        {variant === "editorial" && (
          <>
            <div className="flex items-baseline leading-none">
              <span className={`font-black ${titleSize} tracking-tight text-[var(--color-text-primary)]`}>
                pratic.
              </span>
              <span className={`font-serif italic font-normal ${titleSize} text-[var(--color-terracotta-700)]`}>
                labs
              </span>
            </div>
            {subtitle && (
              <span className="text-[11px] text-[var(--color-text-secondary)] block mt-0.5 leading-tight">
                {subtitle}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
