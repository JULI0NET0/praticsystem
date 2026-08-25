import { OrganizeMode } from './organizeModes';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY || '').trim();
}

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

/**
 * Transcreve um áudio hospedado numa URL (signed URL do Supabase Storage)
 * usando o Whisper da Groq. O endpoint aceita `url` como alternativa a
 * enviar o arquivo em multipart, então os bytes do áudio nunca passam por
 * esta rota/servidor.
 *
 * Observação importante: a API de transcrição da Groq NÃO faz diarização
 * (não identifica quem fala cada trecho) — devolve só o texto corrido. Por
 * isso o prompt de organização (organizeTranscript) não tenta separar por
 * "Speaker 1/2/3", só cita nomes quando eles aparecem de fato na fala.
 */
export async function transcribeAudioFromUrl(audioUrl: string, opts?: { language?: string }): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não está configurado nas variáveis de ambiente.');
  }

  const form = new FormData();
  form.append('url', audioUrl);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'text');
  form.append('temperature', '0');
  if (opts?.language) form.append('language', opts.language);

  const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq transcription error ${res.status}: ${body}`);
  }

  return (await res.text()).trim();
}

// A transcrição vem sem diarização (a Groq não identifica quem fala cada
// trecho — ver observação em transcribeAudioFromUrl), então todo prompt de
// organização precisa dessa mesma ressalva: nunca inventar "Speaker 1/2/3",
// só citar nome quando ele aparecer de fato na fala.
const NO_DIARIZATION_NOTE = `A transcrição fornecida é texto corrido, sem identificação de quem fala cada trecho (o serviço de transcrição não faz diarização por áudio). Por isso: NUNCA invente ou atribua falas a "Speaker 1", "Speaker 2" etc. Só cite um participante pelo nome se esse nome for mencionado explicitamente na transcrição (por exemplo, alguém se apresentando ou sendo chamado pelo nome).`;

const ORGANIZE_PROMPTS: Record<OrganizeMode, string> = {
  reuniao: `Você é um assistente que transforma a transcrição bruta de uma reunião em notas organizadas, seguindo EXATAMENTE o formato abaixo.

${NO_DIARIZATION_NOTE}

Formato de saída (100% em Markdown):

## 1. Título da Reunião
Título curto, claro e objetivo que resuma o foco central da reunião.

## 2. Sumário Geral
Um parágrafo explicando o tema principal, contexto e propósito da reunião.

## 3. Participantes Mencionados
Liste os nomes citados explicitamente na transcrição, com o papel/contexto SE isso puder ser inferido do que foi dito (sem inventar). Se nenhum nome for mencionado, escreva: "Não foi possível identificar os participantes pelo nome nesta transcrição."

## 4. Assuntos por Tópicos
Organize toda a reunião em tópicos claros, em ordem cronológica, usando subtítulos e listas. Agrupe falas, decisões e ideias relacionadas. Seja extremamente organizado.

## 5. Principais Insights
Liste entre 5 e 12 insights essenciais e objetivos — aprendizados, decisões e direções estratégicas da reunião.

## 6. Tarefas (To-Dos)
Identifique todas as tarefas mencionadas (explícitas, implícitas, decisões que geram ação, próximos passos). Para cada uma, use exatamente este formato:

- [ ] **Tarefa:** descrição clara e objetiva
      **Observações:** pontos relevantes ou dependências (se houver)

## 7. Resumo Final (Executivo)
Resumo direto e estratégico, entre 4 e 7 linhas, pronto para enviar à equipe.

IMPORTANTE:
- O resultado final deve ser entregue 100% em Markdown.
- Não invente nomes, fatos ou dados que não estejam na transcrição.
- Priorize clareza, organização e precisão.
- Foque em insights, decisões e to-dos — seja um tomador de pauta profissional.`,

  resumido: `Você é um assistente que resume reuniões de forma objetiva e direta, sem se alongar.

${NO_DIARIZATION_NOTE}

Formato de saída (100% em Markdown), curto:

## Título
Título curto e objetivo da reunião.

## Resumo
Um parágrafo de 3 a 5 linhas com o essencial: contexto, principais pontos discutidos e decisões.

## Tarefas
- [ ] **Tarefa:** descrição objetiva (liste só se houver tarefas claras na transcrição)

IMPORTANTE: seja breve, não repita a transcrição literalmente, não invente nomes, fatos ou dados.`,

  resumo: `Você é um assistente que resume transcrições de reunião em um resumo corrido, sem dividir em seções ou listas.

${NO_DIARIZATION_NOTE}

Formato de saída (100% em Markdown):

## Título
Título curto e objetivo da reunião.

Logo abaixo, um resumo de 5 a 10 linhas em texto corrido (sem bullets, sem subtítulos) cobrindo o que foi discutido e as decisões tomadas.

IMPORTANTE: não invente nomes, fatos ou dados que não estejam na transcrição.`,

  topicos: `Você é um assistente que transforma transcrições de reunião em anotações rápidas, em formato de tópicos.

${NO_DIARIZATION_NOTE}

Formato de saída (100% em Markdown):

## Título
Título curto e objetivo da reunião.

## Tópicos
- Cada bullet é uma ideia, assunto ou decisão só — uma linha, direto ao ponto.
- Sem parágrafos, sem explicações longas.
- Marque como tarefa ("- [ ] ...") os bullets que forem uma ação/próximo passo claro.

IMPORTANTE: seja telegráfico. Não invente nomes, fatos ou dados que não estejam na transcrição.`,
};

const MAX_RATE_LIMIT_RETRIES = 6;
const DEFAULT_RETRY_WAIT_SECONDS = 12;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// A Groq devolve o tempo de espera sugerido na própria mensagem de erro,
// ex: "Please try again in 7.59s". Sem isso, usa um valor conservador fixo.
function parseRetryAfterSeconds(errorBody: string): number {
  const match = errorBody.match(/try again in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1])) + 1; // +1s de margem
  return DEFAULT_RETRY_WAIT_SECONDS;
}

async function callGroqChat(systemPrompt: string, userContent: string, attempt = 0): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY não está configurado nas variáveis de ambiente.');
  }

  const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  // Tier gratuito da Groq: 8.000 tokens/minuto por modelo. Reuniões longas
  // exigem várias chamadas em sequência (condensação em pedaços) que podem
  // estourar essa janela — em vez de falhar, espera o tempo sugerido pela
  // própria Groq e tenta de novo.
  if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    const body = await res.text().catch(() => '');
    await sleep(parseRetryAfterSeconds(body) * 1000);
    return callGroqChat(systemPrompt, userContent, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq chat completion error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq não retornou conteúdo na resposta.');
  }
  return content;
}

// Limite conservador de caracteres por request — a Groq rejeita requests
// grandes (413 "request_too_large") bem antes do tamanho de contexto do
// modelo em si, então transcrições de reuniões longas precisam ser
// resumidas em pedaços antes de virar o documento final.
const CHUNK_SIZE_CHARS = 6000;

function splitIntoChunks(text: string, size = CHUNK_SIZE_CHARS): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

const CHUNK_EXTRACT_SYSTEM_PROMPT = `Você está lendo um TRECHO de uma transcrição bruta de reunião (parte de um texto maior, cortado no meio). Extraia, em português, só os pontos relevantes deste trecho: assuntos discutidos, decisões tomadas, tarefas/próximos passos mencionados, e nomes de participantes citados explicitamente (sem inventar nada que não esteja no texto). Seja conciso — bullet points curtos. Isto é um resumo intermediário, não o documento final.`;

/**
 * Reduz recursivamente um texto grande demais pra caber num único request
 * da Groq: divide em pedaços, extrai os pontos-chave de cada um, junta os
 * resumos e repete até caber. Na prática 1-2 rodadas bastam pra qualquer
 * reunião de duração normal.
 */
async function condenseIfNeeded(text: string, depth = 0): Promise<string> {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 1 || depth >= 3) return text;

  const partials: string[] = [];
  for (const chunk of chunks) {
    partials.push(await callGroqChat(CHUNK_EXTRACT_SYSTEM_PROMPT, `Trecho da transcrição:\n\n${chunk}`));
  }
  return condenseIfNeeded(partials.join('\n\n'), depth + 1);
}

/**
 * Organiza uma transcrição bruta em notas estruturadas (Markdown), usando um
 * modelo hospedado na Groq. `mode` escolhe o estilo de saída (reunião
 * detalhada, resumida, só resumo ou tópicos — ver organizeModes.ts). Pode
 * ser chamada mais de uma vez sobre a mesma transcrição (reprocessamento,
 * inclusive trocando de modo) sem custo de re-transcrição.
 */
export async function organizeTranscript(transcript: string, mode: OrganizeMode = 'reuniao'): Promise<string> {
  const condensed = await condenseIfNeeded(transcript);
  const systemPrompt = ORGANIZE_PROMPTS[mode] ?? ORGANIZE_PROMPTS.reuniao;
  return callGroqChat(systemPrompt, `Transcrição bruta da reunião:\n\n${condensed}`);
}
