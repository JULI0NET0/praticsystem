import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { configureUazapiWebhook, uazapiConfig } from '@/lib/whatsapp/uazapi';

// Registra na UAZAPI a URL pública do webhook. Body: { baseUrl: "https://seu-dominio.com" }
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;
  if (!uazapiConfig().ready) return NextResponse.json({ error: 'Configure UAZAPI_BASE_URL e UAZAPI_TOKEN.' }, { status: 400 });
  const secret = process.env.WA_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Configure WA_WEBHOOK_SECRET.' }, { status: 400 });

  const { baseUrl } = (await request.json().catch(() => ({}))) as { baseUrl?: string };
  if (!baseUrl?.startsWith('https://')) return NextResponse.json({ error: 'Informe a URL pública (https) do sistema.' }, { status: 400 });

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/api/prospeccao/webhook/whatsapp?secret=${encodeURIComponent(secret)}`;
    await configureUazapiWebhook(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Falha ao configurar.' }, { status: 502 });
  }
}
