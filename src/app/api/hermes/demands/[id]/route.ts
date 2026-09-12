import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { getDemand, updateDemandStatus } from '@/lib/hermesTools';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const demand = await getDemand(id);
    return NextResponse.json({ demand });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demanda não encontrada.';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { status } = body || {};

  if (!status) {
    return NextResponse.json({ error: 'status é obrigatório.' }, { status: 400 });
  }

  try {
    const demand = await updateDemandStatus(id, status);
    return NextResponse.json({ demand });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar status da demanda.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
