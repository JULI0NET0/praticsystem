"use client";

import { createElement } from "react";
import { resolveIcon } from "./icons";

interface Props {
  name?: string;
  size?: number;
  color?: string;
}

/** Renderiza o ícone lucide correspondente ao nome (sem criar componente no JSX). */
export default function OperacaoIcon({ name, size = 16, color }: Props) {
  return createElement(resolveIcon(name), { size, color });
}
