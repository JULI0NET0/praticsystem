import { NextResponse } from 'next/server'
import {
  getSupabaseAdmin,
  requireIgSession,
  getMaterialPublicUrl,
  slugifyMaterialTitle,
  IG_MATERIALS_BUCKET,
  type IgMaterial,
  type IgMaterialType
} from '@/lib/instagram'

function withPublicUrls(supabase: ReturnType<typeof getSupabaseAdmin>, material: IgMaterial) {
  return {
    ...material,
    cover_image_url: material.cover_image_path
      ? getMaterialPublicUrl(supabase, material.cover_image_path)
      : null,
    file_url: material.file_path ? getMaterialPublicUrl(supabase, material.file_path) : null
  }
}

export async function GET() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ig_materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const materials = ((data || []) as IgMaterial[]).map((m) => withPublicUrls(supabase, m))
  return NextResponse.json({ materials })
}

const VALID_TYPES: IgMaterialType[] = ['text', 'file', 'link']

export async function POST(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const materialType = String(formData.get('material_type') || '') as IgMaterialType
  const copyText = String(formData.get('copy_text') || '').trim()
  const externalUrl = String(formData.get('external_url') || '').trim()
  const coverImage = formData.get('cover_image')
  const file = formData.get('file')

  if (!title || !VALID_TYPES.includes(materialType)) {
    return NextResponse.json({ error: 'Preencha o título e o tipo do material.' }, { status: 400 })
  }
  if (materialType === 'text' && !copyText) {
    return NextResponse.json({ error: 'Preencha o texto/prompt a ser copiado.' }, { status: 400 })
  }
  if (materialType === 'link' && !externalUrl) {
    return NextResponse.json({ error: 'Preencha a URL externa.' }, { status: 400 })
  }
  if (materialType === 'file' && !(file instanceof File)) {
    return NextResponse.json({ error: 'Selecione um arquivo para upload.' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const slug = slugifyMaterialTitle(title)

  let coverImagePath: string | null = null
  let filePath: string | null = null
  let fileName: string | null = null
  let fileSizeBytes: number | null = null

  try {
    if (coverImage instanceof File && coverImage.size > 0) {
      const ext = coverImage.name.split('.').pop() || 'jpg'
      coverImagePath = `${slug}/cover.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(IG_MATERIALS_BUCKET)
        .upload(coverImagePath, coverImage, { upsert: true })
      if (uploadError) throw uploadError
    }

    if (materialType === 'file' && file instanceof File) {
      const ext = file.name.split('.').pop() || 'bin'
      filePath = `${slug}/file.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(IG_MATERIALS_BUCKET)
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      fileName = file.name
      fileSizeBytes = file.size
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Falha ao enviar arquivo.' },
      { status: 500 }
    )
  }

  const { data, error } = await supabase
    .from('ig_materials')
    .insert({
      slug,
      title,
      description: description || null,
      cover_image_path: coverImagePath,
      material_type: materialType,
      copy_text: materialType === 'text' ? copyText : null,
      file_path: filePath,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      external_url: materialType === 'link' ? externalUrl : null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    // Não deixa arquivos órfãos no bucket se a linha falhar.
    const orphanPaths = [coverImagePath, filePath].filter(Boolean) as string[]
    if (orphanPaths.length > 0) {
      await supabase.storage.from(IG_MATERIALS_BUCKET).remove(orphanPaths)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ material: withPublicUrls(supabase, data as IgMaterial) })
}
