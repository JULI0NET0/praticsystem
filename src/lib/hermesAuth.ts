import { NextResponse } from 'next/server';

/**
 * Autentica requisições do Hermes Agent via header `Authorization: Bearer <HERMES_API_KEY>`.
 * Retorna uma resposta de erro pronta para devolver ao caller, ou `null` se autenticado.
 */
export function authenticateHermes(request: Request): NextResponse | null {
  const expectedKey = process.env.HERMES_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'Integração Hermes não configurada (HERMES_API_KEY ausente no ambiente).' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token || token !== expectedKey) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  return null;
}
