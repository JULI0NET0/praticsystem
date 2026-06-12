import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAllTransactions } from '@/lib/asaas';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 });
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 503 });
    }

    const transactions = await getAllTransactions(startDate, endDate);

    if (!transactions.length) {
      return NextResponse.json({ imported: 0, skipped: 0 });
    }

    const supabase = getSupabase();

    // Busca IDs já existentes para evitar duplicação
    const ids = transactions.map((t) => t.id);
    const { data: existing } = await supabase
      .from('asaas_transactions')
      .select('id')
      .in('id', ids);

    const existingIds = new Set((existing || []).map((r: { id: string }) => r.id));
    const newTransactions = transactions.filter((t) => !existingIds.has(t.id));

    if (newTransactions.length === 0) {
      return NextResponse.json({ imported: 0, skipped: transactions.length });
    }

    const rows = newTransactions.map((t) => ({
      id: t.id,
      description: t.description || null,
      value: t.value,
      // Normaliza para CREDIT/DEBIT — Asaas pode retornar outros tipos (PIX, TRANSFER, etc.)
      type: t.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      date: t.date,
      status: t.status,
      synced_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from('asaas_transactions').insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      imported: newTransactions.length,
      skipped: existingIds.size,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
