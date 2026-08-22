/**
 * Cores de marcas de terceiros.
 *
 * ⚠️ NUNCA inclua estas na varredura de hex do re-skin. São a
 * identidade de outra empresa: trocá-las por tokens do Pratic
 * descaracteriza o ícone e, em alguns casos, viola a diretriz de
 * marca do fornecedor.
 */
export const BRAND = {
  google: "#4285F4",
  instagram: "#E1306C",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  whatsapp: "#25D366",
  youtube: "#FF0000",
  tiktok: "#000000",
} as const;

export type BrandKey = keyof typeof BRAND;
