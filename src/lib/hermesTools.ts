import { getSupabaseAdmin, getHermesDefaultUserId, sanitizeClientForHermes } from './hermesAuth';

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
