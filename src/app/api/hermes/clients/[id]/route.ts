import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { getClient } from '@/lib/hermesTools';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const client = await getClient(id);
    return NextResponse.json({ client });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cliente não encontrado.';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
