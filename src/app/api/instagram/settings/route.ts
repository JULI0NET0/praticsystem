import { NextResponse } from 'next/server'
import { getSupabaseAdmin, requireIgSession } from '@/lib/instagram'

function missingTable(code?: string) {
  return code === '42P01' || code === 'PGRST205'
}

const MIGRATION_HINT = 'Rode a migração migration_instagram_settings.sql no Supabase para salvar as boas-vindas.'

export async function GET() {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const { data, error } = await getSupabaseAdmin().from('ig_settings').select('*').eq('id', 1).maybeSingle()
  if (error) {
    return NextResponse.json(
      { error: missingTable(error.code) ? MIGRATION_HINT : error.message, needsMigration: missingTable(error.code) },
      { status: missingTable(error.code) ? 409 : 500 }
    )
  }
  return NextResponse.json({ settings: data })
}

export async function PUT(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })

  const text = typeof body.welcome_text === 'string' ? body.welcome_text.trim() : ''
  const buttonText = typeof body.welcome_button_text === 'string' ? body.welcome_button_text.trim() : ''
  const buttonUrl = typeof body.welcome_button_url === 'string' ? body.welcome_button_url.trim() : ''
  const enabled = body.welcome_enabled === true

  if (enabled && !text) {
    return NextResponse.json({ error: 'Escreva a mensagem de boas-vindas antes de ativar.' }, { status: 400 })
  }
  if (buttonUrl && !/^https?:\/\//i.test(buttonUrl)) {
    return NextResponse.json({ error: 'O link do botão precisa começar com https://' }, { status: 400 })
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'A mensagem passa de 1000 caracteres.' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('ig_settings')
    .upsert({
      id: 1,
      welcome_enabled: enabled,
      welcome_text: text || null,
      welcome_button_text: buttonText || null,
      welcome_button_url: buttonUrl || null,
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(
      { error: missingTable(error.code) ? MIGRATION_HINT : error.message },
      { status: missingTable(error.code) ? 409 : 500 }
    )
  }
  return NextResponse.json({ settings: data })
}
