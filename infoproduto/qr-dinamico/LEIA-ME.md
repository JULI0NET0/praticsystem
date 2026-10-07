# A sua ferramenta de QR Code dinâmico

Promessa do infoproduto: no final existe um painel seu, um QR impresso que continua válido quando o destino muda, e um número de cliques.

A frase que organiza o curso: **a imagem guarda a URL curta (`/q/slug`). O destino mora no banco e pode mudar.**

Esta pasta é o projeto didático, separado do sistema da agência. O código aqui é a resposta do professor: a ferramenta pronta. O aluno não recebe este zip para copiar. Ele cola, aula a aula, o texto de [aulas/prompts.html](aulas/prompts.html) num projeto Next.js novo. Os mesmos textos estão em `aulas/prompts/`. As telas em `aulas/telas/` são a referência visual de cada aula.

## Ordem

1. [A ideia](aulas/prompts.html#01) — sem código
2. [O link que muda](aulas/prompts.html#02) — tabela, redirect 307 e PNG
3. [O painel](aulas/prompts.html#03) — criar, editar, ligar, desligar e cliques
4. [Trancado e no ar](aulas/prompts.html#04) — login, RLS e publicação

O roteiro com o gesto de verificação de cada aula está em [aulas/roteiro.md](aulas/roteiro.md). A tela de gravação é [aulas/apresentacao.html](aulas/apresentacao.html): setas trocam o slide, os botões 01–04 trocam a aula. O prompt de cada aula, para copiar, está em [aulas/prompts.html](aulas/prompts.html).

O `supabase/migration.sql` desta pasta já é o script da ferramenta pronta (com `user_id`, policies e o incremento atômico). Nas aulas, a tabela nasce simples na aula 2 e o login entra na aula 4.

## O que fica de fora

Não entra no curso, porque é da operação da agência e não da ferramenta:

- cliente do QR e select de clientes
- papéis de acesso da agência
- visual, skeleton e componentes do sistema interno

Também fica fora da promessa principal, para o curso não virar um encurtador: histórico de scans por data, QR com logo ou cor, domínio curto próprio, senha no link e data de expiração.

## Subir a resposta do professor

Na raiz desta pasta:

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha URL, chave anônima e service role.
3. No SQL Editor do Supabase, rode `supabase/migration.sql`.
4. Em Authentication → Providers → Email, desative "Confirm email" enquanto estiver testando. Senão a conta só entra depois do e-mail.
5. `npm run dev` e abra `http://localhost:3000`.

A service role fica só no servidor. Ela não pode ir para variável `NEXT_PUBLIC_`. O redirect público (`/q/[slug]`) usa essa chave porque quem escaneia não tem login. Criar, editar, excluir e listar exigem sessão. A imagem do PNG é pública de propósito: ela só repete a URL curta, e por isso pode ter cache longo.

Next.js 16 usa `src/proxy.ts` (função `proxy`), no lugar do antigo `middleware.ts`.

## Publicar

- Projeto na Vercel apontando para esta pasta (ou para o repositório do aluno, se a pasta for a raiz).
- As três variáveis do `.env.example` no ambiente de produção.
- Teste final, no celular: salvar o PNG, trocar o destino no painel, escanear de novo. O mesmo quadrado tem que abrir o endereço novo. Escanear outra vez e ver o clique subir.
