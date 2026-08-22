"use client";

import { cn } from "@/lib/cn";

type Padding = "none" | "compact" | "default";

const PAD: Record<Padding, string | undefined> = {
  none: undefined,
  compact: "var(--card-pad-compact)",
  default: "var(--card-pad)",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  /** Superfície rebaixada em vez de elevada. */
  sunken?: boolean;
}

export function Card({
  padding = "default",
  sunken = false,
  className,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(sunken ? "surface-sunken" : "surface", className)}
      style={{ padding: PAD[padding], ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

// `title` é omitido do HTMLAttributes: lá ele é o atributo string de
// tooltip, aqui é o conteúdo do cabeçalho (ReactNode).
export interface CardHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** Contagem discreta à direita do título (ex.: "12 itens"). */
  count?: React.ReactNode;
  action?: React.ReactNode;
}

/** Cabeçalho de 40px com borda inferior — o padrão do mockup. */
export function CardHeader({
  icon,
  title,
  count,
  action,
  className,
  style,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(className)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: "var(--card-head-h)",
        padding: "0 var(--card-pad)",
        borderBottom: "1px solid var(--color-border-subtle)",
        ...style,
      }}
      {...props}
    >
      {icon && (
        <span
          style={{
            display: "flex",
            color: "var(--color-text-tertiary)",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}
      <span
        style={{
          fontSize: "var(--text-data)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      {count != null && (
        <span
          style={{
            fontSize: "var(--text-micro)",
            color: "var(--color-text-tertiary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
      )}
      {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
    </div>
  );
}

export function CardBody({
  className,
  style,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} style={{ padding: "var(--card-pad)", ...style }} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  style,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(className)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: "var(--card-pad-compact) var(--card-pad)",
        borderTop: "1px solid var(--color-border-subtle)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
