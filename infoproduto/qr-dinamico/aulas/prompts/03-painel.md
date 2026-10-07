# Aula 3 — O painel

Cole este texto inteiro no Cursor. Redirect e PNG da aula 2 continuam. Não implemente login. Não crie select de cliente. Não adicione histórico de scans por data, cidade ou aparelho.

Nesta aula o painel cria, edita, liga, desliga, exclui e mostra o clique. O slug continua nascendo no servidor e não vira campo.

## Lista e criação

Crie a página src/app/painel/page.tsx, em português, visual simples (fundo claro, um botão de destaque, tabela). Sem biblioteca de componentes e sem o visual de outro sistema.

API, com validação (zod):

- GET /api/qrcodes — lista, mais recentes primeiro, cada item com short_url montada no servidor.
- POST /api/qrcodes — body só com title e destination_url (http ou https). O servidor gera o slug a partir do título, em minúsculas, sem acento, mais um sufixo aleatório curto. O cliente não envia slug nem click_count.

No painel:

- estado vazio com botão Novo QR
- tabela: título, destino, URL curta, cliques, status
- botão Copiar na URL curta
- link Baixar PNG apontando para /api/qrcodes/[id]/image
- formulário de criação com título e URL

O slug não aparece como campo editável. A prévia `<img>` do PNG só aparece quando o registro já tem id, porque antes de salvar não existe slug.

Use a chave do servidor nas rotas. Não exponha a service role no browser.

## Editar sem reimprimir

- PATCH /api/qrcodes/[id] aceita title, destination_url e is_active. Recusa body vazio. Ignora slug se alguém enviar: o slug não muda nunca. Atualize updated_at.
- DELETE /api/qrcodes/[id] apaga o registro.
- No painel, editar abre o mesmo formulário já preenchido.
- Um controle liga e desliga is_active.
- Excluir pede confirmação.

QR inativo continua caindo em /q/indisponivel. A imagem não muda quando o destino muda.

## Cliques

No supabase/migration.sql (ou num SQL novo, idempotente), crie a função public.increment_qr_click(link_id uuid):

- um único UPDATE: click_count = click_count + 1
- só se o registro existir e is_active for true
- security definer, search_path = public
- execute apenas para service_role. Revogue de anon, authenticated e public.

No GET src/app/q/[slug]/route.ts, depois de confirmar que o link está ativo e o destino é http(s), chame essa função com o id e espere o resultado. Se a função falhar, registre o erro e ainda assim redirecione: um clique perdido é melhor do que um QR impresso quebrado.

Proibido: ler click_count no JavaScript, somar 1 e gravar o número de volta. Dois scans ao mesmo tempo perderiam um clique.

O painel só mostra o número que já vem na lista. Não deixe o cliente enviar click_count no POST nem no PATCH.

Pronto quando: eu salvo o PNG, troco o destino no painel, escaneio o mesmo arquivo e caio no endereço novo. Desligo o QR, escaneio de novo e vejo a página de link desativado. Escaneio duas vezes e o contador sobe dois, sem eu editar nada no painel.
