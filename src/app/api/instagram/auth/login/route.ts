import { NextResponse } from 'next/server'
import { IG_SESSION_COOKIE } from '@/lib/instagram'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))
  const expectedPassword = process.env.IG_ADMIN_PASSWORD
  const sessionSecret = process.env.IG_SESSION_SECRET

  if (!expectedPassword || !sessionSecret) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }

  if (password !== expectedPassword) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(IG_SESSION_COOKIE, sessionSecret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  })
  return response
}
