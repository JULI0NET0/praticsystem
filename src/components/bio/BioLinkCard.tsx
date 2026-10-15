import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface BioLinkCardProps {
  eyebrow: string;
  title: string;
  description: string;
  index?: number;
  href: string;
  external?: boolean;
  /** Cartão de destaque com imagem de capa 16:9 e botão. */
  featured?: { image: string; imageAlt: string; ctaLabel: string };
}

/**
 * Card de oferta sem acordeão: título + descrição sempre visíveis,
 * o card inteiro é um link que navega direto pra `href`.
 */
export default function BioLinkCard({
  eyebrow,
  title,
  description,
  index = 0,
  href,
  external,
  featured,
}: BioLinkCardProps) {
  const linkProps = {
    href,
    target: external ? "_blank" : undefined,
    rel: external ? "noopener noreferrer" : undefined,
  };

  if (featured) {
    return (
      <Link
        {...linkProps}
        className="surface hover-accent animate-fade-in-up"
        style={{
          display: "block",
          overflow: "hidden",
          height: "100%",
          border: "1px solid color-mix(in srgb, var(--color-terracotta) 45%, transparent)",
          animationDelay: `${index * 80}ms`,
          animationFillMode: "backwards",
        }}
      >
        <div style={{ position: "relative", aspectRatio: "16 / 9" }}>
          {/* TODO: trocar a capa em public/bio/curso-edicao-no-automatico.jpg se necessário */}
          <Image
            src={featured.image}
            alt={featured.imageAlt}
            fill
            loading="eager"
            priority
            sizes="(max-width: 440px) 100vw, 440px"
            style={{ objectFit: "cover" }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, var(--color-surface, #1c1c1c) 0%, transparent 35%)",
            }}
          />
        </div>
        <div style={{ padding: "var(--space-1) var(--space-4) 0" }}>
          <Badge tone="accent" style={{ marginBottom: "var(--space-2)" }}>
            {eyebrow}
          </Badge>
          <h2
            style={{
              fontSize: "var(--text-h3)",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-1)",
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: "var(--text-ui)", color: "var(--color-text-tertiary)", lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
        <div style={{ padding: "var(--space-3) var(--space-4) var(--space-4)" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              minHeight: 48,
              borderRadius: "var(--radius-full)",
              background: "var(--color-terracotta)",
              color: "#0A0A0A",
              fontWeight: 700,
              fontSize: "var(--text-body)",
            }}
          >
            {featured.ctaLabel}
            <ArrowUpRight size={18} aria-hidden />
          </span>
        </div>
      </Link>
    );
  }
  const content = (
    <>
      <div>
        <Badge tone="accent" style={{ marginBottom: "var(--space-2)" }}>
          {eyebrow}
        </Badge>
        <h2
          style={{
            fontSize: "var(--text-h3)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: "var(--text-ui)",
            color: "var(--color-text-tertiary)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
      <span
        aria-hidden
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-full)",
          background: "var(--color-surface-sunken)",
          color: "var(--color-text-secondary)",
          flexShrink: 0,
        }}
      >
        <ArrowUpRight size={16} />
      </span>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-4)",
    padding: "var(--card-pad)",
    height: "100%",
    minHeight: 44,
    textAlign: "left",
    animationDelay: `${index * 80}ms`,
    animationFillMode: "backwards",
  };

  return (
    <Link
      {...linkProps}
      className="surface hover-accent animate-fade-in-up"
      style={sharedStyle}
    >
      {content}
    </Link>
  );
}
