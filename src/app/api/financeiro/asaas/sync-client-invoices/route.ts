import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAsaasPaymentById } from '@/lib/asaas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapStatus(asaasStatus: string): 'paid' | 'pending' | 'overdue' {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus)) return 'paid';
  if (asaasStatus === 'OVERDUE') return 'overdue';
  return 'pending';
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 });
    }

    // Busca invoices vinculadas ao Asaas
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, asaas_payment_id, status, due_date')
      .eq('client_id', clientId)
      .not('asaas_payment_id', 'is', null);

    if (!invoices?.length) {
      return NextResponse.json({ updated: 0, message: 'Nenhuma invoice vinculada ao Asaas' });
    }

    let updated = 0;
    const details: Array<{ invoiceId: string; asaasId: string; oldStatus: string; newStatus: string }> = [];

    for (const inv of invoices) {
      try {
        const payment = await getAsaasPaymentById(inv.asaas_payment_id!);
        const newStatus = mapStatus(payment.status);

        if (newStatus !== inv.status) {
          await supabase
            .from('invoices')
            .update({
              status: newStatus,
              paid_at: newStatus === 'paid' ? (payment.paymentDate || inv.due_date) : null,
            })
            .eq('id', inv.id);

          // Atualiza também a asaas_transaction
          await supabase
            .from('asaas_transactions')
            .update({ status: payment.status })
            .eq('id', inv.asaas_payment_id!);

          details.push({ invoiceId: inv.id, asaasId: inv.asaas_payment_id!, oldStatus: inv.status, newStatus });
          updated++;
        }
      } catch {
        // Ignora erros individuais (pagamento pode ter sido removido do Asaas)
      }
    }

    return NextResponse.json({ updated, total: invoices.length, details });
  } catch (err: any) {
    console.error('sync-client-invoices error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
