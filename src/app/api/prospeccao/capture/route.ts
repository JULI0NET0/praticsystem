import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { normalizePhone, phoneVariants } from '@/lib/prospeccao/leads';

// Captura pública (bio/landing pages). Honeypot em `website` e limite simples por IP.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 5;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) return NextResponse.json({ error: 'Muitas tentativas.' }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const nome = typeof body.nome === 'string' ? body.nome.trim().slice(0, 120) : '';
  const telefone = normalizePhone(typeof body.telefone === 'string' ? body.telefone : null);
  if (!nome || !telefone) return NextResponse.json({ error: 'Informe nome e WhatsApp válidos.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from('leads').select('id').in('telefone', phoneVariants(telefone)).limit(1).maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  const { error } = await supabase.from('leads').insert({
    nome,
    telefone,
    empresa: typeof body.empresa === 'string' ? body.empresa.slice(0, 120) : null,
    servico_interesse: typeof body.servico === 'string' ? body.servico.slice(0, 120) : null,
    origem: 'site',
  });
  if (error) return NextResponse.json({ error: 'Não foi possível registrar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
