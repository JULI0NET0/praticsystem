import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { syncRecent } from '@/lib/prospeccao/ingest';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Evita rodadas simultâneas/repetidas (várias abas abertas) na mesma instância.
let running = false;
let lastRun = 0;
let lastSummary: unknown = null;

// Completa mensagens de hoje que o webhook não viu (inclusive as enviadas direto pelo celular).
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  if (running || Date.now() - lastRun < 20_000) return NextResponse.json({ throttled: true, summary: lastSummary });
  running = true;
  try {
    const summary = await syncRecent(getSupabaseAdmin());
    lastSummary = summary;
    lastRun = Date.now();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('[prospeccao] sync:', err);
    return NextResponse.json({ error: 'Falha ao sincronizar.' }, { status: 500 });
  } finally {
    running = false;
  }
}
