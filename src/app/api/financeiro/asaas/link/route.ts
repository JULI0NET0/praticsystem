import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Vincula uma transação Asaas a um expense_entry ou invoice existente
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { asaas_transaction_id, expense_entry_id, invoice_id } = await request.json();

    if (!asaas_transaction_id) {
      return NextResponse.json({ error: 'asaas_transaction_id é obrigatório' }, { status: 400 });
    }

    if (!expense_entry_id && !invoice_id) {
      return NextResponse.json(
        { error: 'Informe expense_entry_id ou invoice_id para vincular' },
        { status: 400 }
      );
    }

    const update: Record<string, string> = {};
    if (expense_entry_id) update.expense_entry_id = expense_entry_id;
    if (invoice_id) update.invoice_id = invoice_id;

    const { data: txn, error: txnError } = await supabase
      .from('asaas_transactions')
      .update(update)
      .eq('id', asaas_transaction_id)
      .select()
      .single();

    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 400 });

    // Se vinculou a um expense_entry, marca como pago com a data da transação
    if (expense_entry_id) {
      const txnDate = txn?.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0];
      await supabase
        .from('expense_entries')
        .update({ asaas_transaction_id, status: 'paid', date: txnDate })
        .eq('id', expense_entry_id);
    }

    return NextResponse.json(txn);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
