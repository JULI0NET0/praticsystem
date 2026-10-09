import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { parseIncomingMessage, parseUazapiEvent, type UazapiEvent } from '@/lib/prospeccao/webhook';
import { applyStatus, ingestMessage } from '@/lib/prospeccao/ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    if (event.kind === 'status') await applyStatus(supabase, event.messageIds, event.state);
    else await ingestMessage(supabase, event);
  } catch (err) {
    console.error('[prospeccao] webhook:', err);
    return NextResponse.json({ error: 'Falha ao processar.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
