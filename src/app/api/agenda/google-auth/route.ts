import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, GoogleAccount, isOAuthConfigured } from '@/lib/googleCalendar';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const account = (searchParams.get('account') as GoogleAccount) || 'agenciapratic';

    if (!isOAuthConfigured()) {
      return NextResponse.json(
        {
          error: 'GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET precisam estar configurados no arquivo .env.local',
        },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${protocol}://${host}/api/agenda/google-auth/callback`;

    const authUrl = getGoogleAuthUrl(account, redirectUri);

    // Se a requisição veio diretamente do navegador (navegação padrão), redireciona
    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ url: authUrl });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao iniciar autenticação';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
