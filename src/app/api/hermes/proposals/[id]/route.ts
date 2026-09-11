import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { getProposal } from '@/lib/hermesTools';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const proposal = await getProposal(id);
    return NextResponse.json({ proposal });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proposta não encontrada.';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
