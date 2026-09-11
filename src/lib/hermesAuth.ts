import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Client } from '@/types/database';

/**
 * Autenticação da API externa consumida pelo agente HERMES: uma única
 * API key estática comparada via Bearer token, mesmo padrão de IG_CRON_SECRET
 * (src/app/api/instagram/queue/drain/route.ts).
 */
export function requireHermesAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization') || '';
  const expected = process.env.HERMES_API_KEY ? `Bearer ${process.env.HERMES_API_KEY}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  return null;
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Usuário do time usado como autor de notas/propostas criadas pelo HERMES
 * (notes.user_id e proposals.created_by_user_id referenciam auth.users, e o
 * HERMES não é um usuário logado no sistema).
 */
export function getHermesDefaultUserId(): string {
  const id = process.env.HERMES_DEFAULT_USER_ID;
  if (!id) throw new Error('HERMES_DEFAULT_USER_ID não configurado.');
  return id;
}

/**
 * Remove credenciais de acesso do cliente antes de responder ao agente
 * externo (portal_password e as senhas dentro de social_access).
 */
export function sanitizeClientForHermes(client: Client | null | undefined) {
  if (!client) return client;
  const { portal_password: _portalPassword, social_access, ...rest } = client;

  const cleanSocial = social_access
    ? (Object.fromEntries(
        Object.entries(social_access).map(([platform, value]) => {
          const { senha: _senha, ...safe } = value || {};
          return [platform, safe];
        })
      ) as Client['social_access'])
    : social_access;

  return { ...rest, social_access: cleanSocial };
}
