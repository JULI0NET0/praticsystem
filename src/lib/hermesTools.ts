import { getSupabaseAdmin, getHermesDefaultUserId, getHermesBotUserId, sanitizeClientForHermes } from './hermesAuth';
import {
  CATEGORY_GOOGLE_ACCOUNT,
  GoogleAccount,
  insertEvent,
  updateEvent,
  deleteEvent,
  isAccountConfigured,
} from './googleCalendar';

/**
 * Lógica de negócio das ferramentas do HERMES, compartilhada entre a API
 * REST (src/app/api/hermes/**) e o servidor MCP (src/app/api/hermes/mcp) —
 * o Hermes (Nous Research) conecta via MCP remoto, mas mantemos a API REST
 * para uso manual/outros integradores.
 */

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function searchClients(q?: string, limit = 20) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('clients')
    .select('id, name, nome_fantasia, cnpj, tipo_pessoa, contact_name, email, phone, setor, status, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 50));

  if (q) {
    const term = q.replace(/[%,]/g, '');
    query = query.or(
      `name.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cnpj.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClient(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return sanitizeClientForHermes(data);
}

/** Converte texto/markdown simples num doc TipTap mínimo: um parágrafo por bloco separado por linha em branco. */
function textToTiptapDoc(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block }],
    })),
  };
}

export async function createNote(input: {
  client_id?: string | null;
  title: string;
  content: string;
  subjects?: string[];
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: getHermesDefaultUserId(),
      title: input.title,
      content: textToTiptapDoc(input.content),
      client_id: input.client_id || null,
      subjects: Array.isArray(input.subjects) ? input.subjects : [],
      share_all: true,
      pin_to_client: !!input.client_id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listNotes(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, date, subjects, client_id, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('pin_to_client', true)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createProposal(input: {
  client_id: string;
  title: string;
  value?: number | null;
  file_base64: string;
  file_name: string;
}) {
  const supabase = getSupabaseAdmin();
  const buffer = Buffer.from(input.file_base64, 'base64');
  const path = `${input.client_id}/${Date.now()}-${input.file_name}`;

  let documentUrl: string;
  const { error: uploadError } = await supabase.storage
    .from('proposals')
    .upload(path, buffer, { contentType: DOCX_CONTENT_TYPE, upsert: false });

  if (!uploadError) {
    const { data: publicUrlData } = supabase.storage.from('proposals').getPublicUrl(path);
    documentUrl = publicUrlData.publicUrl;
  } else {
    // Fallback: mesma estratégia usada para signed_document_url em Contracts
    // quando o upload no Storage falha.
    documentUrl = `data:${DOCX_CONTENT_TYPE};base64,${input.file_base64}`;
  }

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      client_id: input.client_id,
      title: input.title,
      value: typeof input.value === 'number' ? input.value : null,
      document_url: documentUrl,
      document_file_name: input.file_name,
      created_by_user_id: getHermesDefaultUserId(),
      source: 'hermes',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getProposal(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('proposals').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listProposals(clientId?: string) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('proposals').select('*').order('created_at', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listInvoices(filters: {
  client_id?: string;
  status?: 'pending' | 'paid' | 'overdue';
  from?: string;
  to?: string;
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('invoices')
    .select('id, client_id, contract_id, amount, due_date, status, description, paid_at, asaas_payment_id, created_at')
    .order('due_date', { ascending: false });

  if (filters.client_id) query = query.eq('client_id', filters.client_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.from) query = query.gte('due_date', filters.from);
  if (filters.to) query = query.lte('due_date', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// =============================================================
// Demandas
// =============================================================

export async function listDemands(filters: {
  client_id?: string;
  status?: string;
  assignee_id?: string;
  scope?: 'client' | 'internal';
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('demands')
    .select(
      'id, title, description, client_id, scope, status, status_category, priority, assignee_ids, due_date, due_time, start_date, type, created_at, updated_at, completed_at'
    )
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filters.client_id) query = query.eq('client_id', filters.client_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.scope) query = query.eq('scope', filters.scope);
  if (filters.assignee_id) query = query.contains('assignee_ids', [filters.assignee_id]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDemand(id: string) {
  const supabase = getSupabaseAdmin();
  const [demandRes, commentsRes] = await Promise.all([
    supabase.from('demands').select('*').eq('id', id).single(),
    supabase
      .from('demand_comments')
      .select('id, user_id, body, edited, created_at, updated_at')
      .eq('demand_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (demandRes.error) throw new Error(demandRes.error.message);
  return { ...demandRes.data, comments: commentsRes.data ?? [] };
}

export async function createDemand(input: {
  title: string;
  description?: string;
  client_id?: string | null;
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  assignee_ids?: string[];
  status?: string;
  due_date?: string;
  due_time?: string;
  start_date?: string;
  type?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demands')
    .insert({
      title: input.title,
      description: input.description ? textToTiptapDoc(input.description) : null,
      client_id: input.client_id || null,
      priority: input.priority || 'none',
      assignee_ids: Array.isArray(input.assignee_ids) ? input.assignee_ids : [],
      status: input.status || 'pending',
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      start_date: input.start_date || null,
      type: input.type || null,
      created_by: getHermesDefaultUserId(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDemandStatus(demandId: string, status: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demands')
    .update({ status })
    .eq('id', demandId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listDemandStatuses() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demand_statuses')
    .select('id, label, category, position')
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Edição parcial: só os campos enviados são gravados; `null` limpa o campo.
 * status_category, completed_at e scope são derivados pelo trigger
 * demands_sync_derived (BLOCO 11.3), por isso não são aceitos aqui.
 */
export async function updateDemand(
  demandId: string,
  input: {
    title?: string;
    description?: string | null;
    client_id?: string | null;
    priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent';
    assignee_ids?: string[];
    status?: string;
    due_date?: string | null;
    due_time?: string | null;
    start_date?: string | null;
    type?: string | null;
  }
) {
  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    updatePayload[key] = key === 'description' && typeof value === 'string' ? textToTiptapDoc(value) : value;
  }
  if (Object.keys(updatePayload).length === 0) throw new Error('Nenhum campo para atualizar.');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demands')
    .update(updatePayload)
    .eq('id', demandId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Status de categoria `fechado` de menor posição — 'completed' no seed padrão. */
async function resolveClosedStatus() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demand_statuses')
    .select('id')
    .eq('category', 'fechado')
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (error) throw new Error('Nenhum status de conclusão configurado em demand_statuses.');
  return data.id as string;
}

export async function completeDemand(demandId: string) {
  return updateDemandStatus(demandId, await resolveClosedStatus());
}

export async function reopenDemand(demandId: string, status = 'pending') {
  return updateDemandStatus(demandId, status);
}

export async function listDemandChecklist(demandId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demand_checklist')
    .select('id, group_name, label, done, done_at, position')
    .eq('demand_id', demandId)
    .order('position', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addDemandChecklistItem(input: { demand_id: string; group_name: string; label: string }) {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from('demand_checklist')
    .select('id', { count: 'exact', head: true })
    .eq('demand_id', input.demand_id);

  const { data, error } = await supabase
    .from('demand_checklist')
    .insert({
      demand_id: input.demand_id,
      group_name: input.group_name,
      label: input.label.trim(),
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** done_at é carimbado pelo trigger demand_checklist_sync_done_at. */
export async function setDemandChecklistItemDone(itemId: string, done: boolean) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demand_checklist')
    .update({ done })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function addDemandComment(demandId: string, body: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('demand_comments')
    .insert({ demand_id: demandId, user_id: getHermesDefaultUserId(), body })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// =============================================================
// Agenda
// =============================================================

function resolveGoogleAccount(type: string): GoogleAccount {
  return CATEGORY_GOOGLE_ACCOUNT[type] || 'agenciapratic';
}

export async function listAgendaEvents(filters: {
  client_id?: string;
  from?: string;
  to?: string;
  type?: string;
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('agenda_events')
    .select('id, title, type, date, client_id, assigned_to, status, visibility, description, google_event_id')
    .order('date', { ascending: true });

  if (filters.client_id) query = query.eq('client_id', filters.client_id);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.from) query = query.gte('date', filters.from);
  if (filters.to) query = query.lte('date', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAgendaEvent(input: {
  title: string;
  type: string;
  date: string;
  description?: string;
  client_id?: string | null;
  assigned_to?: string | null;
  visibility?: 'public' | 'private';
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('agenda_events')
    .insert({
      title: input.title,
      type: input.type,
      date: input.date,
      description: input.description || null,
      client_id: input.client_id || null,
      assigned_to: input.assigned_to || getHermesDefaultUserId(),
      visibility: input.visibility || 'public',
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Sincroniza com o Google Calendar, mesmo fluxo de push usado em
  // /api/agenda/google-sync — não falha a criação se o Google der erro.
  const account = resolveGoogleAccount(data.type);
  if (isAccountConfigured(account)) {
    try {
      const googleEventId = await insertEvent(account, {
        title: data.title,
        date: data.date,
        description: data.description || undefined,
      });
      const { data: updated } = await supabase
        .from('agenda_events')
        .update({ google_event_id: googleEventId, google_account: account })
        .eq('id', data.id)
        .select()
        .single();
      return updated ?? data;
    } catch (err) {
      console.error('Falha ao sincronizar evento criado pelo HERMES com o Google Calendar:', err);
    }
  }

  return data;
}

export async function updateAgendaEvent(
  id: string,
  input: { title?: string; date?: string; description?: string; type?: string }
) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from('agenda_events')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const updatePayload: Record<string, unknown> = {};
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.date !== undefined) updatePayload.date = input.date;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.type !== undefined) updatePayload.type = input.type;

  const { data, error } = await supabase
    .from('agenda_events')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  const account: GoogleAccount = (existing.google_account as GoogleAccount) || resolveGoogleAccount(data.type);
  if (existing.google_event_id && isAccountConfigured(account)) {
    try {
      await updateEvent(account, existing.google_event_id, {
        title: data.title,
        date: data.date,
        description: data.description || undefined,
      });
    } catch (err) {
      console.error('Falha ao atualizar evento no Google Calendar a partir do HERMES:', err);
    }
  }

  return data;
}

export async function cancelAgendaEvent(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from('agenda_events')
    .select('id, google_event_id, google_account')
    .eq('id', id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (existing.google_event_id && existing.google_account) {
    const account = existing.google_account as GoogleAccount;
    if (isAccountConfigured(account)) {
      try {
        await deleteEvent(account, existing.google_event_id);
      } catch (err) {
        console.error('Falha ao remover evento do Google Calendar a partir do HERMES:', err);
      }
    }
  }

  const { error } = await supabase.from('agenda_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id, cancelled: true };
}

// =============================================================
// Chat interno
// =============================================================

export async function listChatMessages(
  filters: { channel?: string; with_user_id?: string; limit?: number } = {}
) {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(filters.limit || 30, 100);

  let query = supabase
    .from('chat_messages')
    .select('id, sender_id, receiver_id, content, channel, message_type, timestamp')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (filters.with_user_id) {
    // Thread de DM entre o HERMES e um usuário específico.
    const botId = getHermesBotUserId();
    query = query.or(
      `and(sender_id.eq.${botId},receiver_id.eq.${filters.with_user_id}),and(sender_id.eq.${filters.with_user_id},receiver_id.eq.${botId})`
    );
  } else {
    query = query.eq('channel', filters.channel || 'general').is('receiver_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).reverse();
}

export async function sendChatMessage(input: { channel?: string; content: string; receiver_id?: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: getHermesBotUserId(),
      receiver_id: input.receiver_id || null,
      content: input.content,
      channel: input.receiver_id ? 'dm' : (input.channel || 'general'),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// =============================================================
// Financeiro — contas a receber (invoices) e a pagar (expense_entries)
// =============================================================

const today = () => new Date().toISOString().split('T')[0];

/**
 * Mesmo fluxo de handleAddInvoice em /admin/financeiro: uma cobrança já
 * paga ganha uma transação CREDIT em asaas_transactions para aparecer na
 * conciliação.
 */
export async function createInvoice(input: {
  client_id: string;
  amount: number;
  due_date: string;
  description: string;
  status?: 'pending' | 'paid';
  paid_at?: string;
  contract_id?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const paid = input.status === 'paid';
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      client_id: input.client_id,
      contract_id: input.contract_id || null,
      amount: input.amount,
      due_date: input.due_date,
      description: input.description,
      status: input.status || 'pending',
      paid_at: paid ? input.paid_at || today() : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (paid) {
    await supabase.from('asaas_transactions').insert({
      description: data.description,
      value: data.amount,
      type: 'CREDIT',
      date: data.paid_at,
      status: 'RECEIVED',
      invoice_id: data.id,
      synced_at: new Date().toISOString(),
    });
  }

  return data;
}

/**
 * Ajuste local da fatura. Não altera a cobrança no Asaas: se a fatura tem
 * asaas_payment_id, valor/vencimento divergem até a próxima sincronização.
 */
export async function updateInvoice(
  invoiceId: string,
  input: {
    amount?: number;
    due_date?: string;
    description?: string;
    status?: 'pending' | 'paid' | 'overdue';
    paid_at?: string | null;
  }
) {
  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updatePayload[key] = value;
  }
  // Mesma regra de handleUpdateInvoiceStatus: paid_at acompanha o status.
  if (input.status === 'paid') updatePayload.paid_at = input.paid_at || today();
  else if (input.status) updatePayload.paid_at = null;
  if (Object.keys(updatePayload).length === 0) throw new Error('Nenhum campo para atualizar.');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listExpenses(filters: { status?: 'active' | 'inactive' } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('expenses')
    .select('id, description, category, amount, due_day, recurrence, status, related_user_id, notes')
    .order('description', { ascending: true });

  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listExpenseEntries(filters: {
  status?: 'pending' | 'paid' | 'cancelled';
  expense_id?: string;
  from?: string;
  to?: string;
} = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('expense_entries')
    .select('id, expense_id, description, amount, date, status, category, notes, asaas_transaction_id, expenses(id, description, category)')
    .order('date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.expense_id) query = query.eq('expense_id', filters.expense_id);
  if (filters.from) query = query.gte('date', filters.from);
  if (filters.to) query = query.lte('date', filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createExpenseEntry(input: {
  description: string;
  amount: number;
  date: string;
  status?: 'pending' | 'paid';
  expense_id?: string | null;
  category?: string | null;
  notes?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('expense_entries')
    .insert({
      description: input.description,
      amount: input.amount,
      date: input.date,
      status: input.status || 'pending',
      expense_id: input.expense_id || null,
      category: input.category || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Na UI, dar baixa grava status 'paid' e troca `date` pela data do
 * pagamento (DespesasList/DespesasVariaveis) — então `date` é vencimento
 * enquanto pendente e data de pagamento depois de paga.
 */
export async function updateExpenseEntry(
  entryId: string,
  input: {
    description?: string;
    amount?: number;
    date?: string;
    status?: 'pending' | 'paid' | 'cancelled';
    category?: string | null;
    notes?: string | null;
  }
) {
  const updatePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) updatePayload[key] = value;
  }
  if (Object.keys(updatePayload).length === 0) throw new Error('Nenhum campo para atualizar.');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('expense_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .select('*, expenses(id, description, category)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
