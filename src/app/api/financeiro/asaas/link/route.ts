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
    const { asaas_transaction_id, expense_entry_id, invoice_id, notes, confirms_asaas_transaction_id } = await request.json();

    if (!asaas_transaction_id) {
      return NextResponse.json({ error: 'asaas_transaction_id é obrigatório' }, { status: 400 });
    }

    if (!expense_entry_id && !invoice_id && !confirms_asaas_transaction_id) {
      return NextResponse.json(
        { error: 'Informe expense_entry_id, invoice_id ou confirms_asaas_transaction_id' },
        { status: 400 }
      );
    }

    const update: Record<string, string> = {};
    if (expense_entry_id) update.expense_entry_id = expense_entry_id;
    if (invoice_id) update.invoice_id = invoice_id;
    if (notes) update.notes = notes;
    // Bank statement confirmation: links to the invoice for display but excluded from payment sum
    if (confirms_asaas_transaction_id) {
      update.confirms_asaas_transaction_id = confirms_asaas_transaction_id;
      // Copy invoice_id from the confirmed transaction so it shows in the same group display
      if (!invoice_id) {
        const { data: confirmed } = await supabase
          .from('asaas_transactions')
          .select('invoice_id')
          .eq('id', confirms_asaas_transaction_id)
          .single();
        if (confirmed?.invoice_id) update.invoice_id = confirmed.invoice_id;
      }
    }

    const { data: txn, error: txnError } = await supabase
      .from('asaas_transactions')
      .update(update)
      .eq('id', asaas_transaction_id)
      .select()
      .single();

    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 400 });

    // Se vinculou a um expense_entry, calcula se o total vinculado cobre o valor da fatura
    if (expense_entry_id) {
      const txnDate = txn?.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0];

      const [{ data: linkedTxns }, { data: entryRow }] = await Promise.all([
        supabase.from('asaas_transactions').select('value').eq('expense_entry_id', expense_entry_id),
        supabase.from('expense_entries').select('amount, asaas_transaction_id').eq('id', expense_entry_id).single(),
      ]);

      const totalLinked = (linkedTxns ?? []).reduce((s: number, t: { value: number }) => s + Number(t.value), 0);
      const entryAmount = Number(entryRow?.amount ?? 0);

      // Preserva o asaas_transaction_id existente (primeiro parcial) para não quebrar o histórico
      const entryUpdate: Record<string, unknown> = {};
      if (!entryRow?.asaas_transaction_id) {
        entryUpdate.asaas_transaction_id = asaas_transaction_id;
      }
      if (entryAmount > 0 && totalLinked >= entryAmount) {
        entryUpdate.status = 'paid';
        entryUpdate.date = txnDate;
      }
      if (notes) entryUpdate.notes = notes;

      if (Object.keys(entryUpdate).length > 0) {
        await supabase.from('expense_entries').update(entryUpdate).eq('id', expense_entry_id);
      }
    }

    // Se vinculou a uma invoice diretamente (não é confirmação bancária), atualizar status
    if (invoice_id && !confirms_asaas_transaction_id) {
      const txnDate = txn?.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0];

      const [{ data: allLinked }, { data: inv }] = await Promise.all([
        supabase.from('asaas_transactions')
          .select('value, confirms_asaas_transaction_id')
          .eq('invoice_id', invoice_id),
        supabase.from('invoices').select('amount, status').eq('id', invoice_id).single(),
      ]);

      const total = (allLinked ?? [])
        .filter((t: { confirms_asaas_transaction_id: string | null }) => !t.confirms_asaas_transaction_id)
        .reduce((s: number, t: { value: number }) => s + Number(t.value), 0);

      if (inv && Number(inv.amount) > 0 && total >= Number(inv.amount) && inv.status !== 'paid') {
        await supabase.from('invoices').update({ status: 'paid', paid_at: txnDate }).eq('id', invoice_id);
      }
    }

    return NextResponse.json(txn);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
