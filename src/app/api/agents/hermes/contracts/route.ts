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

// GET /api/agents/hermes/contracts?status=&client_id=&expiring_within_days=
// Somente leitura — criação de contrato passa sempre pelo fluxo de rascunho
// em /api/agents/hermes/contracts/draft.
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const clientId = searchParams.get('client_id');
  const expiringWithinDays = searchParams.get('expiring_within_days');

  try {
    let query = supabase
      .from('contracts')
      .select('id, client_id, service_id, status, start_date, end_date, value, auto_renew, billing_cycle, document_status, contract_number, clients(id, name, nome_fantasia, cnpj), services(id, name)')
      .order('end_date', { ascending: true });

    if (status) query = query.eq('status', status);
    if (clientId) query = query.eq('client_id', clientId);
    if (expiringWithinDays) {
      const days = Number(expiringWithinDays);
      if (Number.isFinite(days) && days > 0) {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + days);
        query = query.lte('end_date', limitDate.toISOString().split('T')[0]);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    await logHermesAction(supabase, 'listar_contratos', { status, clientId, expiringWithinDays }, 'success');
    return NextResponse.json(data);
  } catch (err: any) {
    await logHermesAction(supabase, 'listar_contratos', { status, clientId, expiringWithinDays }, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
