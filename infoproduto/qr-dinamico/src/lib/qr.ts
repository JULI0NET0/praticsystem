import { z } from "zod";

export type QrLink = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  destination_url: string;
  is_active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
};

export type QrLinkView = QrLink & { short_url: string };

const httpUrl = z
  .string()
  .trim()
  .url("Informe uma URL válida.")
  .refine((value) => /^https?:\/\//i.test(value), "Use um endereço http ou https.");

export const createQrSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório.").max(120),
  destination_url: httpUrl,
});

export const updateQrSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    destination_url: httpUrl.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Nenhum campo para atualizar.");

export function slugifyQrTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "qr"}-${suffix}`;
}

export function buildShortUrl(origin: string, slug: string): string {
  return `${origin}/q/${slug}`;
}

export function withShortUrl(origin: string, link: QrLink): QrLinkView {
  return { ...link, short_url: buildShortUrl(origin, link.slug) };
}
