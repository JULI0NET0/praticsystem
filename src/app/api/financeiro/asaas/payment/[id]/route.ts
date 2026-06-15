import { NextRequest, NextResponse } from 'next/server';
import { getAsaasPaymentById } from '@/lib/asaas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payment = await getAsaasPaymentById(id);
    return NextResponse.json(payment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
