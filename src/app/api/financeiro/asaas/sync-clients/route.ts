import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAsaasCustomerByCpfCnpj, getAllAsaasPaymentsByCustomer } from '@/lib/asaas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapStatus(asaasStatus: string): 'paid' | 'pending' | 'overdue' {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus)) return 'paid';
  if (asaasStatus === 'OVERDUE') return 'overdue';
  return 'pending';
}

type SyncAction = 'created' | 'updated' | 'skipped';

interface ClientResult {
  clientId: string;
  clientName: string;
  cnpj: string;
  status: string;
  asaasFound: boolean;
  paymentsFound: number;
  created: number;
  updated: number;
  skipped: number;
  error?: string;
}

async function syncClientPayments(
  clientId: string,
  clientName: string,
  asaasCustomerId: string,
  dueDateStart: string,
  dueDateEnd: string,
): Promise<{ created: number; updated: number; skipped: number }> {
  const payments = await getAllAsaasPaymentsByCustomer(asaasCustomerId, dueDateStart, dueDateEnd);
  let created = 0, updated = 0, skipped = 0;

  // Busca contrato mais recente do cliente
  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('client_id', clientId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  const contractId = contract?.id ?? null;

  for (const p of payments) {
    const invoiceStatus = mapStatus(p.status);
    const dueDate = p.dueDate || p.dateCreated.slice(0, 10);

    // 1. Checa invoice existente por asaas_payment_id
    const { data: existingInv } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('asaas_payment_id', p.id)
      .maybeSingle();

    if (existingInv) {
      if (existingInv.status !== invoiceStatus) {
        await supabase.from('invoices').update({
          status: invoiceStatus,
          paid_at: invoiceStatus === 'paid' ? (p.paymentDate || dueDate) : null,
        }).eq('id', existingInv.id);
        updated++;
      } else {
        skipped++;
      }
      await supabase.from('asaas_transactions').upsert({
        id: p.id, description: p.description, value: p.value, type: 'CREDIT',
        date: dueDate, status: p.status, invoice_id: existingInv.id,
        synced_at: new Date().toISOString(),
      });
      continue;
    }

    // 2. Checa asaas_transaction existente com invoice_id
    const { data: existingTx } = await supabase
      .from('asaas_transactions')
      .select('invoice_id')
      .eq('id', p.id)
      .maybeSingle();

    if (existingTx?.invoice_id) {
      const { data: linkedInv } = await supabase
        .from('invoices').select('id, status').eq('id', existingTx.invoice_id).maybeSingle();
      if (linkedInv && linkedInv.status !== invoiceStatus) {
        await supabase.from('invoices').update({
          status: invoiceStatus,
          asaas_payment_id: p.id,
          paid_at: invoiceStatus === 'paid' ? (p.paymentDate || dueDate) : null,
        }).eq('id', linkedInv.id);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // 3. Cria novo invoice + asaas_transaction
    const { data: inv } = await supabase
      .from('invoices')
      .insert({
        client_id: clientId,
        contract_id: contractId,
        amount: p.value,
        due_date: dueDate,
        status: invoiceStatus,
        description: p.description || `Mensalidade - ${clientName}`,
        asaas_payment_id: p.id,
        paid_at: invoiceStatus === 'paid' ? (p.paymentDate || dueDate) : null,
      })
      .select('id')
      .single();

    if (!inv) continue;

    await supabase.from('asaas_transactions').upsert({
      id: p.id, description: p.description, value: p.value, type: 'CREDIT',
      date: dueDate, status: p.status, invoice_id: inv.id,
      synced_at: new Date().toISOString(),
    });
    created++;
  }

  return { created, updated, skipped };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dueDateStart: string = body.startDate ?? '2025-01-01';
    const dueDateEnd: string = body.endDate ?? '2026-12-31';

    // Busca TODOS os clientes com CPF/CNPJ (ativos, inativos e prospects)
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, cnpj, status')
      .not('cnpj', 'is', null)
      .neq('cnpj', '');

    if (error) throw error;

    const results: ClientResult[] = [];
    let totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalNotFound = 0;

    for (const client of clients ?? []) {
      const result: ClientResult = {
        clientId: client.id,
        clientName: client.name,
        cnpj: client.cnpj,
        status: client.status,
        asaasFound: false,
        paymentsFound: 0,
        created: 0,
        updated: 0,
        skipped: 0,
      };

      try {
        const asaasCustomer = await getAsaasCustomerByCpfCnpj(client.cnpj);

        if (!asaasCustomer) {
          totalNotFound++;
          results.push(result);
          continue;
        }

        result.asaasFound = true;
        const payments = await getAllAsaasPaymentsByCustomer(asaasCustomer.id, dueDateStart, dueDateEnd);
        result.paymentsFound = payments.length;

        if (payments.length > 0) {
          const counts = await syncClientPayments(
            client.id,
            client.name,
            asaasCustomer.id,
            dueDateStart,
            dueDateEnd,
          );
          result.created = counts.created;
          result.updated = counts.updated;
          result.skipped = counts.skipped;
          totalCreated += counts.created;
          totalUpdated += counts.updated;
          totalSkipped += counts.skipped;
        }
      } catch (err: any) {
        result.error = err.message;
      }

      results.push(result);
    }

    return NextResponse.json({
      period: { from: dueDateStart, to: dueDateEnd },
      summary: {
        clientsProcessed: clients?.length ?? 0,
        clientsFoundInAsaas: results.filter(r => r.asaasFound).length,
        clientsNotFoundInAsaas: totalNotFound,
        invoicesCreated: totalCreated,
        invoicesUpdated: totalUpdated,
        invoicesSkipped: totalSkipped,
      },
      results,
    });
  } catch (err: any) {
    console.error('sync-clients error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
