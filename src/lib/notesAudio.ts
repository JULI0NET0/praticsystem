import { supabase } from '@/lib/supabase';
import { prepareAudioChunks } from '@/lib/audioChunking';

const AUDIO_BUCKET = 'notes-audio';
const SIGNED_URL_TTL_SECONDS = 600; // 10 min — tempo pra Groq buscar o arquivo

export async function uploadMeetingAudio(blob: Blob, userId: string, filename: string): Promise<{ path: string; signedUrl: string }> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: signError } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError || !data) throw signError ?? new Error('Falha ao gerar URL assinada do áudio.');

  return { path, signedUrl: data.signedUrl };
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const res = await fetch('/api/notas/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha na transcrição do áudio.');
  return data.transcript as string;
}

/**
 * A API da Groq tem limite de tamanho por arquivo (25MB no tier gratuito).
 * Pra não depender do usuário comprimir o áudio manualmente, o arquivo é
 * reamostrado pra 16kHz mono no navegador e dividido em pedaços dentro do
 * limite (ver audioChunking.ts) — cada pedaço é enviado e transcrito
 * separadamente, e os textos são concatenados na ordem original.
 */
export async function transcribeMeetingAudio(
  file: File,
  userId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  let chunks: { blob: Blob; index: number }[];
  try {
    chunks = await prepareAudioChunks(file);
  } catch (err) {
    console.error('Falha ao processar áudio no navegador, enviando arquivo original sem dividir:', err);
    chunks = [{ blob: file, index: 0 }];
  }

  const transcripts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length);
    const ext = chunks[i].blob === file ? (file.name.split('.').pop() || 'audio') : 'wav';
    const { signedUrl } = await uploadMeetingAudio(chunks[i].blob, userId, `parte-${i + 1}.${ext}`);
    const text = await transcribeAudio(signedUrl);
    transcripts.push(text);
  }
  return transcripts.join('\n\n');
}

/**
 * O prompt de organização sempre abre com um heading "## 1. Título da
 * Reunião" seguido, na linha (não-vazia) seguinte, pelo título de fato.
 * Extrai esse título pra usar como notes.title; retorna '' se não achar.
 */
export function extractMeetingTitleFromMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const headingIdx = lines.findIndex(l => /^#{1,3}\s+/.test(l.trim()));
  if (headingIdx === -1) return '';
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^#{1,3}\s+/.test(line)) break;
    return line.replace(/[*_`]/g, '').trim();
  }
  return '';
}

export async function organizeMeetingNotes(transcript: string): Promise<string> {
  const res = await fetch('/api/notas/organize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao organizar as notas.');
  return data.markdown as string;
}
