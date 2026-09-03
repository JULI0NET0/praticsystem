import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from "@/lib/instagram";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

async function getMaterial(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ig_materials")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<IgMaterial>();
  return { supabase, material: data };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { supabase, material } = await getMaterial(slug);
  if (!material) return { title: "Material não encontrado — Pratic" };

  const coverUrl = material.cover_image_path
    ? getMaterialPublicUrl(supabase, material.cover_image_path)
    : undefined;

  return {
    title: `${material.title} — Pratic`,
    description: material.description || undefined,
    openGraph: {
      title: material.title,
      description: material.description || undefined,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, material } = await getMaterial(slug);

  if (!material) notFound();

  // Conta como "visualização" só pro tipo texto (o conteúdo é consumido direto
  // aqui na página). Arquivo/link contam no clique real, via /api/materiais/[slug]/download,
  // pra não duplicar a métrica (abrir a página + clicar no botão).
  if (material.material_type === "text") {
    void supabase
      .from("ig_materials")
      .update({ view_count: material.view_count + 1 })
      .eq("id", material.id)
      .then(() => {});
  }

  const coverUrl = material.cover_image_path
    ? getMaterialPublicUrl(supabase, material.cover_image_path)
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)] px-4 py-12 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/materiais"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-terracotta)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Ver todos os materiais
        </Link>

        {coverUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6 bg-[var(--color-surface-raised)]">
            <Image src={coverUrl} alt={material.title} fill unoptimized className="object-cover" />
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-2">
          {material.title}
        </h1>

        {material.description && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
            {material.description}
          </p>
        )}

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-6">
          {material.material_type === "text" && material.copy_text && (
            <div className="space-y-4">
              <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)] font-mono leading-relaxed bg-[var(--color-surface-sunken)] rounded-xl p-4 max-h-96 overflow-y-auto">
                {material.copy_text}
              </pre>
              <CopyButton text={material.copy_text} />
            </div>
          )}

          {material.material_type === "file" && (
            <a
              href={`/api/materiais/${material.slug}/download`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-terracotta)] text-white hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Baixar {material.file_name || "arquivo"}
            </a>
          )}

          {material.material_type === "link" && (
            <a
              href={`/api/materiais/${material.slug}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[var(--color-terracotta)] text-white hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
