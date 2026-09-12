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

export async function listInvoices(clientId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, amount, due_date, status, description, paid_at, created_at')
    .eq('client_id', clientId)
    .order('due_date', { ascending: false });

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
  const botId = getHermesBotUserId();
  const limit = Math.min(filters.limit || 30, 100);

  let query = supabase
    .from('chat_messages')
    .select('id, sender_id, receiver_id, content, channel, message_type, timestamp')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (filters.with_user_id) {
    // Thread de DM entre o HERMES e um usuário específico.
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
