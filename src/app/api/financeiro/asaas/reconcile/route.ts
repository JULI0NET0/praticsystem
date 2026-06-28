import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { findConfidentConfirmation } from '@/lib/asaasGroups';
import type { AsaasTransaction, Invoice } from '@/types/database';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Auto-reconcilia "Cobrança recebida" sem vínculo com o payment transaction
// correspondente (mesmo cliente + valor + mês), marcando-a como confirmação bancária.
export async function POST() {
  try {
    const supabase = getSupabase();

    const [{ data: txns }, { data: invoices }, { data: clients }] = await Promise.all([
      supabase.from('asaas_transactions').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('clients').select('id, name, nome_fantasia, cnpj'),
    ]);

    const transactions = (txns ?? []) as AsaasTransaction[];
    const invoiceList = (invoices ?? []) as Invoice[];
    const clientList = clients ?? [];

    const candidates = transactions.filter(
      (t) =>
        t.type === 'CREDIT' &&
        !t.confirms_asaas_transaction_id &&
        !t.invoice_id &&
        /cobran[cç]a\s+recebida/i.test(t.description || '')
    );

    let reconciled = 0;
    for (const bankTxn of candidates) {
      const match = findConfidentConfirmation(bankTxn, transactions, invoiceList, clientList);
      if (!match) continue;

      const { error } = await supabase
        .from('asaas_transactions')
        .update({
          confirms_asaas_transaction_id: match.paymentTxnId,
          invoice_id: match.invoiceId,
        })
        .eq('id', bankTxn.id);

      if (!error) {
        // reflete localmente para não re-casar a mesma payment txn
        bankTxn.confirms_asaas_transaction_id = match.paymentTxnId;
        bankTxn.invoice_id = match.invoiceId;
        reconciled++;
      }
    }

    return NextResponse.json({ reconciled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
