import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { createNote, listNotes } from '@/lib/hermesTools';

export async function POST(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const { client_id, title, content, subjects } = body || {};

  if (!title || !content) {
    return NextResponse.json({ error: 'title e content são obrigatórios.' }, { status: 400 });
  }

  try {
    const note = await createNote({ client_id, title, content, subjects });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar nota.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'client_id é obrigatório.' }, { status: 400 });
  }

  try {
    const notes = await listNotes(clientId);
    return NextResponse.json({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar notas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
