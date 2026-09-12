import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { addDemandComment } from '@/lib/hermesTools';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { body: commentBody } = body || {};

  if (!commentBody) {
    return NextResponse.json({ error: 'body é obrigatório.' }, { status: 400 });
  }

  try {
    const comment = await addDemandComment(id, commentBody);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao comentar na demanda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
