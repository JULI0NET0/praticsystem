import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FileText, Download, ExternalLink } from "lucide-react";
import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Materiais — Pratic",
  description: "Materiais gratuitos: roteiros, prompts e arquivos prontos pra usar.",
};

const TYPE_META: Record<IgMaterial["material_type"], { label: string; icon: React.ReactNode }> = {
  text: { label: "Texto pra copiar", icon: <FileText className="w-3.5 h-3.5" /> },
  file: { label: "Arquivo", icon: <Download className="w-3.5 h-3.5" /> },
  link: { label: "Link", icon: <ExternalLink className="w-3.5 h-3.5" /> },
};

export default async function MateriaisIndexPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ig_materials")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const materials = (data || []) as IgMaterial[];

  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)] px-4 py-12 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Materiais
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-xl">
            Roteiros, prompts prontos e arquivos que separei pra você — é só escolher e usar.
          </p>
        </div>

        {materials.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Nenhum material disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((material) => {
              const coverUrl = material.cover_image_path
                ? getMaterialPublicUrl(supabase, material.cover_image_path)
                : null;
              const typeMeta = TYPE_META[material.material_type];

              return (
                <Link
                  key={material.id}
                  href={`/materiais/${material.slug}`}
                  className="group bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-terracotta)] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] bg-[var(--color-surface-sunken)]">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={material.title}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                        {typeMeta.icon}
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-terracotta)]">
                      {typeMeta.icon}
                      {typeMeta.label}
                    </span>
                    <h2 className="font-bold text-sm text-[var(--color-text-primary)] leading-snug group-hover:text-[var(--color-terracotta)] transition-colors">
                      {material.title}
                    </h2>
                    {material.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                        {material.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
