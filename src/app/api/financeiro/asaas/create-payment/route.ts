import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAsaasCustomerByCpfCnpj, createAsaasPayment } from '@/lib/asaas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, billingType = 'UNDEFINED' } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId obrigatório' }, { status: 400 });
    }

    // 1. Busca invoice + cliente
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, clients(id, name, cnpj)')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice não encontrada' }, { status: 404 });
    }

    if (invoice.asaas_payment_id) {
      return NextResponse.json({ error: 'Invoice já possui cobrança no Asaas' }, { status: 409 });
    }

    const client = invoice.clients;
    if (!client?.cnpj) {
      return NextResponse.json({ error: 'Cliente sem CPF/CNPJ cadastrado' }, { status: 400 });
    }

    // 2. Busca cliente no Asaas
    const asaasCustomer = await getAsaasCustomerByCpfCnpj(client.cnpj);
    if (!asaasCustomer) {
      return NextResponse.json({ error: 'Cliente não encontrado no Asaas pelo CPF/CNPJ' }, { status: 404 });
    }

    // 3. Cria cobrança no Asaas
    const payment = await createAsaasPayment({
      customer: asaasCustomer.id,
      billingType,
      value: invoice.amount,
      dueDate: invoice.due_date,
      description: invoice.description || `Mensalidade - ${client.name}`,
    });

    // 4. Salva asaas_payment_id no invoice
    await supabase
      .from('invoices')
      .update({ asaas_payment_id: payment.id })
      .eq('id', invoiceId);

    // 5. Upsert asaas_transaction
    await supabase.from('asaas_transactions').upsert({
      id: payment.id,
      description: payment.description,
      value: payment.value,
      type: 'CREDIT',
      date: payment.dueDate,
      status: payment.status,
      invoice_id: invoiceId,
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      asaasPaymentId: payment.id,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      status: payment.status,
    });
  } catch (err: any) {
    console.error('create-payment error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
