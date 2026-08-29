import { NextRequest, NextResponse } from 'next/server'

const IG_SESSION_COOKIE = 'ig_admin_session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/automacao-instagram/login') {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(IG_SESSION_COOKIE)?.value
  const expected = process.env.IG_SESSION_SECRET

  if (!expected || sessionCookie !== expected) {
    return NextResponse.redirect(new URL('/automacao-instagram/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/automacao-instagram/:path*']
}
