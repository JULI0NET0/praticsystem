import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { createDemand, listDemands } from '@/lib/hermesTools';

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const assignee_id = searchParams.get('assignee_id') ?? undefined;
  const scope = (searchParams.get('scope') as 'client' | 'internal' | null) ?? undefined;

  try {
    const demands = await listDemands({ client_id, status, assignee_id, scope });
    return NextResponse.json({ demands });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar demandas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const { title, description, client_id, priority, assignee_ids, status, due_date, due_time, start_date, type } =
    body || {};

  if (!title) {
    return NextResponse.json({ error: 'title é obrigatório.' }, { status: 400 });
  }

  try {
    const demand = await createDemand({
      title,
      description,
      client_id,
      priority,
      assignee_ids,
      status,
      due_date,
      due_time,
      start_date,
      type,
    });
    return NextResponse.json({ demand }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar demanda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
