# CRM — [ESPAÇO] Operação OFICIAL
> Agencia Pratic's Workspace · Mapeamento completo para desenvolvimento
> Gerado em: 30/06/2026

---

## ÍNDICE

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Entidades e Relacionamentos](#2-entidades-e-relacionamentos)
3. [Campos Personalizados Globais](#3-campos-personalizados-globais)
4. [ÁREA 1 — Onboarding](#4-área-1--onboarding)
5. [ÁREA 2 — Audiovisual](#5-área-2--audiovisual)
6. [ÁREA 3 — Criação](#6-área-3--criação)
7. [ÁREA 4 — Ex-clientes](#7-área-4--ex-clientes)
8. [Fluxos Operacionais](#8-fluxos-operacionais)
9. [Integrações Identificadas](#9-integrações-identificadas)
10. [Guia de Desenvolvimento](#10-guia-de-desenvolvimento)

---

## 1. Visão Geral da Arquitetura

```
[ESPAÇO] Operação OFICIAL
│
├── 📁 Onboarding
│   ├── 📋 Onboarding          → Pipeline de entrada de clientes
│   └── 📋 Cancelamento        → Pipeline de saída de clientes
│
├── 📁 Audiovisual
│   ├── 📋 Planejamento        → Templates de captação por tipo
│   ├── 📋 Edição de vídeos    → Fila de edição (operacional)
│   └── 📋 Edição de fotos     → Fila de edição (operacional)
│
├── 📁 Criação
│   ├── 📋 [TEMPLATE] Cliente  → Template mestre de produção mensal
│   ├── 📋 Cliente 1           → Produção ativa (clone do template)
│   ├── 📋 Cliente 2
│   ├── 📋 Cliente 3
│   ├── 📋 Cliente 4
│   ├── 📋 Cliente 5
│   ├── 📋 Cliente 6
│   ├── 📋 Cliente 7
│   ├── 📋 Cliente 8
│   ├── 📋 Cliente 9
│   └── 📋 Cliente 10
│
└── 📁 Ex-clientes
    └── 📋 [TEMPLATE] Cliente  → Arquivo de clientes encerrados
```

---

## 2. Entidades e Relacionamentos

### Entidades Principais

| Entidade | Equivalente no ClickUp | Descrição |
|---|---|---|
| **Espaço** | [ESPAÇO] Operação OFICIAL | Workspace da agência |
| **Área** | Pasta (Folder) | Onboarding / Audiovisual / Criação / Ex-clientes |
| **Cliente** | Lista | Uma lista por cliente ativo |
| **Processo** | Tarefa principal | Onboarding, Captação, Produção de mídia |
| **Etapa** | Subtarefa | Fase dentro de um processo |
| **Entregável** | Sub-subtarefa | Ação pontual dentro de uma etapa |
| **Post/Publicação** | Sub-subtarefa | Unidade de conteúdo produzido |

### Relacionamentos

```
Cliente (Lista)
  └── Processo: Onboarding (Tarefa)
        └── Etapa: 01. Administrativo (Subtarefa)
              └── Ação: Cadastrar no Asaas (Sub-subtarefa)

Cliente (Lista Criação)
  └── Processo: Feed (Tarefa — por mídia)
        └── POST 01 (Subtarefa — por publicação)
              └── Campos: Data | Funil | Mídia | Mês referente

Cliente (Lista Audiovisual)
  └── Processo: Captação (Tarefa — por tipo)
        ├── Planejamento (Subtarefa)
        ├── Edição de vídeos (Subtarefa)
        └── Edição de fotos (Subtarefa)
```

---

## 3. Campos Personalizados Globais

| Campo | Tipo | Usado em | Valores possíveis |
|---|---|---|---|
| `Mês referente` | Texto / Mês | Onboarding, Cancelamento, Audiovisual, Criação, Ex-clientes | ex.: Jan/2025 |
| `Mídia` | Dropdown (Label) | Criação, Ex-clientes | Feed, Stories, Facebook, TikTok, Linkedin, Twitter, E-mail, Pinterest |
| `Funil` | Texto / Dropdown | Criação, Ex-clientes | Etapa do funil de marketing |
| `Data` | Data | Criação | Data de publicação do post |
| `Pack de entrega` | Label / Status | Criação | Agrupador de pack mensal de entrega |

---

## 4. ÁREA 1 — Onboarding

### 4.1 Pasta: Onboarding

#### 📋 Lista: Onboarding

**Propósito:** Pipeline completo de entrada de novos clientes na agência.

**Visualizações:** Quadro (Kanban) · Tabela

**Status (Workflow):**

| # | Status | Categoria | Cor |
|---|---|---|---|
| 1 | TEMPLATES | Não iniciado | Cinza |
| 2 | ADMINISTRATIVO | Ativo | Azul |
| 3 | KICK OFF | Ativo | Rosa |
| 4 | AGUARDANDO C1 | Ativo | Vermelho |
| 5 | 1º CONTATO | Ativo | Vermelho |
| 6 | OPERACIONAL | Ativo | Verde |
| 7 | PRODUÇÃO DO MACRO | Ativo | Roxo |
| 8 | REUNIÃO ESTRATÉGICA | Ativo | Roxo |
| 9 | FINALIZAÇÃO | Ativo | Laranja |
| 10 | CONCLUÍDO | Fechado | Verde escuro |

**Campos personalizados:**
- `Mês referente` (texto)

---

**Template Principal: [ONBOARDING] [TEMPLATE]**

> Tipo de tarefa: Offboarding (tipo customizado)
> Descrição: "Processo de onboarding do cliente ⚡️"
> Seções da descrição:
> - 📄 Entregas de contrato
> - 📱 Para fazer 1º contato (Nome, Cargo, Whatsapp, E-mail)
> - Referência: Don Comunicação Digital - @dondigital.com.br

**Campos da tarefa:**
- Status · Responsáveis · Datas · Prioridade · Rastrear tempo · Etiquetas · Mês referente

---

**Subtarefas do Template (7 etapas):**

##### Subtarefa 01. Administrativo *(12 ações)*

| # | Ação |
|---|---|
| 1 | Pegue o contrato assinado do cliente com o comercial |
| 2 | Preencha os serviços prestados na descrição dessa tarefa |
| 3 | Preencha os dados do responsável por tocar o ONBOARDING da parte do CLIENTE |
| 4 | Faça upload da PROPOSTA na pasta do administrativo no Google Drive |
| 5 | Faça upload do CONTRATO na pasta do administrativo no Google Drive |
| 6 | Faça o cadastro do cliente em DADOS FISCAIS |
| 7 | Insira o CONTRATO ASSINADO na aba do cliente em DADOS FISCAIS |
| 8 | Confira se o valor mensal e data de pagamento foi corretamente para a planilha RECEITA E DESPESA |
| 9 | Cadastre o cliente no Asaas |
| 10 | Crie a cobrança de KICK OFF do cliente no Asaas |
| 11 | Crie a mensalidade do cliente no Asaas |
| 12 | Envie a cobrança de KICK OFF e alinhe os prazos no Whatsapp |

##### Subtarefa 02. KICK OFF *(5 ações)*

| # | Ação |
|---|---|
| 1 | Receba o comprovante de pagamento |
| 2 | Atualize a planilha de LANÇAMENTOS conforme o pagamento do KICK OFF |
| 3 | Formalize os prazos sobre as cobranças por e-mail |
| 4 | Avise o cliente da passagem de bastão para o time de conteúdo |
| 5 | Conclua a parte administrativa do onboarding e troque o status da tarefa macro para "Aguardando C1" |

##### Subtarefa 03. 1º contato *(5 ações)*

| # | Ação |
|---|---|
| 1 | Fazer o 1º contato com o cliente e enviar o briefing |
| 2 | Receber briefing respondido e colocar na pasta do Drive do cliente |
| 3 | Agendar a 1ª reunião estratégica |
| 4 | Criar reunião na agenda da Agência e enviar os invites |
| 5 | Solicitar o contato de quem participará do grupo do WhatsApp |

##### Subtarefa 04. Operacional *(16 ações)*

| # | Ação |
|---|---|
| 1 | Criar pasta do cliente no Drive conforme o template |
| 2 | Criar a lista do cliente aqui no ClickUp |
| 3 | Configurar os templates de criação de conteúdo no ClickUp |
| 4 | Configurar os Docs do cliente |
| 5 | Conectar o cliente na plataforma de agendamento de posts |
| 6 | Colocar a data do início do contrato no Google Agenda da agência |
| 7 | Criar a foto de perfil para o grupo no Whatsapp conforme o template |
| 8 | Criar grupo do cliente no Whatsapp |
| 9 | Colocar o link da pasta do Drive na descrição do grupo do Whatsapp |
| 10 | Colocar foto de perfil no grupo conforme o template |
| 11 | Adicionar envolvidos do cliente |
| 12 | Apresentar o time Don no grupo do Whatsapp |
| 13 | Reforçar os prazos no grupo |
| 14 | Solicitar acessos das redes sociais e materiais de identidade visual |
| 15 | Acrescentar o nome do cliente na planilha template do Geral |
| 16 | Enviar presskit de boas-vindas |

##### Subtarefa 05. Produção do Planejamento Macro *(9 ações)*

| # | Ação |
|---|---|
| 1 | Fase 1 | Caminho estratégico |
| 2 | Fase 2 | Primeiras implementações |
| 3 | Fase 3 | Análise da concorrência |
| 4 | Fase 4 | Definição de conteúdo |
| 5 | Fase 5 | Estratégias de performance |
| 6 | Fase 6 | Estrutura de campanhas anuais |
| 7 | Organizar próximos passos |
| 8 | Revisar todo o planejamento macro |
| 9 | Salvar PDF e arrastar tarefa macro para a coluna de Reunião Estratégica |

##### Subtarefa 06. Reunião estratégica *(6 ações)*

| # | Ação |
|---|---|
| 1 | Criar ata da reunião no docs do cliente |
| 2 | Apresentar o planejamento macro |
| 3 | Gravar a tela de apresentação do planejamento macro |
| 4 | Anotar os principais insights da reunião na ata de reunião no docs |
| 5 | Explicar como funciona o processo de captação audiovisual (se houver) |
| 6 | Agendar a 1ª captação audiovisual (se houver) |

##### Subtarefa 07. Finalização *(5 ações)*

| # | Ação |
|---|---|
| 1 | Enviar mensagem de pós-reunião |
| 2 | Colocar o PDF + gravação de tela do planejamento macro na pasta do Drive |
| 3 | Criar tarefa para execução do diagnóstico do planejamento macro |
| 4 | Criar tarefa para execução da primeira captação audiovisual do cliente (se houver) |
| 5 | Criar tarefa para primeira produção de conteúdo |

---

#### 📋 Lista: Cancelamento

**Propósito:** Pipeline de saída (offboarding) de clientes que encerraram contrato.

**Tipo customizado de tarefa:** Offboarding

**Status (Workflow):**

| # | Status | Categoria |
|---|---|---|
| 1 | TEMPLATES | Não iniciado |
| 2 | ADMINISTRATIVO | Ativo |
| 3 | OPERACIONAL | Ativo |
| 4 | FINALIZAÇÃO | Ativo |
| 5 | CONCLUÍDO | Fechado |

**Campos personalizados:**
- `Mês referente` (texto)

---

**Template Principal: [CANCELAMENTO] [TEMPLATE]**

> Descrição: "Processo de offboarding do cliente ❌"
> Seção: Rescisão de contrato

**Subtarefas do Template (3 etapas):**

##### Subtarefa 01. Administrativo *(4 ações)*

| # | Ação |
|---|---|
| 1 | Alinhe a última entrega de conteúdo, data da última mensalidade e prazos com o cliente |
| 2 | Remova a assinatura do cliente no Asaas |
| 3 | Remova o cliente da planilha de Dados Fiscais |
| 4 | Formalize o cancelamento por e-mail |

##### Subtarefa 02. Operacional *(3 ações)*

| # | Ação |
|---|---|
| 1 | Mover pasta do cliente no Drive para aba de "Clientes inativos" |
| 2 | Mover lista do cliente para pasta de "Ex-clientes" |
| 3 | Remover data de início do contrato do Google Agenda |

##### Subtarefa 03. Finalização *(5 ações)*

| # | Ação |
|---|---|
| 1 | Remover nome do cliente do template do Geral |
| 2 | Compartilhar o novo link do Drive e alinhar o prazo de vencimento para o armazenamento |
| 3 | Enviar mensagem de encerramento no grupo do Whatsapp |
| 4 | Remover os envolvidos da agência e encerrar o grupo no Whatsapp |
| 5 | Desconectar cliente da plataforma de agendamentos |

---

## 5. ÁREA 2 — Audiovisual

### 5.1 Pasta: Audiovisual

#### 📋 Lista: Planejamento

**Propósito:** Planejamento e execução de captações audiovisuais por cliente/tipo.

**Visualizações:** Quadro · Tabela

**Status (Workflow):**

| # | Status | Categoria | Sub-categoria |
|---|---|---|---|
| 1 | NÃO INICIADO | Não iniciado | Produção |

**Campos personalizados:**
- `Mês referente` (texto)

---

**3 Templates de Captação:**

##### Template 1: Captação - [NOME DO CLIENTE] - [TEMPLATE]

> Descrição: "Planejamento de captação audiovisual 🎬"
> Campo descritivo: Endereço da captação

**Subtarefas (3 grupos):**

**Planejamento** *(8 ações)*

| # | Ação |
|---|---|
| 1 | Confirme a data e coloque na descrição da tarefa macro |
| 2 | Defina o local da captação e coloque na descrição da tarefa macro |
| 3 | Defina o local da captação e coloque no calendário do Google da agência |
| 4 | Defina a quantidade mínima de Reels e preencha na descrição da tarefa macro |
| 5 | Busque referências de Reels e preencha na descrição da tarefa macro com links |
| 6 | Escreva os roteiros dos vídeos |
| 7 | Crie um moodboard para a captação |
| 8 | Envie o moodboard e as ideias de reels para revisão |

**Edição de vídeos** *(5 ações)*

| # | Ação |
|---|---|
| 1 | Fazer backup do material pasta do Drive do cliente |
| 2 | Editar vídeos da captação e enviar para aprovação na tarefa macro |
| 3 | Fazer frame dos vídeos e colocar no Drive |
| 4 | Avisar o planejamento responsável que as edições estão prontas |
| 5 | Passar vídeos aprovados para a pasta público do cliente |

**Edição de fotos** *(4 ações)*

| # | Ação |
|---|---|
| 1 | Fazer backup do material pasta do Drive do cliente |
| 2 | Editar fotos da captação e enviar para aprovação na tarefa macro |
| 3 | Avisar o planejamento responsável que as edições estão prontas |
| 4 | Passar fotos aprovadas para a pasta público do cliente |

---

##### Template 2: Captação + Ads - [NOME DO CLIENTE] - [TEMPLATE]
> Mesma estrutura do Template 1, com foco em conteúdo para anúncios (tráfego pago).

##### Template 3: Editorial - [NOME DO CLIENTE] - [TEMPLATE]
> Mesma estrutura do Template 1, com foco em conteúdo editorial/orgânico.

---

#### 📋 Lista: Edição de vídeos

**Propósito:** Fila operacional de vídeos aguardando edição.

**Status:**

| # | Status | Categoria |
|---|---|---|
| 1 | PARA EDITAR | Único status ativo |

> 💡 Lista opera como inbox de tarefas de edição. Sem templates fixos — recebe tarefas criadas a partir do processo de captação.

---

#### 📋 Lista: Edição de fotos

**Propósito:** Fila operacional de fotos aguardando edição.

**Status:**

| # | Status | Categoria |
|---|---|---|
| 1 | PARA EDITAR | Único status ativo |

> 💡 Mesma lógica da lista de Edição de vídeos.

---

## 6. ÁREA 3 — Criação

### 6.1 Pasta: Criação

**Propósito:** Gestão mensal de produção de conteúdo de todos os clientes ativos.
**Padrão:** Uma lista por cliente (Cliente 1 a 10 + [TEMPLATE] Cliente).
**Visualizações da pasta:** Entregas · Follow-up · + 2 adicionais

#### 📋 Lista: [TEMPLATE] Cliente *(master template — clonado para cada cliente)*

**Propósito:** Template mestre de produção mensal de conteúdo.

**Visualização principal:** Publicações (Kanban por status)

**Status (Workflow de produção):**

| # | Status | Categoria | Cor |
|---|---|---|---|
| 1 | TEMPLATES | Não iniciado | Cinza |
| 2 | PLANEJAMENTO | Ativo | Vermelho |
| 3 | DESIGN | Ativo | Laranja |
| 4 | REVISÃO | Ativo | Laranja |
| 5 | PDF | Ativo | Verde |
| 6 | PARA ENTREGAR | Ativo | Verde |
| 7 | ENTREGUE | Ativo | Verde escuro |
| 8 | FECHADO | Fechado | Cinza |

**Campos personalizados:**

| Campo | Tipo | Descrição |
|---|---|---|
| `Mês referente` | Texto | Mês/ano da competência |
| `Mídia` | Dropdown com cor | Canal/rede social do conteúdo |
| `Funil` | Texto/Dropdown | Etapa do funil (topo/meio/fundo) |
| `Data` | Data | Data de publicação agendada |
| `Pack de entrega` | Label colorida | Agrupador de pacote mensal |

---

**9 Tarefas por lista de cliente (por canal de mídia):**

| # | Tarefa | Subtarefas | Campo Mídia |
|---|---|---|---|
| 1 | Feed - [NOME DO CLIENTE] - [TEMPLATE] | 32 (POST 01 a POST 32) | Feed |
| 2 | Stories - [NOME DO CLIENTE] - [TEMPLATE] | 29 (POST 01 a POST 29) | Stories |
| 3 | Facebook - [NOME DO CLIENTE] - [TEMPLATE] | 31 (POST 01 a POST 31) | Facebook |
| 4 | TikTok - [NOME DO CLIENTE] - [TEMPLATE] | 9 (POST 01 a POST 09) | TikTok |
| 5 | Linkedin - [NOME DO CLIENTE] - [TEMPLATE] | 9 (POST 01 a POST 09) | Linkedin |
| 6 | Twitter - [NOME DO CLIENTE] - [TEMPLATE] | 9 (POST 01 a POST 09) | Twitter |
| 7 | E-mail marketing - [NOME DO CLIENTE] - [TEMPLATE] | 7 (POST 01 a POST 07) | E-mail |
| 8 | Pinterest - [NOME DO CLIENTE] - [TEMPLATE] | 9 (POST 01 a POST 09) | Pinterest |
| 9 | Demanda extra - [NOME DO CLIENTE] - [TEMPLATE] 📝 | Sem subtarefas fixas | — |

---

**Estrutura de cada Tarefa de Mídia (ex.: Feed):**

```
Feed - [NOME DO CLIENTE] - [TEMPLATE]
│  Status: TEMPLATES → PLANEJAMENTO → DESIGN → REVISÃO → PDF → PARA ENTREGAR → ENTREGUE
│  Tipo: Pack de entrega (tipo customizado)
│  Campos: Data | Funil | Mês referente | Mídia = "Feed"
│  Descrição: 📌 LINK da visualização do feed no CANVA: [link]
│
└── POST 01 -
│    Tipo: Post (tipo customizado)
│    Campos: Data | Funil | Mês referente | Mídia = "Feed"
│    Descrição:
│      📌 Informações importantes | Referências:
│      🎨 Briefing design:
│         • Card 1:
│         • Card 2:
│         • Card 3: ...
│
├── POST 02 -  (mesma estrutura)
├── POST 03 -
│   ...
└── POST 32 -
```

> **Tipos de tarefa identificados:**
> - `Pack de entrega` → tipo para tarefas pai de cada canal
> - `Post` → tipo para cada publicação individual
> - `Offboarding` → tipo para tarefas de cancelamento
> - Padrão (sem tipo) → demais tarefas

---

#### 📋 Listas: Cliente 1 a Cliente 10

> Clones diretos do [TEMPLATE] Cliente com o nome do cliente real substituindo `[NOME DO CLIENTE]`.
> Cada lista mantém a mesma estrutura de 9 tarefas de mídia + subtarefas de POST.

---

## 7. ÁREA 4 — Ex-clientes

### 7.1 Pasta: Ex-clientes

**Propósito:** Arquivo histórico de clientes com contrato encerrado.

#### 📋 Lista: [TEMPLATE] Cliente

**Estrutura:** Idêntica ao template da pasta Criação.

**Campos visíveis:** Mês referente · Mídia · Funil

> 💡 Quando um cliente cancela (Cancelamento > 02. Operacional):
> a lista do cliente é **movida** da pasta Criação para Ex-clientes.
> A pasta do Drive é movida para "Clientes inativos".

---

## 8. Fluxos Operacionais

### Fluxo 1 — Entrada de novo cliente (Onboarding)

```
COMERCIAL fecha contrato
    ↓
[Onboarding] Nova tarefa criada (clone do template)
    ↓
ADMINISTRATIVO → preenche dados, contrato, Asaas, Drive
    ↓
KICK OFF → recebe pagamento, formaliza prazos
    ↓
AGUARDANDO C1 → aguarda assinatura/confirmação
    ↓
1º CONTATO → briefing, agendamento de reunião
    ↓
OPERACIONAL → setup completo: ClickUp, Drive, WhatsApp, plataformas
    ↓
PRODUÇÃO DO MACRO → cria planejamento estratégico (6 fases)
    ↓
REUNIÃO ESTRATÉGICA → apresenta macro, grava, cria ata
    ↓
FINALIZAÇÃO → cria tarefas de execução, primeira captação/conteúdo
    ↓
CONCLUÍDO → cliente ativo, lista criada na pasta Criação
```

### Fluxo 2 — Produção mensal de conteúdo (Criação)

```
Início do mês
    ↓
[Criação > Cliente X] Tarefas de cada canal reiniciam
    ↓
PLANEJAMENTO → estratégia e briefing de cada post
    ↓
DESIGN → produção visual (Canva/ferramentas)
    ↓
REVISÃO → cliente revisa e aprova
    ↓
PDF → geração de PDF de aprovação
    ↓
PARA ENTREGAR → conteúdo pronto para entrega
    ↓
ENTREGUE → agendado/publicado na plataforma
    ↓
FECHADO → pack do mês encerrado
```

### Fluxo 3 — Captação audiovisual

```
[Audiovisual > Planejamento] Criada tarefa de captação
    ↓
Planejamento → data, local, quantidade, roteiros, moodboard
    ↓
Dia da captação → execução
    ↓
[Edição de vídeos / Edição de fotos] → tarefa criada para o editor
PARA EDITAR → edita e envia para aprovação
    ↓
Aprovado → arquivos movidos para pasta pública do cliente no Drive
    ↓
Materiais disponíveis para uso em posts
```

### Fluxo 4 — Saída de cliente (Cancelamento)

```
Cliente solicita cancelamento
    ↓
[Cancelamento] Nova tarefa criada (clone do template)
    ↓
ADMINISTRATIVO → alinha última entrega, remove Asaas, Dados Fiscais, formaliza por e-mail
    ↓
OPERACIONAL → move Drive para inativo, move lista para Ex-clientes, remove do Google Agenda
    ↓
FINALIZAÇÃO → remove do Geral, encerra grupo WhatsApp, desconecta plataformas
    ↓
CONCLUÍDO → cliente arquivado em Ex-clientes
```

---

## 9. Integrações Identificadas

| Ferramenta | Uso identificado |
|---|---|
| **Google Drive** | Armazenamento de contratos, propostas, materiais do cliente, planejamentos |
| **Google Agenda** | Registro de início de contratos, agendamento de captações e reuniões |
| **Asaas** | Cobrança de KICK OFF e mensalidades dos clientes |
| **WhatsApp** | Grupos por cliente, comunicação de prazos e entregas |
| **Canva** | Produção visual dos posts (link no CANVA na descrição das tarefas de Feed) |
| **Plataforma de agendamento** | Agendamento automático de posts nas redes sociais |
| **Google Docs / ClickUp Docs** | Atas de reunião, briefings, planejamentos macro |
| **Planilha RECEITA E DESPESA** | Controle financeiro de clientes |
| **Planilha LANÇAMENTOS** | Controle de pagamentos (KICK OFF, mensalidades) |
| **Planilha de Dados Fiscais** | Cadastro fiscal de clientes |
| **Planilha template Geral** | Visão geral de todos os clientes ativos |
| **Brain² (IA ClickUp)** | Suporte interno para docs e automações |

---

## 10. Guia de Desenvolvimento

### 10.1 Modelo de Dados (Backend)

```
Clients
  id, name, status (active|inactive), created_at, contract_start, contract_end
  monthly_value, payment_day, kick_off_value

Onboarding
  id, client_id, current_step, started_at, completed_at
  responsible_user_id, month_reference

OnboardingStep
  id, onboarding_id, step_number, step_name, completed, completed_at
  type: enum(ADMINISTRATIVO|KICK_OFF|PRIMEIRO_CONTATO|OPERACIONAL|MACRO|REUNIAO|FINALIZACAO)

Cancellation
  id, client_id, current_step, started_at, completed_at
  month_reference, last_delivery_date

CancellationStep
  id, cancellation_id, step_number, step_name, completed
  type: enum(ADMINISTRATIVO|OPERACIONAL|FINALIZACAO)

AudiovisualCapture
  id, client_id, capture_type (captacao|captacao_ads|editorial)
  capture_date, location, month_reference, status

ContentProduction (Lista de cliente)
  id, client_id, month_reference, status

Publication (Tarefa de mídia)
  id, content_production_id, media_type, status, pack_delivery_id

Post (Subtarefa de publicação)
  id, publication_id, post_number, status
  scheduled_date, funnel_stage, media_type, month_reference
  canva_link, briefing, references, design_notes
```

### 10.2 Enums essenciais

```
OnboardingStatus:
  TEMPLATES | ADMINISTRATIVO | KICK_OFF | AGUARDANDO_C1
  PRIMEIRO_CONTATO | OPERACIONAL | PRODUCAO_MACRO
  REUNIAO_ESTRATEGICA | FINALIZACAO | CONCLUIDO

CancellationStatus:
  TEMPLATES | ADMINISTRATIVO | OPERACIONAL | FINALIZACAO | CONCLUIDO

ContentStatus:
  TEMPLATES | PLANEJAMENTO | DESIGN | REVISAO
  PDF | PARA_ENTREGAR | ENTREGUE | FECHADO

MediaType:
  FEED | STORIES | FACEBOOK | TIKTOK
  LINKEDIN | TWITTER | EMAIL_MARKETING | PINTEREST | DEMANDA_EXTRA

CaptureType:
  CAPTACAO | CAPTACAO_ADS | EDITORIAL

EditingStatus:
  PARA_EDITAR | CONCLUIDO

FunnelStage:
  TOPO | MEIO | FUNDO (a confirmar com a equipe)
```

### 10.3 Prioridade de desenvolvimento sugerida

```
SPRINT 1 — Core
  ✅ Autenticação / Usuários
  ✅ Cadastro de Clientes
  ✅ Pipeline de Onboarding (7 etapas + checklists)

SPRINT 2 — Produção de Conteúdo
  ✅ Lista de produção mensal por cliente
  ✅ Criação de publicações por canal (9 mídias)
  ✅ Gestão de posts individuais (POST 01..N)
  ✅ Kanban de status de produção

SPRINT 3 — Audiovisual
  ✅ Gestão de captações (3 tipos)
  ✅ Fila de edição de vídeos e fotos
  ✅ Integração com pasta do Drive

SPRINT 4 — Cancelamento e Arquivo
  ✅ Pipeline de offboarding (3 etapas)
  ✅ Área de Ex-clientes

SPRINT 5 — Integrações e Automações
  ✅ Webhooks para Asaas (pagamentos)
  ✅ Google Drive API (criação de pastas)
  ✅ Google Calendar API (eventos de captação/reunião)
  ✅ Notificações WhatsApp (via API)
  ✅ Relatórios gerenciais
```

### 10.4 Regras de negócio críticas

1. **Clonagem de template:** Ao concluir o Onboarding, criar automaticamente a lista do cliente na pasta Criação com os 9 canais e subtarefas de POST.
2. **Numeração de posts:** Cada canal tem um número máximo de posts: Feed=32, Stories=29, Facebook=31, demais=9, E-mail=7.
3. **Campo Mídia automático:** Ao criar um Post, herdar o tipo de Mídia da tarefa pai.
4. **Cancelamento → Ex-clientes:** Mover lista do cliente de Criação para Ex-clientes ao concluir o offboarding.
5. **Mês referente:** Sempre vinculado ao ciclo mensal — campo obrigatório em todos os módulos.
6. **Pack de entrega:** Cada canal por cliente forma um "pack" mensal entregue juntos.
7. **Aprovação em REVISÃO:** Bloquear avanço para PDF sem aprovação registrada.
8. **Captação gera tarefas de edição:** Ao confirmar captação, criar automaticamente tarefas nas listas Edição de vídeos e Edição de fotos.

### 10.5 Campos de formulário por tela

#### Tela: Novo cliente (Onboarding)
```
- Nome do cliente *
- Responsável pelo cliente (agência) *
- Valor do contrato mensal *
- Dia de vencimento da mensalidade *
- Valor do KICK OFF *
- Data de início do contrato *
- Mês de referência *
- Serviços prestados (text area)
- Dados do responsável do cliente:
    - Nome *
    - Cargo
    - WhatsApp *
    - E-mail *
```

#### Tela: Novo Post
```
- Número do post (auto)
- Canal/Mídia (herdado) *
- Data de publicação *
- Estágio do funil *
- Mês referente (herdado) *
- Link do CANVA
- Informações importantes / Referências (text area)
- Briefing de design (lista de cards)
- Responsável pelo design
- Responsável pelo planejamento
```

#### Tela: Nova Captação
```
- Cliente *
- Tipo de captação (Captação | Captação + Ads | Editorial) *
- Data da captação *
- Endereço / Local *
- Quantidade mínima de Reels
- Mês referente *
- Roteiro (text area)
- Link do Moodboard
- Responsável pela captação *
```

---

*Documento gerado a partir da varredura completa do ClickUp — [ESPAÇO] Operação OFICIAL*
*Agencia Pratic's Workspace — 30/06/2026*
