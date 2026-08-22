/**
 * Cores CATEGÓRICAS — para faixas de kanban, tags e séries de gráfico.
 *
 * ⚠️ Estas ficam como hex LITERAL de propósito. `StatusPill` faz
 * `${status.color}1A` para derivar o wash, e concatenação de string
 * não funciona com `var(--token)`. Não converta.
 *
 * Elas codificam CATEGORIA, não estado — por isso não usam as famílias
 * semânticas (success/warning/danger). O ramp foi dessaturado e
 * escurecido (~50-55% de luminosidade) para assentar no pergaminho:
 * os valores originais eram Tailwind-500, calibrados para fundo escuro,
 * e vibravam sobre creme.
 */
export const CATEGORICAL = {
  slate: "#6E6D66",
  blue: "#5B84AD",
  indigo: "#6A6FA8",
  violet: "#8A6FA0",
  magenta: "#A66189",
  rose: "#B05C63",
  terracotta: "#C96442",
  amber: "#BE8A4A",
  olive: "#788C5D",
  teal: "#5A9188",
  green: "#5E7F52",
} as const;

export type CategoricalKey = keyof typeof CATEGORICAL;

/** Ordem estável para atribuir cores a séries sem cor definida. */
export const CATEGORICAL_RAMP: string[] = [
  CATEGORICAL.terracotta,
  CATEGORICAL.blue,
  CATEGORICAL.olive,
  CATEGORICAL.amber,
  CATEGORICAL.violet,
  CATEGORICAL.teal,
  CATEGORICAL.rose,
  CATEGORICAL.indigo,
  CATEGORICAL.magenta,
  CATEGORICAL.green,
  CATEGORICAL.slate,
];

export function categoricalAt(index: number): string {
  return CATEGORICAL_RAMP[index % CATEGORICAL_RAMP.length];
}

/**
 * Tom semântico de um status, derivado da categoria. É o que o
 * `Badge` deve usar — a cor categórica fica para a faixa do kanban.
 */
export type StatusCategory = "nao_iniciado" | "ativo" | "fechado";

export const CATEGORY_TONE: Record<
  StatusCategory,
  "neutral" | "info" | "success"
> = {
  nao_iniciado: "neutral",
  ativo: "info",
  fechado: "success",
};
