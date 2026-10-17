"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileText, Search, Sparkles } from "lucide-react";
import type { IgMaterialType } from "@/lib/instagram";
import { filterMaterials, MATERIAL_TYPE_LABEL, MATERIAL_TYPE_SHORT } from "@/lib/instagramMaterials";

export interface PublicMaterial {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  material_type: IgMaterialType;
  created_at: string;
  coverUrl: string | null;
}

export function TypeIcon({ type, size = 14 }: { type: IgMaterialType; size?: number }) {
  if (type === "file") return <Download size={size} aria-hidden="true" />;
  if (type === "link") return <ExternalLink size={size} aria-hidden="true" />;
  return <FileText size={size} aria-hidden="true" />;
}

export function Cover({ material, eager = false }: { material: PublicMaterial; eager?: boolean }) {
  return (
    <div className="mat-cover">
      {material.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={material.coverUrl} alt="" loading={eager ? "eager" : "lazy"} />
      ) : (
        <div className="mat-cover-empty" aria-hidden="true">
          <Sparkles size={28} />
        </div>
      )}
    </div>
  );
}

const CTA: Record<IgMaterialType, string> = { text: "Ver e copiar →", file: "Baixar →", link: "Acessar →" };

export default function MaterialsGallery({ materials }: { materials: PublicMaterial[] }) {
  const [type, setType] = useState<IgMaterialType | "all">("all");
  const [query, setQuery] = useState("");

  const present = useMemo(() => (["text", "file", "link"] as IgMaterialType[]).filter((t) => materials.some((m) => m.material_type === t)), [materials]);
  const visible = useMemo(() => filterMaterials(materials, { type, query }), [materials, type, query]);

  if (materials.length === 0) return null;

  return (
    <section aria-labelledby="mat-all-title">
      <h2 id="mat-all-title" className="mat-section-title">
        Todos os materiais
      </h2>

      <div className="mat-toolbar">
        <div className="mat-chips" role="group" aria-label="Filtrar por tipo">
          <button type="button" className="mat-chip" aria-pressed={type === "all"} onClick={() => setType("all")}>
            Todos
          </button>
          {present.length > 1 &&
            present.map((t) => (
              <button key={t} type="button" className="mat-chip" aria-pressed={type === t} onClick={() => setType(t)}>
                {MATERIAL_TYPE_SHORT[t]}
              </button>
            ))}
        </div>
        <label className="mat-search">
          <span className="sr-only">Buscar material</span>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar material"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="mat-empty" role="status">
          Nenhum material encontrado. Tente outra palavra ou limpe o filtro.
        </p>
      ) : (
        <div className="mat-grid">
          {visible.map((m) => (
            <Link key={m.id} href={`/materiais/${m.slug}`} className="mat-card">
              <Cover material={m} />
              <div className="mat-card-body">
                <span className="mat-type">
                  <TypeIcon type={m.material_type} size={13} />
                  {MATERIAL_TYPE_LABEL[m.material_type]}
                </span>
                <h3>{m.title}</h3>
                {m.description && <p>{m.description}</p>}
                <span className="mat-card-cta">{CTA[m.material_type]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
