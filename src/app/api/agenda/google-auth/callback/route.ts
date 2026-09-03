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

    let autoSaved = false;
    if (tokenData.refresh_token) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          const reg = new RegExp(`^${envVarName}=.*$`, 'm');
          if (reg.test(envContent)) {
            envContent = envContent.replace(reg, `${envVarName}=${tokenData.refresh_token}`);
          } else {
            envContent += `\n${envVarName}=${tokenData.refresh_token}\n`;
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
          autoSaved = true;
          process.env[envVarName] = tokenData.refresh_token;
        }
      } catch (saveErr) {
        console.warn('Não foi possível gravar no .env.local:', saveErr);
      }
    }

    return new NextResponse(
      renderHtmlSuccess({
        account: state,
        refreshToken: tokenData.refresh_token,
        accessToken: tokenData.access_token,
        envVarName,
        autoSaved,
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
  autoSaved,
}: {
  account: string;
  refreshToken?: string;
  accessToken: string;
  envVarName: string;
  autoSaved: boolean;
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
      border-radius: 14px;
      padding: 28px;
      max-width: 580px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #e6eadd;
      color: #3b6e3f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 26px;
      font-weight: bold;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 8px;
      color: #1b1c1a;
      text-align: center;
    }
    p {
      color: #5e5d59;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 16px;
    }
    .badge-success {
      background: #e6f4ea;
      color: #137333;
      border: 1px solid #ceead6;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .code-box {
      background: #f4f4f0;
      border: 1px solid #e3e2df;
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, monospace;
      font-size: 11.5px;
      color: #1a73e8;
      word-break: break-all;
      text-align: left;
      margin-bottom: 14px;
      user-select: all;
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #d97757;
      color: #ffffff;
      text-decoration: none;
      padding: 9px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13.5px;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #c56546;
    }
    .btn-secondary {
      background: #f0efe9;
      color: #2e2d29;
    }
    .btn-secondary:hover {
      background: #e4e3dc;
    }
    .tip-box {
      background: #fef7e0;
      border: 1px solid #feefc3;
      border-radius: 8px;
      padding: 12px;
      font-size: 12.5px;
      color: #7a5e0b;
      line-height: 1.5;
      margin-top: 16px;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Conta Google Conectada!</h1>
    <p style="text-align: center;">A autorização para a conta <strong>${account}</strong> foi gerada com sucesso.</p>

    ${
      autoSaved
        ? `<div class="badge-success">
             ✓ <strong>Atualizado automaticamente:</strong> A variável <code>${envVarName}</code> foi salva no seu arquivo <code>.env.local</code> local!
           </div>`
        : ''
    }

    ${
      refreshToken
        ? `
      <div style="text-align: left;">
        <label style="font-size: 12px; font-weight: 600; color: #444; display: block; margin-bottom: 6px;">
          Novo Refresh Token:
        </label>
        <div id="tokenCode" class="code-box">${envVarName}=${refreshToken}</div>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button onclick="copyToken()" id="copyBtn" class="btn btn-secondary" style="font-size: 12.5px; padding: 6px 12px;">
          📋 Copiar Token
        </button>
        <a href="https://vercel.com/julio-netos-projects/praticsystem/settings/environment-variables" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 12.5px; padding: 6px 12px;">
          ☁️ Abrir Variáveis na Vercel
        </a>
      </div>
    `
        : `
      <p style="color: #a03b1f; font-size: 13px;">O token de acesso já foi gerado. Se não recebeu um refresh token novo, a permissão offline já estava concedida anteriormente.</p>
    `
    }

    <div class="tip-box">
      <strong>⚠️ Dica importante para não expirar em 7 dias:</strong><br>
      No <strong>Google Cloud Console</strong> &gt; <em>Tela de permissão OAuth</em>, certifique-se de clicar em <strong>"Publicar aplicativo"</strong> para colocar o status em <strong>"Em produção"</strong>. Enquanto estiver "Em teste", o Google expira tokens a cada 7 dias!
    </div>

    <div class="actions">
      <a href="/admin/schedule" class="btn">Voltar para a Agenda</a>
    </div>
  </div>

  <script>
    function copyToken() {
      const text = document.getElementById('tokenCode').innerText;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.innerText = '✓ Copiado!';
        setTimeout(() => { btn.innerText = '📋 Copiar Token'; }, 2500);
      });
    }
  </script>
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
