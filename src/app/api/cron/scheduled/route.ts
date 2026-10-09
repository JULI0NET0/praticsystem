import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { createSchedule } from '@/lib/prospeccao/scheduleServer';
import { nextOccurrence } from '@/lib/prospeccao/schedule';
import type { ScheduledMessage } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Cron diário: (1) reabastece séries recorrentes, (2) marca como falhas as agendadas que passaram
// do horário sem confirmação e (3) encerra campanhas sem destinatários pendentes.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || request.headers.get('authorization') !== expected) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const report = { toppedUp: 0, expired: 0, campaignsDone: 0 };

  // 2) vencidas há mais de 1 hora sem o webhook confirmar o envio
  const cutoff = new Date(now.getTime() - 60 * 60_000).toISOString();
  const { data: overdue } = await supabase.from('scheduled_messages').update({ status: 'failed', error: 'Sem confirmação de envio', updated_at: now.toISOString() }).eq('status', 'pending').lt('run_at', cutoff).select('id');
  report.expired = overdue?.length ?? 0;

  // 1) séries recorrentes com poucas ocorrências pendentes
  const { data: seriesRows } = await supabase.from('scheduled_messages').select('*').not('series_id', 'is', null).not('recurrence', 'is', null).order('run_at', { ascending: false });
  const bySeries = new Map<string, ScheduledMessage[]>();
  for (const r of (seriesRows ?? []) as ScheduledMessage[]) bySeries.set(r.series_id!, [...(bySeries.get(r.series_id!) ?? []), r]);
  for (const [seriesId, rows] of bySeries) {
    const pending = rows.filter((r) => r.status === 'pending').length;
    if (pending >= 3) continue;
    const last = rows[0]; // mais recente
    const { data: lead } = await supabase.from('leads').select('id, nome, empresa, telefone').eq('id', last.lead_id).single();
    if (!lead?.telefone) continue;
    const next = nextOccurrence(new Date(last.run_at), last.recurrence!);
    const { rows: created } = await createSchedule({
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
    report.toppedUp += created.length;
  }

  // 3) campanhas sem pendentes e com agendamentos todos resolvidos
  const { data: running } = await supabase.from('campaigns').select('id').in('status', ['scheduled', 'running']);
  for (const c of running ?? []) {
    const { count } = await supabase.from('scheduled_messages').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'pending');
    if (!count) {
      await supabase.from('campaigns').update({ status: 'done', updated_at: now.toISOString() }).eq('id', c.id);
      report.campaignsDone++;
    }
  }
  return NextResponse.json({ ok: true, ...report });
}
