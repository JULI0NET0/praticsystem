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

// GET /api/agents/hermes/services — catálogo de serviços (só leitura).
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, price, is_recurring, category, billing_cycle, minimum_term, observations, descriptive')
      .order('name', { ascending: true });

    if (error) throw error;

    await logHermesAction(supabase, 'listar_servicos', {}, 'success');
    return NextResponse.json(data);
  } catch (err: any) {
    await logHermesAction(supabase, 'listar_servicos', {}, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
