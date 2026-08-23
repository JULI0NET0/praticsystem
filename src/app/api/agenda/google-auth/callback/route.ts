import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleAuthCode } from '@/lib/googleCalendar';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'agenciapratic';
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(renderHtmlError(`O Google retornou o seguinte erro: ${error}`), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (!code) {
      return new NextResponse(renderHtmlError('Código de autorização não fornecido pelo Google.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = `${protocol}://${host}/api/agenda/google-auth/callback`;

    const tokenData = await exchangeGoogleAuthCode(code, redirectUri);
    const envVarName = `GOOGLE_REFRESH_TOKEN_${state.toUpperCase()}`;

    return new NextResponse(
      renderHtmlSuccess({
        account: state,
        refreshToken: tokenData.refresh_token,
        accessToken: tokenData.access_token,
        envVarName,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao autenticar';
    return new NextResponse(renderHtmlError(errorMsg), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function renderHtmlSuccess({
  account,
  refreshToken,
  envVarName,
}: {
  account: string;
  refreshToken?: string;
  accessToken: string;
  envVarName: string;
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Agenda Conectado - PraticSystem</title>
  <style>
    /* Página HTML avulsa, servida fora do React: os tokens do
       theme.css não chegam aqui, então os valores são hex literais
       espelhando o tema claro. Manter em sincronia manualmente. */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf9f5;
      color: #1b1c1a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e3e2df;
      border-radius: 12px;
      padding: 24px;
      max-width: 540px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #e6eadd;
      color: #4a5838;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 8px;
      color: #1b1c1a;
    }
    p {
      color: #5e5d59;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 16px;
    }
    .code-box {
      background: #f4f4f0;
      border: 1px solid #e3e2df;
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: #3a6491;
      word-break: break-all;
      text-align: left;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      background: #d97757;
      color: #1b1c1a;
      text-decoration: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13.5px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #e08a6e;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Conta Conectada com Sucesso!</h1>
    <p>A autorização do Google Agenda para a conta <strong>${account}</strong> foi concluída.</p>
    
    ${
      refreshToken
        ? `
      <p style="text-align: left; font-size: 13px; margin-bottom: 6px;">Adicione esta variável ao seu <code>.env.local</code>:</p>
      <div class="code-box">${envVarName}=${refreshToken}</div>
    `
        : `
      <p style="color: #a03b1f; font-size: 13px;">O token de acesso já foi gerado. Se não recebeu um refresh token novo, a permissão offline já estava concedida anteriormente.</p>
    `
    }

    <a href="/admin/schedule" class="btn">Voltar para a Agenda</a>
  </div>
</body>
</html>`;
}

function renderHtmlError(message: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Erro de Conexão - PraticSystem</title>
  <style>
    /* mesmos hex literais do tema claro — ver comentário acima */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf9f5;
      color: #1b1c1a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #f5e1dc;
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    h1 { color: #8f2e23; font-size: 20px; margin-bottom: 12px; }
    p { color: #5e5d59; font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
    .btn { background: #ffffff; border: 1px solid #c7c7bf; color: #1b1c1a; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 13.5px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Falha na Conexão com Google</h1>
    <p>${message}</p>
    <a href="/admin/schedule" class="btn">Voltar para a Agenda</a>
  </div>
</body>
</html>`;
}
