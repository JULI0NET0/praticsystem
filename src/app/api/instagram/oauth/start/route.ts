import { NextResponse } from 'next/server'
import { requireIgSession } from '@/lib/instagram'

export async function GET(request: Request) {
  if (!(await requireIgSession())) {
    return NextResponse.redirect(new URL('/automacao-instagram/login', request.url))
  }

  const authUrl = new URL('https://www.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', process.env.IG_APP_ID || '')
  authUrl.searchParams.set('redirect_uri', process.env.IG_OAUTH_REDIRECT_URI || '')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set(
    'scope',
    'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments'
  )

  return NextResponse.redirect(authUrl.toString())
}
