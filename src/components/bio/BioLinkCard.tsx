import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface BioLinkCardProps {
  eyebrow: string;
  title: string;
  description: string;
  index?: number;
  href: string;
  external?: boolean;
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
}: BioLinkCardProps) {
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
    textAlign: "left",
    animationDelay: `${index * 80}ms`,
    animationFillMode: "backwards",
  };

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="surface hover-accent animate-fade-in-up"
      style={sharedStyle}
    >
      {content}
    </Link>
  );
}
