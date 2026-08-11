import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { authenticateHermes } from '@/lib/hermesAuth';
import { logHermesAction } from '@/lib/hermesLog';
import { generateContractDocument } from '@/lib/contractTemplate';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/agents/hermes/contracts/draft?status=pending_review
// Lista os rascunhos que o Hermes já propôs, para ele acompanhar o que foi aprovado/rejeitado.
export async function GET(request: Request) {
  const authError = authenticateHermes(request);
  if (authError) return authError;

  const supabase = getAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    let query = supabase
      .from('hermes_contract_drafts')
      .select('id, client_id, service_id, value, duration_months, start_date, end_date, status, notes, created_at, reviewed_at, resulting_contract_id, clients(id, name, nome_fantasia), services(id, name)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    await logHermesAction(supabase, 'listar_rascunhos_contrato', { status }, 'success');
    return NextResponse.json(data);
  } catch (err: any) {
    await logHermesAction(supabase, 'listar_rascunhos_contrato', { status }, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/agents/hermes/contracts/draft
// body: { client_id, service_id, value, duration_months, start_date, posts_per_week?, capture_frequency?, custom_clauses?, notes? }
// Sempre cria um RASCUNHO — nunca um contrato oficial. Um humano precisa aprovar em
// /admin/contracts/drafts para o contrato (e as faturas) serem criados de verdade.
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

  const clientId = body?.client_id;
  const serviceId = body?.service_id;
  const value = Number(body?.value);
  const durationMonths = Number(body?.duration_months);
  const startDate = body?.start_date;

  if (!clientId || typeof clientId !== 'string') {
    return NextResponse.json({ error: "Campo 'client_id' é obrigatório." }, { status: 400 });
  }
  if (!serviceId || typeof serviceId !== 'string') {
    return NextResponse.json({ error: "Campo 'service_id' é obrigatório." }, { status: 400 });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Campo 'value' deve ser um número positivo." }, { status: 400 });
  }
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    return NextResponse.json({ error: "Campo 'duration_months' deve ser um inteiro positivo." }, { status: 400 });
  }
  if (!startDate || typeof startDate !== 'string') {
    return NextResponse.json({ error: "Campo 'start_date' é obrigatório (YYYY-MM-DD)." }, { status: 400 });
  }

  try {
    const [{ data: client, error: clientErr }, { data: service, error: serviceErr }] = await Promise.all([
      supabase.from('clients').select('id, name, cnpj, address, contact_name, email, phone').eq('id', clientId).maybeSingle(),
      supabase.from('services').select('id, name').eq('id', serviceId).maybeSingle(),
    ]);
    if (clientErr) throw clientErr;
    if (serviceErr) throw serviceErr;
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    if (!service) return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });

    const endDate = new Date(startDate + 'T12:00:00');
    endDate.setMonth(endDate.getMonth() + durationMonths);
    const endDateStr = endDate.toISOString().split('T')[0];

    const postsPerWeek = body?.posts_per_week ? Number(body.posts_per_week) : undefined;
    const captureFrequency = typeof body?.capture_frequency === 'string' ? body.capture_frequency : undefined;
    const customClauses = typeof body?.custom_clauses === 'string' ? body.custom_clauses : undefined;

    const documentContent = generateContractDocument({
      clientName: client.name,
      cnpj: client.cnpj,
      address: client.address,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      serviceName: service.name,
      postsPerWeek,
      captureFrequency,
      value,
      startDate,
      endDate: endDateStr,
      customClauses,
    });

    const { data, error } = await supabase
      .from('hermes_contract_drafts')
      .insert([{
        client_id: clientId,
        service_id: serviceId,
        value,
        duration_months: durationMonths,
        start_date: startDate,
        end_date: endDateStr,
        posts_per_week: postsPerWeek ?? null,
        capture_frequency: captureFrequency ?? null,
        custom_clauses: customClauses ?? null,
        document_content: documentContent,
        notes: typeof body?.notes === 'string' ? body.notes : null,
        status: 'pending_review',
      }])
      .select()
      .single();

    if (error) throw error;

    await logHermesAction(supabase, 'criar_rascunho_contrato', body, 'success', { id: data.id });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    await logHermesAction(supabase, 'criar_rascunho_contrato', body, 'error', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
