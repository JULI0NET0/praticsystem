import type { SupabaseClient } from '@supabase/supabase-js'
import type { IgMaterialType } from '@/lib/instagram'

export const MATERIAL_TYPE_LABEL: Record<IgMaterialType, string> = {
  text: 'Texto pra copiar',
  file: 'Arquivo',
  link: 'Link'
}

export const MATERIAL_TYPE_SHORT: Record<IgMaterialType, string> = {
  text: 'Prompts e textos',
  file: 'Arquivos',
  link: 'Links'
}

interface Sortable {
  created_at: string
}

// O mais recente (por criação) fica em destaque; os demais seguem do mais novo ao mais antigo.
export function splitFeatured<T extends Sortable>(materials: T[]): { featured: T | null; others: T[] } {
  const sorted = [...materials].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { featured: sorted[0] ?? null, others: sorted.slice(1) }
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function filterMaterials<T extends { title: string; description: string | null; material_type: IgMaterialType }>(
  materials: T[],
  filter: { type: IgMaterialType | 'all'; query: string }
): T[] {
  const q = normalize(filter.query)
  return materials.filter((m) => {
    if (filter.type !== 'all' && m.material_type !== filter.type) return false
    if (!q) return true
    return normalize(`${m.title} ${m.description ?? ''}`).includes(q)
  })
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// Ação principal do material para quem chega pela página pública.
export function materialAction(m: { slug: string; material_type: IgMaterialType; file_name?: string | null }) {
  if (m.material_type === 'file') {
    return { label: 'Baixar', href: `/api/materiais/${m.slug}/download`, external: false }
  }
  if (m.material_type === 'link') {
    return { label: 'Acessar', href: `/api/materiais/${m.slug}/download`, external: true }
  }
  return { label: 'Ver e copiar', href: `/materiais/${m.slug}`, external: false }
}

// Conta a visualização de forma atômica pela função SQL (migration_instagram_materials_v2.sql).
// Sem a migração rodada, cai no incremento antigo (pode perder contagem sob acessos simultâneos).
export async function incrementMaterialViews(
  supabase: SupabaseClient,
  material: { id: string; slug: string; view_count: number }
): Promise<void> {
  const { error } = await supabase.rpc('increment_ig_material_views', { p_slug: material.slug })
  if (!error) return
  await supabase
    .from('ig_materials')
    .update({ view_count: material.view_count + 1 })
    .eq('id', material.id)
}
