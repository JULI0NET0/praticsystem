import { NextResponse } from 'next/server'
import {
  getSupabaseAdmin,
  requireIgSession,
  getMaterialPublicUrl,
  IG_MATERIALS_BUCKET,
  type IgMaterial,
  type IgMaterialType
} from '@/lib/instagram'

const VALID_TYPES: IgMaterialType[] = ['text', 'file', 'link']

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await supabase
    .from('ig_materials')
    .select('*')
    .eq('id', id)
    .maybeSingle<IgMaterial>()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Material não encontrado.' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (formData.has('title')) updates.title = String(formData.get('title') || '').trim()
  if (formData.has('description')) updates.description = String(formData.get('description') || '').trim() || null
  if (formData.has('is_active')) updates.is_active = formData.get('is_active') === 'true'
  if (formData.has('material_type')) {
    const materialType = String(formData.get('material_type')) as IgMaterialType
    if (!VALID_TYPES.includes(materialType)) {
      return NextResponse.json({ error: 'Tipo de material inválido.' }, { status: 400 })
    }
    updates.material_type = materialType
  }
  if (formData.has('copy_text')) updates.copy_text = String(formData.get('copy_text') || '').trim() || null
  if (formData.has('external_url')) updates.external_url = String(formData.get('external_url') || '').trim() || null

  const coverImage = formData.get('cover_image')
  const file = formData.get('file')
  const orphanPaths: string[] = []

  try {
    if (coverImage instanceof File && coverImage.size > 0) {
      const ext = coverImage.name.split('.').pop() || 'jpg'
      const newPath = `${existing.slug}/cover.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(IG_MATERIALS_BUCKET)
        .upload(newPath, coverImage, { upsert: true })
      if (uploadError) throw uploadError
      if (existing.cover_image_path && existing.cover_image_path !== newPath) {
        orphanPaths.push(existing.cover_image_path)
      }
      updates.cover_image_path = newPath
    }

    if (file instanceof File && file.size > 0) {
      const ext = file.name.split('.').pop() || 'bin'
      const newPath = `${existing.slug}/file.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(IG_MATERIALS_BUCKET)
        .upload(newPath, file, { upsert: true })
      if (uploadError) throw uploadError
      if (existing.file_path && existing.file_path !== newPath) {
        orphanPaths.push(existing.file_path)
      }
      updates.file_path = newPath
      updates.file_name = file.name
      updates.file_size_bytes = file.size
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao enviar arquivo.' },
      { status: 500 }
    )
  }

  const { data, error } = await supabase
    .from('ig_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (orphanPaths.length > 0) {
    await supabase.storage.from(IG_MATERIALS_BUCKET).remove(orphanPaths)
  }

  const material = data as IgMaterial
  return NextResponse.json({
    material: {
      ...material,
      cover_image_url: material.cover_image_path
        ? getMaterialPublicUrl(supabase, material.cover_image_path)
        : null,
      file_url: material.file_path ? getMaterialPublicUrl(supabase, material.file_path) : null
    }
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: existing } = await supabase
    .from('ig_materials')
    .select('cover_image_path, file_path')
    .eq('id', id)
    .maybeSingle<Pick<IgMaterial, 'cover_image_path' | 'file_path'>>()

  const { error } = await supabase.from('ig_materials').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const paths = [existing?.cover_image_path, existing?.file_path].filter(Boolean) as string[]
  if (paths.length > 0) {
    await supabase.storage.from(IG_MATERIALS_BUCKET).remove(paths)
  }

  return NextResponse.json({ success: true })
}
