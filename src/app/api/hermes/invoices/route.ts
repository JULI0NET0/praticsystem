import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { listInvoices } from '@/lib/hermesTools';

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'client_id é obrigatório.' }, { status: 400 });
  }

  try {
    const invoices = await listInvoices(clientId);
    return NextResponse.json({ invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar faturas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
