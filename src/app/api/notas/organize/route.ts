import { NextRequest, NextResponse } from 'next/server';
import { organizeTranscript, isGroqConfigured } from '@/lib/groq';
import { isOrganizeMode, DEFAULT_ORGANIZE_MODE } from '@/lib/organizeModes';

export const runtime = 'nodejs';
// Reuniões longas viram várias chamadas sequenciais à Groq (condensação em
// pedaços + organização final), cada uma podendo esperar e tentar de novo
// se bater no limite de 8.000 tokens/minuto do tier gratuito — precisa de
// bem mais margem que uma chamada só.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    if (!isGroqConfigured()) {
      return NextResponse.json({ error: 'Organização por IA não configurada (GROQ_API_KEY ausente).' }, { status: 503 });
    }

    const { transcript, mode } = await req.json();
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'transcript é obrigatório.' }, { status: 400 });
    }

    const markdown = await organizeTranscript(transcript, isOrganizeMode(mode) ? mode : DEFAULT_ORGANIZE_MODE);
    return NextResponse.json({ markdown });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
