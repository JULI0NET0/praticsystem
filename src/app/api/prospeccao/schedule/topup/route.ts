import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { topUpSeries } from '@/lib/prospeccao/scheduleServer';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Chamado ao abrir a aba Agendadas: garante que as séries recorrentes tenham ocorrências à frente.
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;
  const created = await topUpSeries(getSupabaseAdmin());
  return NextResponse.json({ created });
}
