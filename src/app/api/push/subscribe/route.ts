import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, subscription, userAgent } = await request.json()

    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos: userId e subscription são obrigatórios' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { endpoint, keys } = subscription
    const p256dh = keys.p256dh
    const auth = keys.auth

    // Upsert da inscrição baseado no endpoint único
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )
      .select()

    if (error) {
      console.error('[WebPush Subscribe Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[WebPush Subscribe Exception]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint é obrigatório' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
