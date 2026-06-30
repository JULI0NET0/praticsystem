import { NextRequest, NextResponse } from 'next/server';
import { getAsaasTransferById } from '@/lib/asaas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transfer = await getAsaasTransferById(id);
    return NextResponse.json(transfer);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
