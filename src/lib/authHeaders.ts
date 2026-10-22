import { supabase } from '@/lib/supabase';

/**
 * Header Authorization com o access token da sessão Supabase, para as rotas
 * /api que exigem usuário logado (ver requireTeamUser/requireStaffUser).
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
