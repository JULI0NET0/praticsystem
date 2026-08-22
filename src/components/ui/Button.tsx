"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

/**
 * Mapeia para as classes já definidas em components.css, em vez de
 * reimplementar os estilos: os ~200 `btn btn-accent` / `btn btn-secondary`
 * espalhados pelo app continuam idênticos a este primitivo enquanto a
 * migração acontece tela a tela.
 */
const VARIANT: Record<Variant, string> = {
  primary: "btn-accent",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  link: "btn-ghost",
};

const SIZE: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  icon: "btn-icon",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn("btn", VARIANT[variant], SIZE[size], className)}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" />
      ) : (
        leftIcon
      )}
      {/* children sempre renderiza: num botão `size="icon"` o children
          É o ícone, então suprimi-lo deixava o botão vazio. */}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
