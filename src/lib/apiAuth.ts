import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin, requireHermesAuth } from '@/lib/hermesAuth';

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

/**
 * Como requireTeamUser, mas só deixa passar quem é da equipe: além do token
 * válido, exige uma linha em public.users com o mesmo id. Clientes do portal
 * também têm conta no Supabase Auth, mas não estão em public.users → 403.
 */
export async function requireStaffUser(
  request: Request
): Promise<{ user: User; error?: never } | { user?: never; error: NextResponse }> {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth;

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) return { error: NextResponse.json({ error: 'Erro ao validar usuário.' }, { status: 500 }) };
  if (!data) return { error: NextResponse.json({ error: 'Acesso restrito à equipe.' }, { status: 403 }) };
  return { user: auth.user };
}

/**
 * Para rotas que a equipe chama do navegador/app do Mac e que o HERMES também
 * chama do servidor: aceita a HERMES_API_KEY (mesma checagem de
 * requireHermesAuth) ou, se não for ela, exige um usuário da equipe.
 */
export async function requireStaffOrHermes(request: Request): Promise<NextResponse | null> {
  if (!requireHermesAuth(request)) return null;
  const staff = await requireStaffUser(request);
  return staff.error ?? null;
}
