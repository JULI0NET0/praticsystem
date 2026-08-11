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

// POST /api/agents/hermes/lancamentos/:id/confirmar
// body: { tipo: 'receber' | 'pagar', paid_at? }
// Ação restrita: só muda o status do lançamento já existente para 'paid'. Não altera outros campos.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = getAdminClient();
  let body: any = {};

  try {
    body = await request.json();
  } catch {
    // corpo vazio é aceitável, tipo continua obrigatório abaixo
  }

  const tipo = body?.tipo;
  if (tipo !== 'receber' && tipo !== 'pagar') {
    return NextResponse.json({ error: "Campo 'tipo' deve ser 'receber' ou 'pagar'." }, { status: 400 });
  }

  const table = tipo === 'receber' ? 'invoices' : 'expense_entries';
  const paidAtField = tipo === 'receber' ? 'paid_at' : null;
  const paidAt = typeof body?.paid_at === 'string' ? body.paid_at : new Date().toISOString();

  try {
    const { data: existing, error: findErr } = await supabase
      .from(table)
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    }

    const update: Record<string, unknown> = { status: 'paid' };
    if (paidAtField) update[paidAtField] = paidAt;

    const { data, error } = await supabase
      .from(table)
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await logHermesAction(supabase, `confirmar_lancamento_${tipo}`, { id, ...body }, 'success', { previousStatus: existing.status });
    return NextResponse.json(data);
  } catch (err: any) {
    await logHermesAction(supabase, `confirmar_lancamento_${tipo}`, { id, ...body }, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
