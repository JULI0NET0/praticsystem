import type { SupabaseClient } from '@supabase/supabase-js';
import { getProvider } from '@/lib/whatsapp/provider';
import { SILENT_TYPES, classifyPhone } from './classify';
import { nextMessageStatus, phoneVariants } from './leads';
import { copyToBucket, enrichLeadFromWhatsApp, previewFor } from './server';
import { cancelFollowups, topUpSeries } from './scheduleServer';
import { eventFromFindRecord, type MessageEvent } from './webhook';

export type IngestOutcome = 'inserted' | 'updated' | 'skipped' | 'deferred';

export interface IngestOptions {
  /** Orçamento de mídias por passada (sincronização). Sem orçamento, não há limite (webhook). */
  mediaBudget?: { left: number };
  /** Sincronização: só conta não lida se a mensagem for mais nova que a última leitura da conversa. */
  backfill?: boolean;
}

/** Atualiza o agendamento correspondente quando a mensagem enviada aparece no WhatsApp. */
async function resolveScheduled(supabase: SupabaseClient, externalId: string, leadId: string, messageRowId: string | null, status: string | null) {
  if (status === 'failed') {
    await supabase.from('scheduled_messages').update({ status: 'failed', error: 'O WhatsApp não entregou', updated_at: new Date().toISOString() }).eq('external_id', externalId).eq('status', 'pending');
    return;
  }
  const { data: done } = await supabase
    .from('scheduled_messages')
    .update({ status: 'sent', sent_message_id: messageRowId, updated_at: new Date().toISOString() })
    .eq('external_id', externalId)
    .eq('status', 'pending')
    .select('campaign_id');
  for (const d of done ?? []) {
    if (d.campaign_id) await supabase.from('campaign_recipients').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('campaign_id', d.campaign_id).eq('lead_id', leadId);
  }
}

/** Recibos de entrega/leitura: o status só avança. */
export async function applyStatus(supabase: SupabaseClient, messageIds: string[], state: string) {
  const { data: rows } = await supabase.from('lead_messages').select('id, status').in('external_id', messageIds).eq('direction', 'out');
  if (state === 'failed') {
    await supabase.from('scheduled_messages').update({ status: 'failed', error: 'O WhatsApp não entregou', updated_at: new Date().toISOString() }).in('external_id', messageIds).eq('status', 'pending');
  }
  for (const row of rows ?? []) {
    const next = nextMessageStatus(row.status, state);
    if (next !== row.status) await supabase.from('lead_messages').update({ status: next }).eq('id', row.id);
  }
}

/**
 * Grava uma mensagem (recebida, enviada pelo sistema, agendada ou enviada direto pelo celular).
 * Usada pelo webhook e pela sincronização; a deduplicação é por `external_id`.
 */
export async function ingestMessage(supabase: SupabaseClient, event: MessageEvent, opts: IngestOptions = {}): Promise<IngestOutcome> {
  if (event.externalId) {
    const { data: dup } = await supabase.from('lead_messages').select('id, status, lead_id').eq('external_id', event.externalId).maybeSingle();
    if (dup) {
      let outcome: IngestOutcome = 'skipped';
      if (event.status) {
        const next = nextMessageStatus(dup.status, event.status);
        if (next !== dup.status) {
          await supabase.from('lead_messages').update({ status: next }).eq('id', dup.id);
          outcome = 'updated';
        }
      }
      if (event.fromMe) await resolveScheduled(supabase, event.externalId, dup.lead_id, dup.id, event.status ?? null);
      return outcome;
    }
  }

  const { data: found } = await supabase
    .from('leads')
    .select('id, nome, unread_count, estagio, tipo, last_message_at, last_read_at')
    .in('telefone', phoneVariants(event.phone))
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Mídia sem orçamento: adia (entra na próxima passada), nunca grava a mensagem sem o arquivo por pressa.
  const needsMedia = event.messageType !== 'text' && Boolean(event.fileUrl || event.uazId);
  if (needsMedia && opts.mediaBudget && opts.mediaBudget.left <= 0) return 'deferred';

  let lead = found;
  let created = false;
  if (!lead) {
    // Número novo: tenta reconhecer equipe/cliente; o resto vai para a Triagem.
    const [{ data: users }, { data: clients }] = await Promise.all([
      supabase.from('users').select('id, phone').not('phone', 'is', null),
      supabase.from('clients').select('id, phone, whatsapp_financeiro'),
    ]);
    const kind = classifyPhone({ phone: event.phone, users: users ?? [], clients: clients ?? [] });
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome: (!event.fromMe && event.name) || event.phone,
        telefone: event.phone,
        origem: 'whatsapp',
        estagio: 'novo',
        tipo: kind.tipo,
        user_id: kind.user_id ?? null,
        client_id: kind.client_id ?? null,
        classificado_em: kind.tipo === 'triagem' ? null : new Date().toISOString(),
      })
      .select('id, nome, unread_count, estagio, tipo, last_message_at, last_read_at')
      .single();
    if (error) throw error;
    lead = data;
    created = true;
  }

  // Mídia: copia para o bucket (as URLs da UAZAPI expiram).
  let media: { url: string; mimetype: string; size: number } | null = null;
  if (needsMedia) {
    if (opts.mediaBudget) opts.mediaBudget.left -= 1;
    const source = event.fileUrl
      ? { url: event.fileUrl, mimetype: event.mimetype }
      : event.uazId
        ? await getProvider().downloadMedia(event.uazId)
        : null;
    if (source) media = await copyToBucket(supabase, source.url, lead.id, source.mimetype ?? event.mimetype, event.fileName);
  }

  const sentAt = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from('lead_messages')
    .insert({
      lead_id: lead.id,
      direction: event.fromMe ? 'out' : 'in',
      body: event.body,
      message_type: event.messageType,
      media_url: media?.url ?? null,
      media_mimetype: media?.mimetype ?? event.mimetype,
      media_name: event.fileName,
      media_seconds: event.seconds,
      media_size: media?.size ?? null,
      status: event.status ?? (event.fromMe ? 'sent' : 'delivered'),
      external_id: event.externalId,
      created_at: sentAt,
    })
    .select('id')
    .single();
  // 23505: o envio direto do sistema já gravou esta mensagem (corrida com o webhook).
  if (insertError) {
    if (insertError.code === '23505') return 'skipped';
    throw insertError;
  }

  if (event.fromMe && event.externalId) await resolveScheduled(supabase, event.externalId, lead.id, inserted?.id ?? null, event.status ?? null);

  // Em sincronização, só conta como "nova" a mensagem posterior à última leitura da conversa.
  const fresh = !opts.backfill || !lead.last_read_at || !event.timestamp || event.timestamp > Date.parse(lead.last_read_at);
  if (!event.fromMe && fresh) {
    // O lead respondeu: follow-ups pendentes perdem o sentido e a campanha conta uma resposta.
    await cancelFollowups(supabase, lead.id);
    await supabase.from('campaign_recipients').update({ status: 'replied' }).eq('lead_id', lead.id).eq('status', 'sent');
  }

  const silent = SILENT_TYPES.includes(lead.tipo);
  const newer = !lead.last_message_at || sentAt > lead.last_message_at;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (newer) {
    patch.last_message_at = sentAt;
    patch.last_message_preview = previewFor(event.messageType, event.body);
  }
  if (!event.fromMe && !silent && fresh) patch.unread_count = (lead.unread_count ?? 0) + 1;
  if (!event.fromMe && lead.tipo === 'lead' && fresh && ['novo', 'contatado'].includes(lead.estagio)) patch.estagio = 'conversando';
  await supabase.from('leads').update(patch).eq('id', lead.id);

  // Reabastece séries recorrentes deste lead (sem cron); falha aqui não derruba o processamento.
  await topUpSeries(supabase, { leadId: lead.id }).catch((err) => console.error('[prospeccao] topUpSeries:', err));

  if (created || lead.nome === event.phone) await enrichLeadFromWhatsApp(supabase, lead.id, event.phone, lead.nome);
  return 'inserted';
}

export interface SyncSummary {
  inserted: number;
  updated: number;
  deferred: number;
  scanned: number;
  hasMore: boolean;
}

/** Piso da sincronização: só mensagens de hoje em diante (configurável por WA_SYNC_SINCE). */
export function syncFloor(): Date {
  const raw = process.env.WA_SYNC_SINCE || '2026-10-09T00:00:00-03:00';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date('2026-10-09T00:00:00-03:00') : d;
}

/**
 * Completa o que o webhook não viu (inativo, falhou, enviado pelo celular ou por outra ferramenta):
 * lê o feed de todas as conversas, mais recente primeiro, até o piso, e grava o que falta.
 */
export async function syncRecent(supabase: SupabaseClient, opts: { since?: Date; maxMs?: number; mediaPerPass?: number } = {}): Promise<SyncSummary> {
  const since = opts.since ?? syncFloor();
  const deadline = Date.now() + (opts.maxMs ?? 45_000);
  const budget = { left: opts.mediaPerPass ?? 10 };
  const provider = getProvider();
  const summary: SyncSummary = { inserted: 0, updated: 0, deferred: 0, scanned: 0, hasMore: false };

  let offset = 0;
  for (;;) {
    const page = await provider.findMessages({ offset, limit: 100 });
    if (!page || !page.records.length) break;
    summary.scanned += page.records.length;

    // Do mais antigo para o mais novo dentro da página: ordem natural para última mensagem e não lidas.
    const events = page.records.map((r) => eventFromFindRecord(r, since)).filter((e): e is MessageEvent => e !== null).reverse();
    for (const event of events) {
      if (Date.now() > deadline) { summary.hasMore = true; return summary; }
      const outcome = await ingestMessage(supabase, event, { mediaBudget: budget, backfill: true });
      if (outcome === 'inserted') summary.inserted++;
      else if (outcome === 'updated') summary.updated++;
      else if (outcome === 'deferred') { summary.deferred++; summary.hasMore = true; }
    }

    const oldest = Math.min(...page.records.map((r) => (typeof r.messageTimestamp === 'number' ? r.messageTimestamp : Infinity)));
    if (!page.hasMore || oldest < since.getTime()) break;
    offset = page.nextOffset;
  }
  return summary;
}
