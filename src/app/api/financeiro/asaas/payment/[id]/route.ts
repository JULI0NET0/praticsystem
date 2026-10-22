import { NextRequest, NextResponse } from 'next/server';
import { getAsaasPaymentById } from '@/lib/asaas';
import { requireStaffUser } from '@/lib/apiAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaffUser(req);
  if (staff.error) return staff.error;
  try {
    const { id } = await params;
    const payment = await getAsaasPaymentById(id);
    return NextResponse.json(payment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
