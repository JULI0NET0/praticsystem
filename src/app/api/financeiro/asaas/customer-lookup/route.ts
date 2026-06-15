import { NextRequest, NextResponse } from 'next/server';
import { getAsaasCustomerByCpfCnpj, getAllAsaasPaymentsByCustomer } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const { cpfCnpj } = await req.json();

    if (!cpfCnpj) {
      return NextResponse.json({ error: 'CPF/CNPJ obrigatório' }, { status: 400 });
    }

    const customer = await getAsaasCustomerByCpfCnpj(cpfCnpj);

    if (!customer) {
      return NextResponse.json({ customer: null, payments: [] });
    }

    const payments = await getAllAsaasPaymentsByCustomer(customer.id);

    return NextResponse.json({ customer, payments });
  } catch (err: any) {
    console.error('Asaas customer-lookup error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
