import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from "@/lib/instagram";
import { MATERIAL_TYPE_LABEL, materialAction, splitFeatured } from "@/lib/instagramMaterials";
import MaterialsGallery, { Cover, TypeIcon, type PublicMaterial } from "./MaterialsGallery";
import "@/styles/materiais.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Materiais gratuitos — Julio Neto",
  description: "Prompts, roteiros e arquivos prontos pra usar. O mais recente em destaque e todos os outros logo abaixo.",
  openGraph: {
    title: "Materiais gratuitos — Julio Neto",
    description: "Prompts, roteiros e arquivos prontos pra usar.",
    images: ["/og-image.png"],
  },
};

export default async function MateriaisIndexPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ig_materials")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const materials: PublicMaterial[] = ((data || []) as IgMaterial[]).map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    description: m.description,
    material_type: m.material_type,
    created_at: m.created_at,
    coverUrl: m.cover_image_path ? getMaterialPublicUrl(supabase, m.cover_image_path) : null,
  }));

  const { featured, others } = splitFeatured(materials);
  const action = featured ? materialAction(featured) : null;

  return (
    <main className="mat-root">
      <div className="mat-wrap">
        <header className="mat-head">
          <Image src="/bio/avatar.jpg" alt="" width={44} height={44} className="mat-avatar" priority />
          <div>
            <p className="mat-handle">Julio Neto</p>
            <p className="mat-handle-sub">@juli0net0 · IA para negócios</p>
          </div>
        </header>

        <h1 className="mat-title">
          Materiais <em>gratuitos</em>
        </h1>
        <p className="mat-lead">
          Prompts, roteiros e arquivos que eu uso no dia a dia. É só escolher e usar — sem cadastro.
        </p>

        {materials.length === 0 ? (
          <p className="mat-empty" role="status">
            Ainda não tem nenhum material por aqui. Volte em breve.
          </p>
        ) : (
          <>
            {featured && action && (
              <section className="mat-featured" aria-labelledby="mat-featured-title">
                <Cover material={featured} eager />
                <div className="mat-featured-body">
                  <span className="mat-badge">Mais recente</span>
                  <h2 id="mat-featured-title">{featured.title}</h2>
                  {featured.description && <p>{featured.description}</p>}
                  <div className="mat-meta">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <TypeIcon type={featured.material_type} size={13} />
                      {MATERIAL_TYPE_LABEL[featured.material_type]}
                    </span>
                  </div>
                  <div className="mat-actions">
                    <a
                      className="mat-btn mat-btn-primary"
                      href={action.href}
                      {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {action.label}
                    </a>
                    {featured.material_type !== "text" && (
                      <Link className="mat-btn mat-btn-ghost" href={`/materiais/${featured.slug}`}>
                        Ver detalhes
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            <MaterialsGallery materials={others} />
          </>
        )}

        <p className="mat-foot">
          Feito por <a href="https://instagram.com/juli0net0">@juli0net0</a>
        </p>
      </div>
    </main>
  );
}
