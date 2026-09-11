import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { searchClients } from '@/lib/hermesTools';

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const limit = Number(searchParams.get('limit')) || 20;

  try {
    const clients = await searchClients(q, limit);
    return NextResponse.json({ clients });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar clientes.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
