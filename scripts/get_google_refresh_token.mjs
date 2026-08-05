// Gera um refresh token do Google Calendar para UMA conta por vez.
//
// Uso:
//   node --env-file=.env.local scripts/get_google_refresh_token.mjs
//
// Pré-requisitos: GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET já definidos
// (Google Cloud Console > Credenciais > OAuth Client ID tipo "Aplicativo da Web",
// com redirect URI http://localhost:3000/oauth2callback e a conta que você vai
// autorizar adicionada como "usuário de teste" na tela de consentimento OAuth).
//
// Não rode isso enquanto `npm run dev` estiver ativo na porta 3000 — o script sobe
// seu próprio servidor local só para capturar o redirecionamento do Google.
//
// Rode este script DUAS vezes, uma por conta, logando no navegador na conta certa
// antes de abrir o link:
//   1ª vez: logado em agenciapratic@gmail.com -> copie o refresh token para
//           GOOGLE_REFRESH_TOKEN_AGENCIAPRATIC
//   2ª vez: logado em praticlabs@gmail.com    -> copie o refresh token para
//           GOOGLE_REFRESH_TOKEN_PRATICLABS

import http from 'node:http';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET antes de rodar ' +
    '(ex.: node --env-file=.env.local scripts/get_google_refresh_token.mjs).'
  );
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\nAbra esta URL no navegador, LOGADO NA CONTA GOOGLE QUE VOCÊ QUER AUTORIZAR:\n');
console.log(authUrl.toString());
console.log(`\nAguardando o redirecionamento em ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404);
    res.end();
    return;
  }

  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  if (errorParam || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Falha na autorização</h1><p>Pode fechar esta aba e conferir o terminal.</p>');
    console.error('Autorização falhou:', errorParam || 'nenhum "code" recebido');
    server.close();
    process.exit(1);
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(JSON.stringify(tokenData));
    }

    if (!tokenData.refresh_token) {
      throw new Error(
        'O Google não retornou um refresh_token (geralmente porque essa conta já havia ' +
        'autorizado este app antes). Revogue o acesso em ' +
        'https://myaccount.google.com/permissions e rode o script de novo.'
      );
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Autorizado!</h1><p>Pode fechar esta aba e voltar ao terminal.</p>');

    console.log('\nRefresh token gerado com sucesso:\n');
    console.log(tokenData.refresh_token);
    console.log(
      '\nCopie esse valor para GOOGLE_REFRESH_TOKEN_AGENCIAPRATIC ou ' +
      'GOOGLE_REFRESH_TOKEN_PRATICLABS (conforme a conta que você acabou de autorizar) ' +
      'no .env.local e nas envs do Vercel.\n'
    );
  } catch (err) {
    console.error('Erro ao trocar o code pelo refresh token:', err.message || err);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Erro</h1><p>Confira o terminal.</p>');
  } finally {
    server.close();
  }
});

server.listen(3000);
