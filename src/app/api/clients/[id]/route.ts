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
    notesRes,
    demandsRes,
    contractsRes,
    invoicesRes,
    eventsRes,
    docsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
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

  return NextResponse.json({
    client: clientRes.data,
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

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
