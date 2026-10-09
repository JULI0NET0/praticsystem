import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { enrichLeadFromWhatsApp } from '@/lib/prospeccao/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Atualiza nome, foto e dados do contato do lead direto do WhatsApp.
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { leadId } = (await request.json().catch(() => ({}))) as { leadId?: string };
  if (!leadId) return NextResponse.json({ error: 'Lead obrigatório.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from('leads').select('id, nome, telefone').eq('id', leadId).single();
  if (!lead?.telefone) return NextResponse.json({ error: 'Lead sem telefone.' }, { status: 400 });

  const updated = await enrichLeadFromWhatsApp(supabase, lead.id, lead.telefone, lead.nome);
  if (!updated) return NextResponse.json({ error: 'Não foi possível consultar o WhatsApp agora.' }, { status: 502 });
  return NextResponse.json({ lead: updated });
}
