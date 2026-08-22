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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 8px;
      color: #fff;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 20px;
    }
    .code-box {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
      word-break: break-all;
      text-align: left;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #2563eb;
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
      <p style="color: #eab308; font-size: 13px;">O token de acesso já foi gerado. Se não recebeu um refresh token novo, a permissão offline já estava concedida anteriormente.</p>
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
    body {
      font-family: sans-serif;
      background: #09090b;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #18181b;
      border: 1px solid #7f1d1d;
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    h1 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
    p { color: #a1a1aa; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .btn { background: #27272a; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; }
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
