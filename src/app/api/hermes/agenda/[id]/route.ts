import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { cancelAgendaEvent, updateAgendaEvent } from '@/lib/hermesTools';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { title, date, description, type } = body || {};

  try {
    const event = await updateAgendaEvent(id, { title, date, description, type });
    return NextResponse.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar evento da agenda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const result = await cancelAgendaEvent(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cancelar evento da agenda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
