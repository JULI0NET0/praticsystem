# Diretiva: Integração Hermes Agent ↔ Pratic System

## Objetivo
O Hermes Agent atua como assistente geral/gerencial da agência: lê dados de
clientes, contratos, serviços e financeiro para responder perguntas ("quando
vence o contrato do cliente X", "qual o CNPJ dele") e pode lançar/confirmar
movimentações financeiras e propor contratos personalizados — sem ter acesso
irrestrito ao banco nem poder de decisão final sobre documentos legais.

## Modelo de segurança
- O Hermes nunca recebe a `SUPABASE_SERVICE_ROLE_KEY`. Ele autentica só com uma
  chave própria (`HERMES_API_KEY`), enviada em `Authorization: Bearer <chave>`.
- As rotas ficam isoladas em `/api/agents/hermes/*` — nenhuma outra rota do
  sistema aceita essa chave, e essa chave não abre nenhuma outra rota.
- **Leitura ampla, mas filtrada**: clientes, contratos, serviços e templates de
  contrato ficam visíveis, porém só com campos de negócio. Campos sensíveis —
  `portal_password`, `social_access` (credenciais de redes sociais do cliente),
  `notes`, `drive_settings` — nunca são retornados por essas rotas, mesmo que
  o Hermes peça.
- **Escrita fechada por tipo de dado**:
  - Financeiro: criar lançamento (sempre `pending`) e confirmar/dar baixa em
    lançamento existente. Sem delete, sem update livre de campo.
  - Contratos: o Hermes **nunca cria um contrato oficial diretamente**. Ele só
    cria um *rascunho* (`hermes_contract_drafts`, status `pending_review`).
    O contrato só passa a existir de verdade (e gerar faturas) depois que um
    humano revisa e aprova em `/admin/contracts/drafts`.
- Toda chamada (leitura ou escrita) é registrada em `hermes_agent_logs`
  (ação, payload, resultado). Lançamentos criados pelo agente ficam marcados
  com `source = 'hermes'` em `invoices`/`expense_entries`.

## Dependências
1. Rodar, no Supabase, nesta ordem:
   - `create_hermes_agent_table.sql` (cria `hermes_agent_logs` e a coluna `source`).
   - `create_hermes_contract_drafts_table.sql` (cria `hermes_contract_drafts`).
2. Definir `HERMES_API_KEY` nas variáveis de ambiente (Vercel + `.env.local`),
   com um valor aleatório longo (ex.: `openssl rand -hex 32`). Sem essa
   variável configurada, as rotas retornam `503`.
3. Configurar o Hermes para enviar esse valor no header `Authorization: Bearer <HERMES_API_KEY>`
   em toda chamada.

## Endpoints — Financeiro

### `GET /api/agents/hermes/lancamentos`
Lista lançamentos. Query params opcionais: `tipo` (`receber` | `pagar` | `all`,
padrão `all`), `status`, `client_id`, `from`, `to` (datas `YYYY-MM-DD`).

### `POST /api/agents/hermes/lancamentos`
Cria um novo lançamento (sempre como `pending`).
- A receber: `{ "tipo": "receber", "client_id", "description", "amount", "due_date", "contract_id"? }`
- A pagar: `{ "tipo": "pagar", "description", "amount", "date", "category"?, "expense_id"?, "notes"? }`

### `POST /api/agents/hermes/lancamentos/:id/confirmar`
Confirma (dá baixa em) um lançamento já existente — só muda `status` para
`paid` (e `paid_at` quando for a receber). Não altera nenhum outro campo.
Body: `{ "tipo": "receber" | "pagar", "paid_at"? }`.

## Endpoints — Clientes, contratos e serviços (leitura)

### `GET /api/agents/hermes/clients`
Lista clientes com campos de negócio (nome, CNPJ, contato, endereço, status,
serviço de interesse...). Query params: `status`, `search` (nome/fantasia/CNPJ), `id`.

### `GET /api/agents/hermes/contracts`
Lista contratos com cliente e serviço vinculados (inclui `end_date`, útil para
"quando vence"). Query params: `status`, `client_id`, `expiring_within_days`.

### `GET /api/agents/hermes/services`
Catálogo de serviços (nome, preço, recorrência, prazo mínimo).

### `GET /api/agents/hermes/contract-templates`
Texto bruto dos 4 modelos de contrato (`social_media`, `development`,
`ia_images`, `artes_avulsas`), para o Hermes decidir qual usar como base.

## Endpoints — Rascunho de contrato

### `POST /api/agents/hermes/contracts/draft`
Monta um contrato personalizado (preenchendo o template certo com os dados do
cliente/serviço, mais cláusulas extras se fornecidas) e salva como rascunho —
**nunca cria contrato oficial nem fatura**.
Body: `{ "client_id", "service_id", "value", "duration_months", "start_date", "posts_per_week"?, "capture_frequency"?, "custom_clauses"?, "notes"? }`.
Retorna o rascunho com `document_content` (o contrato completo já redigido).

### `GET /api/agents/hermes/contracts/draft?status=pending_review`
Lista os rascunhos que o Hermes propôs, para ele acompanhar o que já foi
aprovado ou rejeitado.

## Fluxo de aprovação humana
Todo rascunho aparece em **`/admin/contracts/drafts`** no painel. Lá dá para
ler o contrato completo, aprovar (cria o contrato oficial + faturas, exatamente
como o fluxo manual de "Novo Contrato") ou rejeitar. Nenhum contrato do Hermes
vira oficial sem esse clique humano.

## Próximos passos recomendados (fora do escopo desta integração)
- As demais rotas administrativas (`/api/clients`, `/api/financeiro/*`) hoje
  não têm nenhuma autenticação e usam a service role key diretamente — vale
  endereçar isso separadamente, já que qualquer pessoa com a URL tem acesso
  administrativo total a esses dados.
- Se o volume de chamadas do Hermes crescer, considerar rate limiting por
  chave (hoje não há limite além da própria auditoria).
