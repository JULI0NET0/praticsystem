import type { SupabaseClient } from '@supabase/supabase-js';
import { getProvider, type OutboundMediaType } from '@/lib/whatsapp/provider';
import { expandOccurrences, MAX_AHEAD, nextOccurrence } from './schedule';
import { interpolate } from './leads';
import type { ScheduledMessage, ScheduledRecurrence } from '@/types/database';

export interface CreateScheduleInput {
  supabase: SupabaseClient;
  lead: { id: string; nome: string; empresa?: string | null; telefone: string };
  body: string;
  media?: { type: OutboundMediaType; url: string; name?: string; mimetype?: string; seconds?: number } | null;
  runAt: Date;
  recurrence?: ScheduledRecurrence | null;
  cancelOnReply?: boolean;
  kind?: 'single' | 'followup' | 'campaign';
  userId?: string | null;
  seriesId?: string;
  alreadyCreated?: number;
}

/**
 * Cria as ocorrências (a recorrência é materializada até MAX_AHEAD à frente) e agenda cada uma
 * no provedor. Cada ocorrência é independente: cancelar uma não afeta as outras.
 */
export async function createSchedule(input: CreateScheduleInput): Promise<{ rows: ScheduledMessage[]; failed: number }> {
  const { supabase, lead, body, media, recurrence, cancelOnReply, kind = 'single', userId } = input;
  const seriesId = input.seriesId ?? (recurrence ? crypto.randomUUID() : undefined);
  const dates = expandOccurrences(input.runAt, recurrence, { alreadyCreated: input.alreadyCreated, max: MAX_AHEAD });
  const provider = getProvider();
  const text = interpolate(body, lead);
  const rows: ScheduledMessage[] = [];
  let failed = 0;

  for (const runAt of dates) {
    const scheduled = await provider.schedule(
      [{ phone: lead.telefone, text: text || undefined, media: media ? { type: media.type, file: media.url, docName: media.name } : undefined }],
      runAt,
      { info: `${kind}:${lead.nome}` }
    );
    if (!scheduled) { failed++; continue; }
    const { data, error } = await supabase
      .from('scheduled_messages')
      .insert({
        lead_id: lead.id,
        body,
        media: media ?? null,
        run_at: runAt.toISOString(),
        kind,
        cancel_on_reply: Boolean(cancelOnReply),
        recurrence: recurrence ?? null,
        series_id: seriesId ?? null,
        uazapi_folder_id: scheduled.folderId,
        external_id: scheduled.messageIds[lead.telefone] ?? null,
        created_by: userId ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      await provider.cancelSchedule(scheduled.folderId);
      failed++;
      continue;
    }
    rows.push(data as ScheduledMessage);
  }
  return { rows, failed };
}

/** Cancela no provedor e marca como cancelada. Devolve quantas foram canceladas. */
export async function cancelScheduled(supabase: SupabaseClient, rows: Pick<ScheduledMessage, 'id' | 'uazapi_folder_id'>[]): Promise<number> {
  const provider = getProvider();
  let n = 0;
  for (const row of rows) {
    if (row.uazapi_folder_id) await provider.cancelSchedule(row.uazapi_folder_id);
    const { error } = await supabase.from('scheduled_messages').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', row.id);
    if (!error) n++;
  }
  return n;
}

/** Follow-ups pendentes de um lead que respondeu deixam de fazer sentido. */
export async function cancelFollowups(supabase: SupabaseClient, leadId: string): Promise<number> {
  const { data } = await supabase
    .from('scheduled_messages')
    .select('id, uazapi_folder_id')
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .eq('cancel_on_reply', true);
  return data?.length ? cancelScheduled(supabase, data) : 0;
}

/**
 * Reabastece séries recorrentes que ficaram com menos de 3 ocorrências pendentes.
 * Roda sob demanda (webhook e aba Agendadas), sem cron; `leadId` restringe a um lead.
 */
export async function topUpSeries(supabase: SupabaseClient, opts: { leadId?: string } = {}): Promise<number> {
  let query = supabase
    .from('scheduled_messages')
    .select('*')
    .not('series_id', 'is', null)
    .not('recurrence', 'is', null)
    .order('run_at', { ascending: false });
  if (opts.leadId) query = query.eq('lead_id', opts.leadId);
  const { data } = await query;

  const bySeries = new Map<string, ScheduledMessage[]>();
  for (const r of (data ?? []) as ScheduledMessage[]) bySeries.set(r.series_id!, [...(bySeries.get(r.series_id!) ?? []), r]);

  let created = 0;
  for (const [seriesId, rows] of bySeries) {
    if (rows.filter((r) => r.status === 'pending').length >= 3) continue;
    if (rows.every((r) => r.status === 'canceled')) continue; // série cancelada: não renasce
    const last = rows[0]; // a mais recente
    if (last.status === 'canceled') continue;
    const { data: lead } = await supabase.from('leads').select('id, nome, empresa, telefone').eq('id', last.lead_id).single();
    if (!lead?.telefone) continue;
    const next = nextOccurrence(new Date(last.run_at), last.recurrence!);
    if (next.getTime() < Date.now() + 60_000) continue; // série parada há muito tempo: não dispara atrasado
    const { rows: made } = await createSchedule({
      supabase,
      lead: { ...lead, telefone: lead.telefone },
      body: last.body,
      media: last.media ?? undefined,
      runAt: next,
      recurrence: last.recurrence,
      cancelOnReply: last.cancel_on_reply,
      kind: last.kind,
      userId: last.created_by,
      seriesId,
      alreadyCreated: rows.filter((r) => r.status !== 'canceled').length,
    });
    created += made.length;
  }
  return created;
}
