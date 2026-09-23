import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { chatWithGroq, isGroqConfigured, type GroqChatMessage } from '@/lib/groq';

export const runtime = 'nodejs';
export const maxDuration = 120;

type Provider = 'hermes' | 'groq';

const MAX_MENSAGENS = 30;
const MAX_CARACTERES = 8000;

const SISTEMA =
  'Você é o Kevin, um ursinho que é o assistente de suporte interno da Pratic, uma agência de conteúdo. ' +
  'Responda em português do Brasil, de forma curta e prática, para membros do time. Use listas quando ajudar. ' +
  'Se não souber um dado específico de cliente, diga isso e indique onde procurar no sistema (Demandas, Agenda, Clientes).';

/**
 * Chat do Kevin (/admin/suporte). Usa o agente HERMES quando
 * HERMES_AGENT_URL estiver configurado (endpoint OpenAI-compatible) e cai
 * no Groq caso contrário — ou se o HERMES estiver fora do ar.
 */
function hermesUrl(): string {
  return (process.env.HERMES_AGENT_URL || '').trim().replace(/\/$/, '');
}

function providerAtivo(): Provider | null {
  if (hermesUrl()) return 'hermes';
  if (isGroqConfigured()) return 'groq';
  return null;
}

async function requireTeamUser(request: Request): Promise<NextResponse | null> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  return null;
}

async function perguntarHermes(messages: GroqChatMessage[]): Promise<string> {
  const token = (process.env.HERMES_AGENT_TOKEN || '').trim();
  const res = await fetch(`${hermesUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: process.env.HERMES_AGENT_MODEL || 'hermes-agent',
      messages: [{ role: 'system', content: SISTEMA }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`HERMES respondeu HTTP ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('HERMES não retornou conteúdo na resposta.');
  return content;
}

function lerMensagens(body: unknown): GroqChatMessage[] | null {
  const lista = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const msgs: GroqChatMessage[] = [];
  for (const m of lista.slice(-MAX_MENSAGENS)) {
    const { role, content } = (m || {}) as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) return null;
    msgs.push({ role, content: content.slice(0, MAX_CARACTERES) });
  }
  if (msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

export async function GET(request: Request) {
  const authError = await requireTeamUser(request);
  if (authError) return authError;
  return NextResponse.json({ provider: providerAtivo() });
}

export async function POST(request: Request) {
  const authError = await requireTeamUser(request);
  if (authError) return authError;

  const messages = lerMensagens(await request.json().catch(() => null));
  if (!messages) {
    return NextResponse.json({ error: 'messages inválido.' }, { status: 400 });
  }

  const provider = providerAtivo();
  if (!provider) {
    return NextResponse.json({ error: 'Nenhum agente configurado (HERMES_AGENT_URL ou GROQ_API_KEY).' }, { status: 503 });
  }

  try {
    if (provider === 'hermes') {
      try {
        return NextResponse.json({ reply: await perguntarHermes(messages), provider: 'hermes' });
      } catch (err) {
        if (!isGroqConfigured()) throw err;
        console.error('[suporte/chat] HERMES falhou, usando Groq:', err);
      }
    }
    return NextResponse.json({ reply: await chatWithGroq(SISTEMA, messages), provider: 'groq' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao falar com o agente.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
