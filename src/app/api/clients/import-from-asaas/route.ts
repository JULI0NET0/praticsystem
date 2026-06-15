import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAsaasCustomerByCpfCnpj, getAllAsaasPaymentsByCustomer, AsaasPayment } from '@/lib/asaas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mapAsaasStatusToInvoice(asaasStatus: string): 'paid' | 'pending' | 'overdue' {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus)) return 'paid';
  if (asaasStatus === 'OVERDUE') return 'overdue';
  return 'pending';
}

async function getOrCreateService(): Promise<string> {
  const { data } = await supabase
    .from('services')
    .select('id')
    .eq('name', 'Gestão de Redes Sociais')
    .single();
  if (data) return data.id;

  const { data: created } = await supabase
    .from('services')
    .insert({
      name: 'Gestão de Redes Sociais',
      description: 'Desenvolvimento e execução de ações estratégicas de comunicação digital.',
      category: 'Marketing',
      price: 0,
      is_recurring: true,
      billing_cycle: 'monthly',
      minimum_term: 3,
    })
    .select('id')
    .single();
  return created!.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpfCnpj, clientOverrides } = body as {
      cpfCnpj: string;
      clientOverrides?: {
        name?: string;
        nome_fantasia?: string;
        email?: string;
        phone?: string;
        contractValue?: number;
        contractStart?: string;
        contractDurationMonths?: number;
      };
    };

    if (!cpfCnpj) {
      return NextResponse.json({ error: 'CPF/CNPJ obrigatório' }, { status: 400 });
    }

    // 1. Busca no Asaas
    const customer = await getAsaasCustomerByCpfCnpj(cpfCnpj);
    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado no Asaas com este CPF/CNPJ' }, { status: 404 });
    }

    const payments = await getAllAsaasPaymentsByCustomer(customer.id);
    const cleanDoc = cpfCnpj.replace(/\D/g, '');
    const tipoPessoa = cleanDoc.length === 11 ? 'PF' : 'PJ';

    // 2. Upsert cliente como inativo
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('cnpj', cleanDoc)
      .maybeSingle();

    let clientId: string;

    const clientPayload = {
      name: clientOverrides?.name || customer.name,
      nome_fantasia: clientOverrides?.nome_fantasia || customer.name,
      cnpj: cleanDoc,
      tipo_pessoa: tipoPessoa,
      email: clientOverrides?.email || customer.email || null,
      portal_email: clientOverrides?.email || customer.email || null,
      phone: clientOverrides?.phone || customer.mobilePhone || customer.phone || '',
      contact_name: clientOverrides?.name || customer.name,
      status: 'inactive',
    };

    if (existing) {
      clientId = existing.id;
      await supabase.from('clients').update(clientPayload).eq('id', clientId);
    } else {
      // Cria via auth para ter UUID consistente
      let authId: string;
      const email = clientPayload.email;
      if (email) {
        try {
          const { data: authUser } = await supabase.auth.admin.createUser({
            email,
            password: `Pratic@${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            email_confirm: true,
          });
          authId = authUser.user!.id;
        } catch {
          authId = crypto.randomUUID();
        }
      } else {
        authId = crypto.randomUUID();
      }

      clientId = authId;
      await supabase.from('clients').insert({ id: clientId, ...clientPayload });
    }

    // 3. Contrato (opcional — só cria se fornecido)
    let contractId: string | null = null;
    if (clientOverrides?.contractValue && clientOverrides?.contractStart) {
      const startDate = new Date(clientOverrides.contractStart);
      const months = clientOverrides.contractDurationMonths ?? 3;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      const serviceId = await getOrCreateService();
      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          client_id: clientId,
          service_id: serviceId,
          start_date: clientOverrides.contractStart,
          end_date: endDate.toISOString().slice(0, 10),
          value: clientOverrides.contractValue,
          auto_renew: false,
          status: 'expired',
          document_status: 'signed',
        })
        .select('id')
        .single();
      contractId = contract?.id ?? null;
    }

    // 4. Sync pagamentos Asaas → invoices
    const synced: Array<{ asaasId: string; invoiceId: string; status: string; amount: number; action: 'created' | 'updated' | 'skipped' }> = [];

    for (const p of payments) {
      const invoiceStatus = mapAsaasStatusToInvoice(p.status);
      const dueDate = p.dueDate || p.dateCreated.slice(0, 10);

      // Checa se invoice já existe por asaas_payment_id
      const { data: existingInv } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('asaas_payment_id', p.id)
        .maybeSingle();

      if (existingInv) {
        // Atualiza status se mudou
        if (existingInv.status !== invoiceStatus) {
          await supabase.from('invoices').update({
            status: invoiceStatus,
            paid_at: invoiceStatus === 'paid' ? (p.paymentDate || dueDate) : null,
          }).eq('id', existingInv.id);
          synced.push({ asaasId: p.id, invoiceId: existingInv.id, status: invoiceStatus, amount: p.value, action: 'updated' });
        } else {
          synced.push({ asaasId: p.id, invoiceId: existingInv.id, status: invoiceStatus, amount: p.value, action: 'skipped' });
        }
        // Garante asaas_transaction linkada
        await supabase.from('asaas_transactions').upsert({
          id: p.id, description: p.description, value: p.value, type: 'CREDIT',
          date: dueDate, status: p.status, invoice_id: existingInv.id,
          synced_at: new Date().toISOString(),
        });
        continue;
      }

      // Checa se asaas_transaction já tem invoice_id
      const { data: existingTx } = await supabase
        .from('asaas_transactions')
        .select('invoice_id')
        .eq('id', p.id)
        .maybeSingle();

      if (existingTx?.invoice_id) {
        // Atualiza status do invoice linkado se necessário
        const { data: linkedInv } = await supabase
          .from('invoices').select('id, status').eq('id', existingTx.invoice_id).maybeSingle();
        if (linkedInv && linkedInv.status !== invoiceStatus) {
          await supabase.from('invoices').update({
            status: invoiceStatus,
            asaas_payment_id: p.id,
            paid_at: invoiceStatus === 'paid' ? (p.paymentDate || dueDate) : null,
          }).eq('id', linkedInv.id);
          synced.push({ asaasId: p.id, invoiceId: linkedInv.id, status: invoiceStatus, amount: p.value, action: 'updated' });
        } else {
          synced.push({ asaasId: p.id, invoiceId: existingTx.invoice_id, status: invoiceStatus, amount: p.value, action: 'skipped' });
        }
        continue;
      }

      // Cria novo invoice
      const { data: inv } = await supabase
        .from('invoices')
        .insert({
          client_id: clientId,
          contract_id: contractId,
          amount: p.value,
          due_date: dueDate,
          status: invoiceStatus,
          description: p.description || `Mensalidade - ${customer.name}`,
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

      synced.push({ asaasId: p.id, invoiceId: inv.id, status: invoiceStatus, amount: p.value, action: 'created' });
    }

    return NextResponse.json({
      clientId,
      contractId,
      asaasCustomerId: customer.id,
      paymentsFound: payments.length,
      paymentsSynced: synced.length,
      synced,
    });
  } catch (err: any) {
    console.error('import-from-asaas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
