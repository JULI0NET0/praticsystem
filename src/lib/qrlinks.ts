import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuração do Supabase incompleta.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export interface QrLink {
  id: string
  slug: string
  title: string
  destination_url: string
  client_id: string | null
  is_active: boolean
  click_count: number
  created_at: string
  updated_at: string
}

// Gera um slug amigável a partir do título + sufixo aleatório curto, pra
// garantir unicidade sem precisar consultar o banco antes de inserir
// (mesma lógica de slugifyMaterialTitle em src/lib/instagram.ts).
export function slugifyQrTitle(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || 'qr'}-${suffix}`
}

export function buildShortUrl(origin: string, slug: string): string {
  return `${origin}/q/${slug}`
}
