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

type Tipo = 'receber' | 'pagar';

// GET /api/agents/hermes/lancamentos?tipo=receber|pagar|all&status=&client_id=&from=&to=
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  const { searchParams } = new URL(request.url);
  const tipo = (searchParams.get('tipo') || 'all') as Tipo | 'all';
  const status = searchParams.get('status'); // pending | paid | overdue | cancelled
  const clientId = searchParams.get('client_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const result: Record<string, unknown> = {};

    if (tipo === 'receber' || tipo === 'all') {
      let query = supabase
        .from('invoices')
        .select('id, client_id, contract_id, amount, due_date, status, description, paid_at, source, created_at, clients(id, name, nome_fantasia)')
        .order('due_date', { ascending: false });

      if (status) query = query.eq('status', status);
      if (clientId) query = query.eq('client_id', clientId);
      if (from) query = query.gte('due_date', from);
      if (to) query = query.lte('due_date', to);

      const { data, error } = await query;
      if (error) throw error;
      result.receber = data;
    }

    if (tipo === 'pagar' || tipo === 'all') {
      let query = supabase
        .from('expense_entries')
        .select('id, expense_id, description, amount, date, status, category, notes, source, created_at, expenses(id, description, category)')
        .order('date', { ascending: false });

      if (status) query = query.eq('status', status);
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);

      const { data, error } = await query;
      if (error) throw error;
      result.pagar = data;
    }

    await logHermesAction(supabase, 'listar_lancamentos', { tipo, status, clientId, from, to }, 'success');
    return NextResponse.json(result);
  } catch (err: any) {
    await logHermesAction(supabase, 'listar_lancamentos', { tipo, status, clientId, from, to }, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/agents/hermes/lancamentos
// body: { tipo: 'receber', client_id, description, amount, due_date, contract_id? }
//     | { tipo: 'pagar', description, amount, date, category?, expense_id?, notes? }
export async function POST(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const tipo: Tipo = body?.tipo;
  if (tipo !== 'receber' && tipo !== 'pagar') {
    return NextResponse.json({ error: "Campo 'tipo' deve ser 'receber' ou 'pagar'." }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Campo 'amount' deve ser um número positivo." }, { status: 400 });
  }

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return NextResponse.json({ error: "Campo 'description' é obrigatório." }, { status: 400 });
  }

  try {
    if (tipo === 'receber') {
      const clientId = body?.client_id;
      if (!clientId || typeof clientId !== 'string') {
        return NextResponse.json({ error: "Campo 'client_id' é obrigatório para lançamentos a receber." }, { status: 400 });
      }
      const dueDate = body?.due_date;
      if (!dueDate || typeof dueDate !== 'string') {
        return NextResponse.json({ error: "Campo 'due_date' é obrigatório para lançamentos a receber." }, { status: 400 });
      }

      const { data: clientExists, error: clientErr } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .maybeSingle();
      if (clientErr) throw clientErr;
      if (!clientExists) {
        return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          client_id: clientId,
          contract_id: body?.contract_id || null,
          amount,
          due_date: dueDate,
          description,
          status: 'pending',
          source: 'hermes',
        }])
        .select()
        .single();

      if (error) throw error;
      await logHermesAction(supabase, 'criar_lancamento_receber', body, 'success', { id: data.id });
      return NextResponse.json(data, { status: 201 });
    } else {
      const date = body?.date;
      if (!date || typeof date !== 'string') {
        return NextResponse.json({ error: "Campo 'date' é obrigatório para lançamentos a pagar." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('expense_entries')
        .insert([{
          expense_id: body?.expense_id || null,
          description,
          amount,
          date,
          category: body?.category || null,
          notes: body?.notes || null,
          status: 'pending',
          source: 'hermes',
        }])
        .select()
        .single();

      if (error) throw error;
      await logHermesAction(supabase, 'criar_lancamento_pagar', body, 'success', { id: data.id });
      return NextResponse.json(data, { status: 201 });
    }
  } catch (err: any) {
    await logHermesAction(supabase, `criar_lancamento_${tipo}`, body, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
