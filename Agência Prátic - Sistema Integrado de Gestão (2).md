# Agência Prátic - Sistema Integrado de Gestão

## Objetivo

Plataforma completa para gestão de agência, integrando site institucional, onboarding de clientes, catálogo de serviços e controle financeiro de contratos.

## Telas

### Login

**Rota:** `/`

**Objetivo:** Autenticação de usuários administrativos da agência.

**Componentes:**

- **Input E-mail**: Autentica o usuário e redireciona para /admin/dashboard.
- **Input Senha**
- **Texto Esqueci minha senha**: Redireciona para a recuperação de senha.
- **Botão Entrar**: Realiza o login.

### Dashboard Administrativo

**Rota:** `/admin/dashboard
`

**Objetivo:** Fornecer uma visão geral da saúde financeira, operacional e acesso rápido aos principais recursos, incluindo a agenda da agência.


**Componentes:**

- **Sidebar Menu Retrátil**: Navegação principal pelo painel; permite recolher para expandir a área de trabalho.
- **Card de Previsão de Faturamento**: Exibe o valor total previsto para o período atual.
- **Card de Faturamento Realizado**: Exibe o total faturado até o momento.
- **Card de Previsão de Gastos**: Exibe a estimativa de despesas para o período.
- **Link para Agenda da Agência**: Atalho para visualizar compromissos e prazos na rota /admin/agenda.
- **Lista de Acesso Rápido aos Clientes**: Permite visualizar e navegar rapidamente para o perfil dos clientes.
- **Links de Cadastros Importantes**: Atalhos para formulários de criação de novos registros.
- **Seção de Serviços**: Exibe resumo e status dos serviços prestados pela agência.
- **Gráfico de Evolução de Receita**: Filtra e exibe dados financeiros por período.
- **Tabela de Atividades Recentes**: Exibe o histórico de entradas e saídas recentes.

### Gestão de Clientes

**Rota:** `/admin/clients`

**Objetivo:** Listagem e filtragem de todos os clientes da agência.

**Componentes:**

- **Botão Novo Cliente**: Abre o formulário para adicionar novo cliente manualmente.
- **Input de Busca**: Busca clientes por nome ou CNPJ.
- **Tabela de Clientes**: Redireciona para /admin/clients/:id ao clicar em um cliente.

### Detalhes do Cliente

**Rota:** `/admin/clients/:id`

**Objetivo:** Visão 360º do cliente, incluindo dados sensíveis de redes sociais e arquivos.

**Componentes:**

- **Card Dados Cadastrais**: Permite editar informações de contato e endereço.
- **Lista de Acessos (Redes Sociais)**: Exibe logins e senhas criptografadas das redes sociais.
- **Mural de Observações**: Adiciona relatos e história da marca.
- **Galeria de Arquivos e Documentos**: Permite download de materiais de identidade visual.

### Catálogo de Serviços

**Rota:** `/admin/services`

**Objetivo:** Configuração de serviços padrão com valores e prazos de contrato.

**Componentes:**

- **Botão Adicionar Serviço**: Define se o serviço é recorrente, avulso ou parcelado.
- **Tabela de Serviços Catálogo**: Edita valores padrão e descrições operacionais.

### Financeiro

**Rota:** `/admin/billing`

**Objetivo:** Controle de contas a receber e faturamento mensal.

**Componentes:**

- **Botão Confirmar Recebimento**: Altera o status da fatura para Pago.
- **Filtro de Status Financeiro**: Filtra por faturas pendentes ou atrasadas.
- **Botão Exportar Relatório**: Exporta relatório de faturamento.

### Gestão de Contratos

**Rota:** `/admin/contracts`

**Objetivo:** Monitoramento de vigência e renovações de contratos.

**Componentes:**

- **Botão Renovação Automática**: Executa a renovação e gera nova cobrança no financeiro.
- **Link Visualizar Contrato**: Abre o PDF do contrato assinado.
- **Badge de Vencimento**: Exibe dias restantes para o término.

### Onboarding de Cliente

**Rota:** `/onboarding`

**Objetivo:** Formulário público para que o próprio cliente preencha seus dados e acessos.

**Componentes:**

- **Formulário de Dados da Empresa**: Salva os dados iniciais da empresa.
- **Inputs de Acessos Sociais**: Coleta credenciais de Facebook, Instagram e TikTok.
- **Botão Finalizar Cadastro**: Finaliza o cadastro e vincula ao painel admin.

### Home Institucional

**Rota:** `/home`

**Objetivo:** Página pública de apresentação da agência para prospecção.

**Componentes:**

- **Seção Sobre Nós**: Apresenta dados e números da agência.
- **Grid de Serviços Institucional**: Lista os serviços oferecidos com botão de contato.
- **Botão Falar com Consultor**: Redireciona para o formulário de contato.

### Portfólio

**Rota:** `/portfolio`

**Objetivo:** Exposição visual dos trabalhos e resultados da agência.

**Componentes:**

- **Filtro de Categorias**: Filtra cases por nicho de atuação.
- **Galeria de Cases e Portfólio**: Exibe detalhes e resultados de projetos anteriores.

### Gestão de Agenda da Equipe

**Rota:** `/admin/schedule`

**Objetivo:** Gerenciar e monitorar os compromissos, reuniões e demandas operacionais e financeiras da agência.

**Componentes:**

- **Calendário de Compromissos**: Visualiza a distribuição dos compromissos em formato mensal ou semanal.
- **Botão Novo Compromisso**: Abre um formulário para cadastrar uma nova atividade, escolhendo tipo e cliente.
- **Campo de Busca de Eventos**: Busca compromissos específicos por texto.
- **Filtro por Tipo de Compromisso**: Filtra a agenda por categoria (captação, reunião, pagamento, contato, demanda).
- **Filtro de Responsável/Acesso**: Filtra a visão entre a agenda global e a agenda individual do usuário.
- **Lista de Compromissos do Dia**: Permite alteração de detalhes ou exclusão de um compromisso.

## Personas

### Administrador Proprietário

Responsável pela visão estratégica e saúde financeira da agência. Possui acesso total ao sistema, incluindo métricas de faturamento, gestão de contratos e dados sensíveis de clientes.

**User Stories:**

- Como Administrador Proprietário, eu quero Visualizar o faturamento mensal e previsões de receita para tomar decisões financeiras estratégicas
- Como Administrador Proprietário, eu quero Monitorar contratos que estão próximos do vencimento para agir proativamente na retenção de clientes
- Como Administrador Proprietário, eu quero Exportar relatórios financeiros detalhados para realizar o fechamento contábil e auditoria
- Como Administrador Proprietário, eu quero Gerenciar o catálogo de serviços para ajustar valores e modelos de recorrência conforme o mercado

### Gerente de Contas

Focado na operação e no relacionamento direto com o cliente. Gerencia as informações cadastrais, acessos de segurança às redes sociais e o histórico das marcas.

**User Stories:**

- Como Gerente de Contas, eu quero Acessar logins e senhas de redes sociais de forma segura para realizar as publicações e gestões contratadas
- Como Gerente de Contas, eu quero Consultar o mural de observações e a galeria de arquivos para garantir que a identidade visual do cliente seja respeitada
- Como Gerente de Contas, eu quero Adicionar novos clientes e acompanhar o processo de onboarding para garantir o início imediato dos trabalhos
- Como Gerente de Contas, eu quero Registrar orientações específicas e históricos da marca para alinhar a comunicação interna da equipe

### Cliente (Self-Service)

Novo cliente em fase de integração ou prospecção. Utiliza a interface pública para conhecer a agência e fornecer dados necessários para o início da prestação de serviço.

**User Stories:**

- Como Cliente (Self-Service), eu quero Preencher o formulário de onboarding para enviar meus dados e acessos de forma autônoma e rápida
- Como Cliente (Self-Service), eu quero Navegar pelo portfólio e serviços na home institucional para entender os diferenciais e resultados da agência
- Como Cliente (Self-Service), eu quero Entrar em contato com um consultor através do site para solicitar uma proposta personalizada

## Banco de Dados

### users

Armazena informações dos usuários administrativos da agência.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| email | text | - |
| password_hash | text | - |

### clients

Armazena informações cadastrais dos clientes da agência.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| name | text | - |
| cnpj | text | - |
| contact_person | text | - |
| email | text | - |
| phone | text | - |
| address | text | - |
| city | text | - |
| state | text | - |
| zip_code | text | - |

### client_social_media_access

Armazena credenciais de acesso e informações relevantes das redes sociais dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| client_id | fk | - |
| platform | text | - |
| username | text | - |
| password | text | - |
| notes | text | - |

### client_notes

Armazena observações e histórico das marcas dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| client_id | fk | - |
| note | text | - |

### client_files

Armazena informações sobre arquivos e documentos relacionados aos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| client_id | fk | - |
| file_name | text | - |
| file_url | text | - |
| description | text | - |

### services

Define os serviços oferecidos pela agência, incluindo valores e prazos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| name | text | - |
| description | text | - |
| price | number | - |
| contract_term_months | number | - |
| is_recurring | boolean | - |

### contracts

Armazena informações sobre os contratos firmados com os clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| client_id | fk | - |
| service_id | fk | - |
| start_date | timestamp | - |
| end_date | timestamp | - |
| is_auto_renew | boolean | - |
| contract_pdf_url | text | - |

### invoices

Registra as faturas geradas para os clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| client_id | fk | - |
| contract_id | fk | - |
| issue_date | timestamp | - |
| due_date | timestamp | - |
| amount | number | - |
| status | text | - |

### portfolio_cases

Exibe os trabalhos realizados pela agência, incluindo detalhes e resultados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| title | text | - |
| description | text | - |
| category | text | - |
| main_image_url | text | - |
| results | text | - |

### agency_agenda

Gerencia os compromissos e atividades da agência e de sua equipe.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| title | text | - |
| description | text | - |
| start_time | timestamp | - |
| end_time | timestamp | - |
| type | text | - |
| responsible_user_id | fk | - |
| client_id | fk | - |

