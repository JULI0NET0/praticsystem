import { NextResponse } from 'next/server'
import { getSupabaseAdmin, getMaterialPublicUrl, type IgMaterial } from '@/lib/instagram'
import { incrementMaterialViews } from '@/lib/instagramMaterials'

const FALLBACK_URL = '/materiais'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()

  const { data: material } = await supabase
    .from('ig_materials')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle<IgMaterial>()

  if (!material) {
    return NextResponse.redirect(new URL(FALLBACK_URL, _request.url))
  }

  let destination: string | null = null
  if (material.material_type === 'file' && material.file_path) {
    destination = getMaterialPublicUrl(supabase, material.file_path)
  } else if (material.material_type === 'link' && material.external_url) {
    destination = material.external_url
  }

  if (!destination) {
    return NextResponse.redirect(new URL(`/materiais/${slug}`, _request.url))
  }

  await incrementMaterialViews(supabase, material)

  return NextResponse.redirect(destination)
}
