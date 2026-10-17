import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from "@/lib/instagram";
import {
  formatFileSize,
  incrementMaterialViews,
  MATERIAL_TYPE_LABEL,
  materialAction,
} from "@/lib/instagramMaterials";
import { Cover, TypeIcon, type PublicMaterial } from "../MaterialsGallery";
import CopyButton from "./CopyButton";
import "@/styles/materiais.css";

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
  if (!material) return { title: "Material não encontrado — Julio Neto" };

  const coverUrl = material.cover_image_path
    ? getMaterialPublicUrl(supabase, material.cover_image_path)
    : "/og-image.png";

  return {
    title: `${material.title} — Julio Neto`,
    description: material.description || "Material gratuito do @juli0net0.",
    openGraph: {
      title: material.title,
      description: material.description || undefined,
      images: [coverUrl],
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
    void incrementMaterialViews(supabase, material).then(() => {});
  }

  const { data: moreData } = await supabase
    .from("ig_materials")
    .select("*")
    .eq("is_active", true)
    .neq("id", material.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const more: PublicMaterial[] = ((moreData || []) as IgMaterial[]).map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    material_type: m.material_type,
    created_at: m.created_at,
    coverUrl: m.cover_image_path ? getMaterialPublicUrl(supabase, m.cover_image_path) : null,
  }));

  const current: PublicMaterial = {
    id: material.id,
    slug: material.slug,
    title: material.title,
    description: material.description,
    material_type: material.material_type,
    created_at: material.created_at,
    coverUrl: material.cover_image_path ? getMaterialPublicUrl(supabase, material.cover_image_path) : null,
  };
  const action = materialAction(material);
  const size = formatFileSize(material.file_size_bytes);

  return (
    <main className="mat-root">
      <div className="mat-wrap">
        <div className="mat-narrow mat-detail">
          <Link href="/materiais" className="mat-back">
            <ArrowLeft size={14} aria-hidden="true" />
            Ver todos os materiais
          </Link>

          {current.coverUrl && (
            <div className="mat-detail-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.coverUrl} alt="" />
            </div>
          )}

          <span className="mat-type">
            <TypeIcon type={material.material_type} size={13} />
            {MATERIAL_TYPE_LABEL[material.material_type]}
          </span>
          <h1>{material.title}</h1>
          {material.description && <p>{material.description}</p>}

          <div className="mat-panel">
            {material.material_type === "text" && material.copy_text && (
              <>
                <pre className="mat-pre" tabIndex={0} aria-label="Texto do material">
                  {material.copy_text}
                </pre>
                <CopyButton text={material.copy_text} />
              </>
            )}

            {material.material_type === "file" && (
              <div className="mat-actions" style={{ marginTop: 0 }}>
                <a className="mat-btn mat-btn-primary" href={action.href}>
                  Baixar {material.file_name || "arquivo"}
                </a>
                {size && <span className="mat-meta">{size}</span>}
              </div>
            )}

            {material.material_type === "link" && (
              <div className="mat-actions" style={{ marginTop: 0 }}>
                <a className="mat-btn mat-btn-primary" href={action.href} target="_blank" rel="noopener noreferrer">
                  Acessar agora
                </a>
              </div>
            )}
          </div>

          {more.length > 0 && (
            <section className="mat-more" aria-labelledby="mat-more-title">
              <h2 id="mat-more-title" className="mat-section-title">
                Outros materiais
              </h2>
              <div className="mat-grid">
                {more.map((m) => (
                  <Link key={m.id} href={`/materiais/${m.slug}`} className="mat-card">
                    <Cover material={m} />
                    <div className="mat-card-body">
                      <span className="mat-type">
                        <TypeIcon type={m.material_type} size={13} />
                        {MATERIAL_TYPE_LABEL[m.material_type]}
                      </span>
                      <h3>{m.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
