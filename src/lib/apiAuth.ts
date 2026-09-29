import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/hermesAuth';

/**
 * Exige um usuário logado do time: o front manda o access token da sessão
 * Supabase como Bearer (ver authHeaders em SuportePainel.tsx).
 */
export async function requireTeamUser(
  request: Request
): Promise<{ user: User; error?: never } | { user?: never; error: NextResponse }> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) };
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) };
  return { user: data.user };
}
