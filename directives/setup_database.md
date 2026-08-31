# Diretiva: Configuração do Banco de Dados Supabase

## Objetivo
Configurar o esquema de banco de dados para o sistema da Agência Pratic, garantindo que todas as tabelas, relacionamentos e permissões estejam corretamente estabelecidos.

## Dependências
- Projeto Supabase ativo.
- Credenciais (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) configuradas no `.env`.
- Python com a biblioteca `supabase` instalada.

## Esquema do Banco de Dados
O esquema deve seguir as definições em `Agência Prátic - Sistema Integrado de Gestão (2).md`:

1. **Tabelas Principais**:
   - `users`: Usuários administrativos.
   - `clients`: Dados cadastrais dos clientes.
   - `client_social_media_access`: Credenciais de redes sociais (ligado a `clients`).
   - `client_notes`: Histórico e observações (ligado a `clients`).
   - `client_files`: Arquivos e documentos (ligado a `clients`).
   - `services`: Catálogo de serviços da agência.
   - `contracts`: Contratos firmados (ligado a `clients` e `services`).
   - `invoices`: Faturas financeiras (ligado a `clients` e `contracts`).
   - `portfolio_cases`: Portfólio público.
   - `agency_agenda`: Compromissos da equipe (ligado a `users` e `clients`).

## Instruções de Execução
1. Validar as credenciais no arquivo `.env`.
2. Executar o script `execution/init_db.py`.
3. Verificar a criação das tabelas no painel do Supabase.

## Scripts de Apoio
- `execution/init_db.py`: Realiza a criação do esquema inicial via SQL.
