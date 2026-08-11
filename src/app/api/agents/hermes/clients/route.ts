import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { authenticateHermes } from '@/lib/hermesAuth';
import { logHermesAction } from '@/lib/hermesLog';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Campos de negócio apenas — nunca portal_password, social_access, notes ou drive_settings.
const SAFE_CLIENT_COLUMNS = [
  'id', 'sequential_id', 'name', 'nome_fantasia', 'cnpj', 'tipo_pessoa',
  'contact_name', 'email', 'email_financeiro', 'phone', 'whatsapp_financeiro',
  'telefone_fixo', 'setor', 'website', 'address', 'status',
  'servico_interesse', 'onboarding_date', 'created_at',
].join(', ');

// GET /api/agents/hermes/clients?status=&search=&id=
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const id = searchParams.get('id');

  try {
    let query = supabase.from('clients').select(SAFE_CLIENT_COLUMNS).order('name', { ascending: true });

    if (id) query = query.eq('id', id);
    if (status) query = query.eq('status', status);
    if (search) {
      const safeSearch = search.replace(/[,()%]/g, '').trim();
      if (safeSearch) {
        query = query.or(`name.ilike.%${safeSearch}%,nome_fantasia.ilike.%${safeSearch}%,cnpj.ilike.%${safeSearch}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    await logHermesAction(supabase, 'listar_clientes', { status, search, id }, 'success');
    return NextResponse.json(data);
  } catch (err: any) {
    await logHermesAction(supabase, 'listar_clientes', { status, search, id }, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
