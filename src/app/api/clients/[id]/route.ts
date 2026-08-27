import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdmin();

  const [
    clientRes,
    allClientsRes,
    notesRes,
    demandsRes,
    contractsRes,
    invoicesRes,
    eventsRes,
    docsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('clients').select('id').order('created_at', { ascending: true }),
    supabase.from('notes').select('id,title,content,date,subjects,user_id,created_at,updated_at').eq('client_id', id).eq('pin_to_client', true).order('updated_at', { ascending: false }),
    supabase.from('demands').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('contracts').select('*').eq('client_id', id),
    supabase.from('invoices').select('*').eq('client_id', id),
    supabase.from('agenda_events').select('*').eq('client_id', id),
    supabase.from('client_documents').select('*').eq('client_id', id).order('created_at', { ascending: false }),
  ]);

  if (clientRes.error) {
    return NextResponse.json({ error: clientRes.error.message }, { status: 404 });
  }

  const client = clientRes.data;
  if (allClientsRes.data) {
    const idx = allClientsRes.data.findIndex((c: any) => c.id === id);
    if (idx !== -1) {
      client.sequential_id = client.sequential_id || (idx + 1);
    }
  }

  return NextResponse.json({
    client,
    notes: notesRes.data ?? [],
    demands: demandsRes.data ?? [],
    contracts: contractsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    events: eventsRes.data ?? [],
    documents: docsRes.data ?? [],
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = getAdmin();

  const { error } = await supabase.from('clients').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdmin();

  try {
    // 1. Buscar faturas do cliente para desvincular transações do Asaas
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', id);

    const invoiceIds = (invoices || []).map((i: any) => i.id);
    if (invoiceIds.length > 0) {
      await supabase
        .from('asaas_transactions')
        .update({ invoice_id: null })
        .in('invoice_id', invoiceIds);
    }

    // 2. Desvincular transações do Asaas associadas diretamente ao cliente
    await supabase
      .from('asaas_transactions')
      .update({ client_id: null })
      .eq('client_id', id);

    // 3. Desvincular demandas de cronogramas/planos de conteúdo do cliente e deletar planos
    const { data: plans } = await supabase
      .from('content_plans')
      .select('id')
      .eq('client_id', id);

    const planIds = (plans || []).map((p: any) => p.id);
    if (planIds.length > 0) {
      await supabase
        .from('demands')
        .update({ plan_id: null })
        .in('plan_id', planIds);

      await supabase
        .from('content_plans')
        .delete()
        .eq('client_id', id);
    }

    // 4. Deletar faturas e contratos do cliente
    await supabase.from('invoices').delete().eq('client_id', id);
    await supabase.from('contracts').delete().eq('client_id', id);

    // 5. Desvincular demandas, eventos da agenda e notas
    await supabase
      .from('demands')
      .update({ client_id: null, scope: 'internal' })
      .eq('client_id', id);

    await supabase
      .from('agenda_events')
      .update({ client_id: null })
      .eq('client_id', id);

    await supabase
      .from('notes')
      .update({ client_id: null, pin_to_client: false })
      .eq('client_id', id);

    // 6. Deletar documentos e acessos
    await supabase.from('client_documents').delete().eq('client_id', id);
    await supabase.from('client_accesses').delete().eq('client_id', id);

    // 7. Deletar o registro do cliente
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir cliente' }, { status: 500 });
  }
}
