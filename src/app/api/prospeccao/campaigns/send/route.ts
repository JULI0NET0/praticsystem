import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { getProvider } from '@/lib/whatsapp/provider';
import { interpolate } from '@/lib/prospeccao/leads';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_RECIPIENTS = 300;

// Dispara (agora ou agendada) uma campanha: cada destinatário recebe a mensagem personalizada,
// com intervalo aleatório entre envios para reduzir o risco de bloqueio.
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { campaignId, runAt: runAtRaw, delayMin = 20, delayMax = 60 } = (await request.json().catch(() => ({}))) as {
    campaignId?: string; runAt?: string; delayMin?: number; delayMax?: number;
  };
  if (!campaignId) return NextResponse.json({ error: 'Campanha obrigatória.' }, { status: 400 });
  const min = Math.max(5, Math.min(delayMin, 600));
  const max = Math.max(min, Math.min(delayMax, 900));

  const supabase = getSupabaseAdmin();
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  if (campaign.status !== 'draft') return NextResponse.json({ error: 'Esta campanha já foi disparada.' }, { status: 409 });

  const runAt = runAtRaw ? new Date(runAtRaw) : new Date(Date.now() + 90_000);
  if (Number.isNaN(runAt.getTime()) || runAt.getTime() < Date.now() + 60_000) {
    return NextResponse.json({ error: 'Escolha um horário a partir de 1 minuto no futuro.' }, { status: 400 });
  }

  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('id, lead_id, leads(id, nome, empresa, telefone, tipo)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');
  type Row = { id: string; lead_id: string; leads: { id: string; nome: string; empresa: string | null; telefone: string | null; tipo: string } | { id: string; nome: string; empresa: string | null; telefone: string | null; tipo: string }[] | null };
  const targets = ((recipients ?? []) as Row[])
    .map((r) => ({ id: r.id, lead: Array.isArray(r.leads) ? r.leads[0] : r.leads }))
    .filter((r) => r.lead?.telefone && r.lead.tipo === 'lead')
    .slice(0, MAX_RECIPIENTS);
  if (!targets.length) return NextResponse.json({ error: 'Nenhum destinatário com WhatsApp neste público.' }, { status: 400 });

  const provider = getProvider();
  const scheduled = await provider.schedule(
    targets.map((t) => ({ phone: t.lead!.telefone!, text: interpolate(campaign.template, { nome: t.lead!.nome, empresa: t.lead!.empresa }) })),
    runAt,
    { delayMin: min, delayMax: max, info: `campanha:${campaign.nome}` }
  );
  if (!scheduled) return NextResponse.json({ error: 'O WhatsApp não aceitou a campanha. Tente novamente.' }, { status: 502 });

  await supabase.from('scheduled_messages').insert(
    targets.map((t) => ({
      lead_id: t.lead!.id,
      body: campaign.template,
      run_at: runAt.toISOString(),
      kind: 'campaign',
      campaign_id: campaignId,
      uazapi_folder_id: scheduled.folderId,
      external_id: scheduled.messageIds[t.lead!.telefone!] ?? null,
      created_by: auth.user.id,
    }))
  );
  await supabase.from('campaigns').update({ status: 'scheduled', agendada_para: runAt.toISOString(), updated_at: new Date().toISOString() }).eq('id', campaignId);
  return NextResponse.json({ ok: true, recipients: targets.length, runAt: runAt.toISOString() });
}
