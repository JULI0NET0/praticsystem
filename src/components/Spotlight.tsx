"use client";

import { ElementType } from "react";

interface SpotlightProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: ElementType;
  onClick?: () => void;
  [key: string]: any;
}

/**
 * Wrapper neutro — mantido só como ponte de migração.
 *
 * Antes pintava um radial-gradient branco a 5% seguindo o mouse, que
 * fazia sentido sobre o vidro escuro. No pergaminho ele é invisível
 * (branco sobre branco) e, no card creme, uma mancha suja. O efeito
 * foi removido junto com o rastreamento de mouse e o re-render por
 * movimento que ele custava em ~90 pontos da aplicação.
 *
 * O componente continua existindo porque é usado como container em
 * ~30 arquivos; trocar as chamadas por <div>/<Card> é trabalho das
 * fases por tela. Quando a última sair, delete este arquivo.
 */
export default function Spotlight({
  children,
  className = "",
  style = {},
  as: Component = "div",
  onClick,
  ...props
}: SpotlightProps) {
  return (
    <Component
      onClick={onClick}
      className={className}
      {...props}
      style={{ position: "relative", ...style }}
    >
      {children}
    </Component>
  );
}
