/**
 * Paleta para Recharts.
 *
 * Recharts recebe cor via prop JS (`stroke`, `fill`), não via CSS, então
 * `var(--token)` não resolve de forma confiável dentro de <svg> gerado
 * por ele. Por isso aqui são literais — mas centralizados, e escolhidos
 * a partir dos mesmos valores do theme.css.
 *
 * Use `useChartColors()` para acompanhar o tema.
 */
import { useTheme } from "next-themes";
import { CATEGORICAL_RAMP } from "./statusColors";

export interface ChartPalette {
  accent: string;
  accentSoft: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  text: string;
  series: string[];
}

const LIGHT: ChartPalette = {
  accent: "#d97757",
  accentSoft: "#f3dfd3",
  success: "#788c5d",
  danger: "#b23b2e",
  warning: "#d37f49",
  info: "#6a9bcc",
  grid: "#e3e2df",
  axis: "#6e6d66",
  tooltipBg: "#ffffff",
  tooltipBorder: "#c7c7bf",
  text: "#1b1c1a",
  series: CATEGORICAL_RAMP,
};

const DARK: ChartPalette = {
  accent: "#d97757",
  accentSoft: "#4a2e20",
  success: "#9cb381",
  danger: "#e0897a",
  warning: "#e0a276",
  info: "#8fb6de",
  grid: "#3a3833",
  axis: "#96948b",
  tooltipBg: "#22211e",
  tooltipBorder: "#4a4740",
  text: "#f5f4ef",
  series: CATEGORICAL_RAMP,
};

export function getChartPalette(theme: string | undefined): ChartPalette {
  return theme === "dark" ? DARK : LIGHT;
}

export function useChartColors(): ChartPalette {
  const { resolvedTheme } = useTheme();
  return getChartPalette(resolvedTheme);
}
