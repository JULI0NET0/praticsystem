import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { createAgendaEvent, listAgendaEvents } from '@/lib/hermesTools';

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id') ?? undefined;
  const type = searchParams.get('type') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  try {
    const events = await listAgendaEvents({ client_id, type, from, to });
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar eventos da agenda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const { title, type, date, description, client_id, assigned_to, visibility } = body || {};

  if (!title || !type || !date) {
    return NextResponse.json({ error: 'title, type e date são obrigatórios.' }, { status: 400 });
  }

  try {
    const event = await createAgendaEvent({ title, type, date, description, client_id, assigned_to, visibility });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar evento na agenda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
