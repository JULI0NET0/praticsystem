import { NextResponse } from 'next/server'
import { IG_SESSION_COOKIE } from '@/lib/instagram'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(IG_SESSION_COOKIE)
  return response
}
