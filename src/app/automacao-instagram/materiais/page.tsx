import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from "@/lib/instagram";
import MaterialsClient from "./MaterialsClient";

export const dynamic = "force-dynamic";

export interface IgMaterialWithUrls extends IgMaterial {
  cover_image_url: string | null;
  file_url: string | null;
}

export default async function MaterialsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ig_materials")
    .select("*")
    .order("created_at", { ascending: false });

  const materials: IgMaterialWithUrls[] = ((data || []) as IgMaterial[]).map((m) => ({
    ...m,
    cover_image_url: m.cover_image_path ? getMaterialPublicUrl(supabase, m.cover_image_path) : null,
    file_url: m.file_path ? getMaterialPublicUrl(supabase, m.file_path) : null,
  }));

  return <MaterialsClient initialMaterials={materials} />;
}
