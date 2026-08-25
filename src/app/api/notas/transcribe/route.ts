import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioFromUrl, isGroqConfigured } from '@/lib/groq';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!isGroqConfigured()) {
      return NextResponse.json({ error: 'Transcrição por IA não configurada (GROQ_API_KEY ausente).' }, { status: 503 });
    }

    const { audioUrl } = await req.json();
    if (!audioUrl || typeof audioUrl !== 'string') {
      return NextResponse.json({ error: 'audioUrl é obrigatório.' }, { status: 400 });
    }

    const transcript = await transcribeAudioFromUrl(audioUrl, { language: 'pt' });
    return NextResponse.json({ transcript });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
