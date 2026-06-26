import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Desvincula uma transação Asaas de um expense_entry / invoice e recalcula o status do alvo
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const { asaas_transaction_id } = await request.json();

    if (!asaas_transaction_id) {
      return NextResponse.json({ error: 'asaas_transaction_id é obrigatório' }, { status: 400 });
    }

    // 1. Lê o vínculo atual da transação
    const { data: txn, error: txnError } = await supabase
      .from('asaas_transactions')
      .select('id, invoice_id, expense_entry_id')
      .eq('id', asaas_transaction_id)
      .single();

    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 400 });

    const { invoice_id, expense_entry_id } = txn;

    // 2. Zera os vínculos na transação
    const { error: clearError } = await supabase
      .from('asaas_transactions')
      .update({ invoice_id: null, expense_entry_id: null })
      .eq('id', asaas_transaction_id);

    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });

    // 3a. Recalcula a despesa (expense_entry)
    if (expense_entry_id) {
      const { data: entry } = await supabase
        .from('expense_entries')
        .select('id, amount, status, asaas_transaction_id')
        .eq('id', expense_entry_id)
        .maybeSingle();

      if (entry) {
        // Soma das txns que continuam ligadas a este entry
        const { data: remaining } = await supabase
          .from('asaas_transactions')
          .select('value')
          .eq('expense_entry_id', expense_entry_id);
        const sum = (remaining ?? []).reduce((s, r: { value: number }) => s + Number(r.value), 0);

        const update: Record<string, unknown> = {};
        if (entry.asaas_transaction_id === asaas_transaction_id) {
          update.asaas_transaction_id = null;
        }
        if (sum < Number(entry.amount) && entry.status === 'paid') {
          update.status = 'pending';
        }
        if (Object.keys(update).length > 0) {
          await supabase.from('expense_entries').update(update).eq('id', expense_entry_id);
        }
      }
    }

    // 3b. Recalcula a fatura (invoice)
    if (invoice_id) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, amount, status')
        .eq('id', invoice_id)
        .maybeSingle();

      if (inv) {
        const { data: remaining } = await supabase
          .from('asaas_transactions')
          .select('value')
          .eq('invoice_id', invoice_id);
        const sum = (remaining ?? []).reduce((s, r: { value: number }) => s + Number(r.value), 0);

        if (sum < Number(inv.amount) && inv.status === 'paid') {
          await supabase.from('invoices').update({ status: 'pending', paid_at: null }).eq('id', invoice_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
