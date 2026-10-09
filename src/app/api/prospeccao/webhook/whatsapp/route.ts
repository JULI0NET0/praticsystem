import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { parseIncomingMessage, parseUazapiEvent, type UazapiEvent } from '@/lib/prospeccao/webhook';
import { copyToBucket, enrichLeadFromWhatsApp, previewFor } from '@/lib/prospeccao/server';
import { nextMessageStatus } from '@/lib/prospeccao/leads';
import { getProvider } from '@/lib/whatsapp/provider';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Supabase = ReturnType<typeof getSupabaseAdmin>;
type MessageEvent = Extract<UazapiEvent, { kind: 'message' }>;

// Entrada da UAZAPI (mensagens e recibos). Autenticada por segredo (?secret= ou x-webhook-secret).
export async function POST(request: Request) {
  const secret = process.env.WA_WEBHOOK_SECRET;
  const given = request.headers.get('x-webhook-secret') ?? new URL(request.url).searchParams.get('secret');
  if (!secret || given !== secret) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const payload = await request.json().catch(() => null);
  let event: UazapiEvent | null = parseUazapiEvent(payload);

  if (!event) {
    // Formato genérico { phone, name, message } / Evolution
    const generic = parseIncomingMessage(payload);
    if (generic) {
      event = {
        kind: 'message', phone: generic.phone, name: generic.name, body: generic.body, fromMe: false,
        messageType: 'text', uazId: null, externalId: generic.externalId, mimetype: null, fileName: null, seconds: null, timestamp: null,
      };
    }
  }
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const supabase = getSupabaseAdmin();
  try {
    if (event.kind === 'status') await applyStatus(supabase, event);
    else await storeMessage(supabase, event);
  } catch (err) {
    console.error('[prospeccao] webhook:', err);
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function applyStatus(supabase: Supabase, event: Extract<UazapiEvent, { kind: 'status' }>) {
  const { data: rows } = await supabase
    .from('lead_messages')
    .select('id, status')
    .in('external_id', event.messageIds)
    .eq('direction', 'out');
  for (const row of rows ?? []) {
    const next = nextMessageStatus(row.status, event.state);
    if (next !== row.status) await supabase.from('lead_messages').update({ status: next }).eq('id', row.id);
  }
}

async function storeMessage(supabase: Supabase, event: MessageEvent) {
  if (event.externalId) {
    const { data: dup } = await supabase.from('lead_messages').select('id').eq('external_id', event.externalId).maybeSingle();
    if (dup) return;
  }

  const { data: found } = await supabase
    .from('leads')
    .select('id, nome, unread_count, estagio')
    .eq('telefone', event.phone)
    .maybeSingle();

  let lead = found;
  let created = false;
  if (!lead) {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: (!event.fromMe && event.name) || event.phone,
        telefone: event.phone,
        origem: 'whatsapp',
        estagio: event.fromMe ? 'contatado' : 'conversando',
      })
      .select('id, nome, unread_count, estagio')
      .single();
    if (error) throw error;
    lead = data;
    created = true;
  }

  // Mídia: copia para o bucket (a URL da UAZAPI expira em 2 dias).
  let media: { url: string; mimetype: string } | null = null;
  if (event.messageType !== 'text' && event.uazId) {
    const dl = await getProvider().downloadMedia(event.uazId);
    if (dl) media = await copyToBucket(supabase, dl.url, lead.id, dl.mimetype ?? event.mimetype, event.fileName);
  }

  await supabase.from('lead_messages').insert({
    lead_id: lead.id,
    direction: event.fromMe ? 'out' : 'in',
    body: event.body,
    message_type: event.messageType,
    media_url: media?.url ?? null,
    media_mimetype: media?.mimetype ?? event.mimetype,
    media_name: event.fileName,
    media_seconds: event.seconds,
    status: event.fromMe ? 'sent' : 'delivered',
    external_id: event.externalId,
  });

  const now = new Date().toISOString();
  await supabase
    .from('leads')
    .update({
      last_message_at: now,
      last_message_preview: previewFor(event.messageType, event.body),
      unread_count: event.fromMe ? lead.unread_count ?? 0 : (lead.unread_count ?? 0) + 1,
      estagio: !event.fromMe && ['novo', 'contatado'].includes(lead.estagio) ? 'conversando' : lead.estagio,
      updated_at: now,
    })
    .eq('id', lead.id);

  if (created || lead.nome === event.phone) await enrichLeadFromWhatsApp(supabase, lead.id, event.phone, lead.nome);
}
