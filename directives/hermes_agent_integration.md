# Diretiva: Integração Hermes Agent ↔ Pratic System

## Objetivo
Permitir que o Hermes Agent leia lançamentos financeiros (a receber e a pagar) e
crie/confirme lançamentos em nome da agência, sem ter acesso irrestrito ao banco.

## Modelo de segurança
- O Hermes nunca recebe a `SUPABASE_SERVICE_ROLE_KEY`. Ele autentica só com uma
  chave própria (`HERMES_API_KEY`), enviada em `Authorization: Bearer <chave>`.
- As rotas ficam isoladas em `/api/agents/hermes/*` — nenhuma outra rota do
  sistema aceita essa chave, e essa chave não abre nenhuma outra rota.
- Superfície de escrita é fechada: criar lançamento (`POST /lancamentos`) e
  confirmar lançamento existente (`POST /lancamentos/:id/confirmar`). Não há
  endpoint de delete, nem de update livre de campos.
- Toda chamada (leitura ou escrita) é registrada em `hermes_agent_logs`
  (ação, payload, resultado). Lançamentos criados pelo agente ficam marcados
  com `source = 'hermes'` em `invoices`/`expense_entries`, para diferenciar
  de lançamentos feitos manualmente no painel.

## Dependências
1. Rodar `create_hermes_agent_table.sql` no Supabase (cria `hermes_agent_logs`
   e a coluna `source`).
2. Definir `HERMES_API_KEY` nas variáveis de ambiente (Vercel + `.env.local`),
   com um valor aleatório longo (ex.: `openssl rand -hex 32`). Sem essa
   variável configurada, as rotas retornam `503`.
3. Configurar o Hermes para enviar esse valor no header `Authorization: Bearer <HERMES_API_KEY>`
   em toda chamada.

## Endpoints

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

## Próximos passos recomendados (fora do escopo desta integração)
- As demais rotas administrativas (`/api/clients`, `/api/financeiro/*`) hoje
  não têm nenhuma autenticação e usam a service role key diretamente — vale
  endereçar isso separadamente, já que qualquer pessoa com a URL tem acesso
  administrativo total a esses dados.
- Se o volume de chamadas do Hermes crescer, considerar rate limiting por
  chave (hoje não há limite além da própria auditoria).
