# Aula 2 — O link que muda

Cole este texto inteiro no Cursor. O projeto Next.js já existe (App Router, pasta src) e o `.env.local` já tem a URL do Supabase, a chave anônima e a service role. Não crie painel nem login.

Nesta aula nascem três coisas juntas: a tabela, o redirect de verdade e a imagem do QR.

## Tabela

Crie o arquivo supabase/migration.sql com a tabela public.qr_links:

- id uuid, chave primária, default gen_random_uuid()
- slug text, único e obrigatório
- title text obrigatório
- destination_url text obrigatório, só http ou https
- is_active boolean, default true
- click_count integer, default 0
- created_at e updated_at timestamptz, default now()

Ainda não coloque user_id nem login. Isso é a aula 4. Não crie cliente, papel de acesso nem tabela de usuários da aplicação. Não conte clique ainda. Não crie a função increment_qr_click.

O slug é o pedaço estável da URL. Ele nasce uma vez e as próximas aulas não podem atualizá-lo. O destination_url é o campo que muda.

## Redirect

Crie src/app/q/[slug]/route.ts lendo o banco de verdade. Não deixe redirect fixo para um slug de teste.

- Leia no servidor, com a service role do Supabase (variável SUPABASE_SERVICE_ROLE_KEY, nunca NEXT_PUBLIC_), o registro daquele slug.
- Se não existir, estiver inativo, ou o destino não for http(s), redirecione para /q/indisponivel.
- Se existir e estiver ativo, responda 307 para destination_url.
- Cabeçalhos: Cache-Control no-store, no-cache, must-revalidate. Marque a rota como dinâmica.
- Não conte clique. Não leia click_count.

A service role ignora RLS e fica só neste redirect público. Não importe essa chave em componente de cliente.

Explique no código, num comentário curto, por que é 307 e não 301: o 301 o celular guarda, e o QR deixaria de ser dinâmico.

Crie a página /q/indisponivel com o texto "Este link está desativado".

Não use middleware.ts. Neste Next.js o arquivo de borda, quando existir, será src/proxy.ts. Nesta aula ele não existe.

## Imagem

Instale o pacote qrcode e os types. Crie GET src/app/api/qrcodes/[id]/image/route.ts:

- Busque o slug pelo id, no servidor, com a service role.
- Se não achar, 404 JSON.
- Gere um PNG de 512px, margem 2, cujo conteúdo é exatamente origem + /q/ + slug. Nunca codifique destination_url.
- Responda image/png com Cache-Control: public, max-age=31536000, immutable.
- Não leia cookie nesta rota. A imagem só depende do slug, que não muda, então o cache longo é seguro. O redirect continua sem cache.

Crie src/lib/qr.ts com a função buildShortUrl(origin, slug) e use-a na imagem. Ainda não há painel.

Pronto quando: eu baixo o PNG, troco destination_url direto no Supabase, escaneio o mesmo arquivo e caio no endereço novo, sem gerar outro QR. Desligo is_active, escaneio de novo e vejo "Este link está desativado".
