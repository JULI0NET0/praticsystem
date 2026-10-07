# Roteiro das aulas — Painel de QR

Curso rápido e direto ao ponto. Cada aula tem: **objetivo, blocos com minutagem, o que aparece na tela, o prompt, o entregável e o gancho** para a próxima.
Tempos são **alvos de gravação**, não medidos. A fala-chave de cada bloco é uma sugestão no seu tom; ajuste.

Público: quem já abre Cursor, Next.js e Supabase. A frase da aula 1 é o critério de tudo: **se o aluno imprimir o QR e depois mudar o link, o papel continua valendo.**

Grave a partir deste projeto limpo, ou de um Next.js vazio em que o aluno cola os prompts. Não abra o sistema da agência na tela. Não mostre cliente, papel de acesso nem o visual interno.

Tela de gravação: `apresentacao.html`. As setas trocam o slide. Os botões 01–04 trocam a aula. O texto que o aluno cola está em `prompts.html`, nos mesmos botões 01–04. As páginas em `telas/` são o desenho de cada batida, já montado na apresentação.

## Mapa

| # | Aula | Min | Entregável do aluno |
|---|---|---|---|
| 1 | A ideia | ~6 | Sabe que a imagem guarda `/q/slug` e o destino mora no banco |
| 2 | O link que muda | ~18 | PNG baixado. Troca o destino no Supabase e o mesmo arquivo abre o endereço novo |
| 3 | O painel | ~18 | Cria, edita e desliga pelo painel. Dois scans sobem o contador em dois |
| 4 | Trancado e no ar | ~12 | Aba anônima cai no login. No celular, o PNG publicado ainda muda de destino e o clique sobe |

Fora da promessa: log de scans, cor ou logo no QR, domínio curto, senha e expiração. Também fora: cliente do QR, papéis da agência e o visual do sistema interno.

---

## Aula 1 · A ideia (~6 min)

**Objetivo:** o aluno entende a diferença e repete a frase. Sem código.
Tela: `apresentacao.html`, aula 01. Prompt: `prompts.html`, aula 01.

| Bloco | Min | Na tela | Fala-chave |
|---|---|---|---|
| Resultado | 0:00–1:30 | Um QR já impresso. Troque o destino ao vivo e escaneie | "Esse papel eu não reimprimi. Eu mudei o link." |
| Estático | 1:30–3:00 | O desenho do QR estático | "A imagem guarda o site final. O site muda, o papel morre." |
| Dinâmico | 3:00–5:00 | O desenho do QR dinâmico, com `/q/slug` | "A imagem guarda a URL curta. O destino mora no banco." |
| A frase | 5:00–6:00 | A frase na tela | "Se eu imprimir o QR e depois mudar o link, o papel continua valendo." |

**Pedido:** abra `prompts.html`, aula 01, e cole o texto. O agente explica e para. Não cria arquivo.
**Entregável:** o aluno aponta para o papel (ou para o PNG) e diz que aquele quadrado não conhece o site final.
**Gancho:** "Agora a gente cria esse link. Projeto vazio, banco e a imagem."

---

## Aula 2 · O link que muda (~18 min)

**Objetivo:** a tabela, o redirect 307 e o PNG existem. O mesmo arquivo muda de destino.
Tela: `apresentacao.html`, aula 02. Prompt: `prompts.html`, aula 02 (um só).

| Bloco | Min | Na tela | Fala-chave |
|---|---|---|---|
| Preparar | 0:00–2:00 | Next.js vazio (App Router, pasta `src`), `.env.local`, SQL Editor | "Projeto vazio. Três variáveis. A service role não vai para o browser." |
| O pedido | 2:00–4:00 | O prompt na tela | "Eu colo o pedido. Ele mostra o que vai criar. Eu aprovo." |
| Registro e redirect | 4:00–12:00 | A tabela e `/q/slug` caindo no destino | "307, sem cache. O 301 o celular guarda, e o QR deixa de ser dinâmico." |
| A imagem | 12:00–16:00 | O PNG baixado e a câmera do celular | "O quadrado codifica a URL curta. Nunca o site final." |
| O gesto | 16:00–18:00 | `destination_url` trocado no Supabase; o mesmo PNG no endereço novo | "O arquivo não foi gerado de novo." |

**Preparar, nos 2 minutos:** projeto Next.js vazio, `.env.local` com URL, chave anônima e service role, SQL Editor aberto. Não é aula separada.
**Pedido:** abra `prompts.html`, aula 02, e cole o texto inteiro. Um prompt cobre tabela, redirect e PNG.
**Entregável:** baixar o PNG, trocar `destination_url` no Supabase, escanear o mesmo arquivo e cair no endereço novo. Desligar `is_active` e ver "Este link está desativado".
**Gancho:** "Funciona, mas eu ainda mexo no banco. A próxima aula é o painel."

---

## Aula 3 · O painel (~18 min)

**Objetivo:** criar, editar, ligar, desligar, excluir e ver o clique, sem abrir o SQL.
Tela: `apresentacao.html`, aula 03. Prompt: `prompts.html`, aula 03 (um só).

| Bloco | Min | Na tela | Fala-chave |
|---|---|---|---|
| O pedido | 0:00–2:00 | O prompt na tela | "Agora o painel faz o que eu fazia na tabela." |
| Criar | 2:00–8:00 | Formulário, lista, copiar, baixar PNG | "O slug nasce aqui. Não é um campo." |
| Mudar sem reimprimir | 8:00–14:00 | O mesmo PNG, destino novo no painel, depois desligado | "A imagem não muda. O destino muda." |
| Cliques | 14:00–18:00 | Dois scans e o número sobe dois | "O incremento fica no SQL. Ler e somar 1 perde scan quando dois chegam juntos." |

**Pedido:** abra `prompts.html`, aula 03, e cole o texto. Ainda sem login.
**Entregável:** o mesmo PNG da aula 2, destino trocado no painel, scan no endereço novo. Desligar e ver a página de indisponível. Escanear duas vezes e o contador subir de dois. O arquivo do PNG não foi gerado de novo.
**Gancho:** "O painel está aberto para qualquer um. A última aula tranca e publica."

---

## Aula 4 · Trancado e no ar (~12 min)

**Objetivo:** o painel pede login. Quem escaneia não precisa de conta. O teste final é no endereço publicado.
Tela: `apresentacao.html`, aula 04. Prompt: `prompts.html`, aula 04 (um só).

| Bloco | Min | Na tela | Fala-chave |
|---|---|---|---|
| O corte | 0:00–2:00 | Aba anônima em `/painel` | "O painel pede login. Quem escaneia não cria conta." |
| Sessão | 2:00–7:00 | Login, e o scan no celular ainda redireciona | "RLS sem policy bloqueia a chave anônima. A service role ignora o RLS e fica só no redirect." |
| Publicar | 7:00–10:00 | Variáveis na Vercel e o `DEPLOY.md` | "Três variáveis. A service role só no servidor." |
| O gesto final | 10:00–12:00 | PNG salvo, destino mudado em produção, clique sobe | "O mesmo quadrado. O endereço novo. O clique sobe." |

**Pedido:** abra `prompts.html`, aula 04, e cole o texto. Não adiciona feature.
**Entregável:** aba anônima em `/painel` cai no login. No celular, o PNG publicado muda de destino e o clique sobe.
**Confirmação de e-mail:** desligada enquanto a turma testa. Diga isso em voz alta.

---

## Fora da promessa

Log de scans, cor ou logo no QR, domínio curto, senha no link e data de expiração. Só depois que o gesto final passou.
