# Aula 4 — Trancado e no ar

Cole este texto inteiro no Cursor. Redirect, PNG, painel e contador já funcionam na máquina. Esta aula tranca o painel e deixa o projeto pronto para publicar. Não adicionar feature. Não mudar o contrato do QR.

## Banco

De forma idempotente:

- coluna user_id uuid not null references auth.users(id) on delete cascade. Se já houver linhas sem dono, apague-as antes de tornar a coluna obrigatória: este projeto de aula não tem dado de produção.
- índice (user_id, created_at desc)
- RLS ligado
- quatro policies para o papel authenticated: select, insert, update e delete somente quando auth.uid() = user_id
- não crie policy para anon. Quem escaneia não usa a chave anônima para ler a tabela.

Explique num comentário curto do SQL: RLS ligado sem policy bloqueia a chave anônima. A service role ignora RLS. Por isso o redirect público continua com a service role, e o painel passa a usar a sessão.

## Login

- Login e criação de conta por e-mail e senha com Supabase, na página /login. Texto em português: o painel pede login, quem escaneia não precisa de conta.
- src/proxy.ts exporta a função proxy (não crie middleware.ts). Sem sessão, /painel vai para /login. Com sessão, /login vai para /painel. O proxy renova o cookie da sessão. /q/ e a rota da imagem ficam de fora do matcher.
- GET, POST, PATCH e DELETE de /api/qrcodes exigem usuário. Sem sessão, 401. O insert grava user_id a partir da sessão, nunca do body. Liste, atualize e apague só as linhas desse user_id, com o client da sessão (chave anônima + cookie), para as policies valerem.
- A rota da imagem continua pública e com cache longo: ela só repete a URL curta. Não coloque cookie nela.
- O redirect /q/[slug] continua público, com service role e com increment_qr_click.

Não invente papéis (admin, equipe, cliente). Uma pessoa vê os próprios QR Codes.

## Publicar

Revise o projeto e corrija só o que quebrar estas regras:

- SUPABASE_SERVICE_ROLE_KEY não aparece em nenhum arquivo cliente e não tem prefixo NEXT_PUBLIC_.
- Criar, editar, excluir e listar respondem 401 sem sessão.
- /q/[slug] segue público, 307, sem cache, e soma o clique com increment_qr_click.
- O PNG codifica a URL curta e pode ter cache longo.

Crie DEPLOY.md, em português, com a checklist:

1. Variáveis na Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
2. Rodar o SQL completo num projeto Supabase novo.
3. Para a turma testar sem esperar e-mail, desativar Confirm email em Authentication → Providers → Email.
4. Next.js 16 usa src/proxy.ts, não middleware.ts.
5. Teste final no celular: salvar o PNG, trocar o destino no painel publicado, escanear de novo e cair no endereço novo. Escanear outra vez e ver o clique subir.

Não escreva domínio curto, logo dentro do QR, senha no link nem gráfico de scans. Isso fica fora deste curso.

Pronto quando: aba anônima em /painel cai no login; um POST sem cookie volta 401; o mesmo QR, escaneado no celular, ainda redireciona. O DEPLOY.md existe e o teste do celular passa no endereço publicado.
