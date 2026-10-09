import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { getProvider, type OutboundMediaType } from '@/lib/whatsapp/provider';
import { enrichLeadFromWhatsApp, previewFor } from '@/lib/prospeccao/server';
import { phoneVariants } from '@/lib/prospeccao/leads';
import type { MediaKind } from '@/lib/prospeccao/webhook';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface MediaInput {
  type: OutboundMediaType;
  url: string;
  name?: string;
  mimetype?: string;
  seconds?: number;
}

const KIND_BY_TYPE: Record<OutboundMediaType, MediaKind> = { image: 'image', video: 'video', audio: 'audio', ptt: 'audio', document: 'document' };

export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { leadId, body, media } = (await request.json().catch(() => ({}))) as { leadId?: string; body?: string; media?: MediaInput };
  const text = body?.trim() ?? '';
  if (!leadId || (!text && !media)) return NextResponse.json({ error: 'Lead e mensagem são obrigatórios.' }, { status: 400 });
  if (media && !/^https:\/\//.test(media.url)) return NextResponse.json({ error: 'Mídia inválida.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from('leads').select('id, nome, telefone, estagio, wa_avatar_url').eq('id', leadId).single();
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  if (!lead.telefone) return NextResponse.json({ error: 'Este lead não tem telefone.' }, { status: 400 });

  const provider = getProvider();
  const sendTo = (phone: string) =>
    media
      ? provider.sendMedia(phone, { type: media.type, file: media.url, caption: text || undefined, docName: media.name })
      : provider.send(phone, text);

  let result = await sendTo(lead.telefone);
  // Celular com/sem o 9º dígito: se o WhatsApp recusar, tenta a forma alternativa uma vez.
  const alt = phoneVariants(lead.telefone).find((v) => v !== lead.telefone);
  if (result.status === 'failed' && alt) {
    const retry = await sendTo(alt);
    if (retry.status !== 'failed') {
      result = retry;
      await supabase.from('leads').update({ telefone: alt }).eq('id', lead.id);
    }
  }

  const kind: MediaKind = media ? KIND_BY_TYPE[media.type] : 'text';
  const { data: message, error } = await supabase
    .from('lead_messages')
    .insert({
      lead_id: lead.id,
      direction: 'out',
      body: text,
      message_type: kind,
      media_url: media?.url ?? null,
      media_mimetype: media?.mimetype ?? null,
      media_name: media?.name ?? null,
      media_seconds: media?.seconds ?? null,
      status: result.status,
      external_id: result.externalId ?? null,
      sender_id: auth.user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (result.status !== 'failed') {
    await supabase
      .from('leads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: previewFor(kind, text),
        estagio: lead.estagio === 'novo' ? 'contatado' : lead.estagio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);
    if (!lead.wa_avatar_url) await enrichLeadFromWhatsApp(supabase, lead.id, lead.telefone, lead.nome);
  }

  if (result.status === 'failed') {
    return NextResponse.json({ message, error: result.error || 'O WhatsApp não aceitou o envio.' }, { status: 502 });
  }
  return NextResponse.json({ message });
}
