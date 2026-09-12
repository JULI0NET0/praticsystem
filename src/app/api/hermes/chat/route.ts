import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';
import { listChatMessages, sendChatMessage } from '@/lib/hermesTools';

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') ?? undefined;
  const with_user_id = searchParams.get('with_user_id') ?? undefined;
  const limit = Number(searchParams.get('limit')) || undefined;

  try {
    const messages = await listChatMessages({ channel, with_user_id, limit });
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar mensagens do chat.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const { channel, content, receiver_id } = body || {};

  if (!content) {
    return NextResponse.json({ error: 'content é obrigatório.' }, { status: 400 });
  }

  try {
    const message = await sendChatMessage({ channel, content, receiver_id });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Erro ao enviar mensagem no chat.';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
