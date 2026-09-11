import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { createProposal, listProposals } from '@/lib/hermesTools';

export async function POST(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const { client_id, title, value, file_base64, file_name } = body || {};

  if (!client_id || !title || !file_base64 || !file_name) {
    return NextResponse.json(
      { error: 'client_id, title, file_base64 e file_name são obrigatórios.' },
      { status: 400 }
    );
  }

  try {
    const proposal = await createProposal({ client_id, title, value, file_base64, file_name });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar proposta.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id') ?? undefined;

  try {
    const proposals = await listProposals(clientId);
    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar propostas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
