import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { cancelScheduled, createSchedule } from '@/lib/prospeccao/scheduleServer';
import type { ScheduledRecurrence } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Agenda uma mensagem (opcionalmente recorrente / follow-up) para um lead.
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const b = (await request.json().catch(() => ({}))) as {
    leadId?: string; body?: string; runAt?: string; recurrence?: ScheduledRecurrence | null;
    cancelOnReply?: boolean; kind?: 'single' | 'followup'; media?: { type: 'image' | 'video' | 'audio' | 'ptt' | 'document'; url: string; name?: string; mimetype?: string };
  };
  const runAt = b.runAt ? new Date(b.runAt) : null;
  const body = b.body?.trim() ?? '';
  if (!b.leadId || !runAt || Number.isNaN(runAt.getTime()) || (!body && !b.media)) {
    return NextResponse.json({ error: 'Informe o lead, a mensagem e a data.' }, { status: 400 });
  }
  if (runAt.getTime() < Date.now() + 60_000) return NextResponse.json({ error: 'Escolha um horário a partir de 1 minuto no futuro.' }, { status: 400 });
  if (b.media && !/^https:\/\//.test(b.media.url)) return NextResponse.json({ error: 'Mídia inválida.' }, { status: 400 });
  const rec = b.recurrence;
  if (rec && (!['daily', 'weekly', 'monthly'].includes(rec.freq) || !(rec.interval >= 1) || (!rec.until && !rec.count))) {
    return NextResponse.json({ error: 'Defina até quando a mensagem se repete.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from('leads').select('id, nome, empresa, telefone').eq('id', b.leadId).single();
  if (!lead?.telefone) return NextResponse.json({ error: 'Este lead não tem telefone.' }, { status: 400 });

  const { rows, failed } = await createSchedule({
    supabase,
    lead: { ...lead, telefone: lead.telefone },
    body,
    media: b.media,
    runAt,
    recurrence: rec,
    cancelOnReply: b.kind === 'followup' ? true : b.cancelOnReply,
    kind: b.kind ?? 'single',
    userId: auth.user.id,
  });
  if (!rows.length) return NextResponse.json({ error: 'O WhatsApp não aceitou o agendamento. Tente novamente.' }, { status: 502 });
  return NextResponse.json({ scheduled: rows, failed });
}

// Cancela um agendamento (scope "one") ou toda a série pendente (scope "series").
export async function DELETE(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { id, scope } = (await request.json().catch(() => ({}))) as { id?: string; scope?: 'one' | 'series' };
  if (!id) return NextResponse.json({ error: 'Agendamento obrigatório.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from('scheduled_messages').select('id, series_id, uazapi_folder_id, status').eq('id', id).single();
  if (!row) return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 });

  let targets = [row];
  if (scope === 'series' && row.series_id) {
    const { data } = await supabase.from('scheduled_messages').select('id, series_id, uazapi_folder_id, status').eq('series_id', row.series_id).eq('status', 'pending');
    targets = data ?? [];
  }
  targets = targets.filter((t) => t.status === 'pending');
  const canceled = await cancelScheduled(supabase, targets);
  return NextResponse.json({ canceled });
}
