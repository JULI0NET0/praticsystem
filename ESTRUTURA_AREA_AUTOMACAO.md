# 📐 Documentação Técnica & Arquitetural: Área de Automação Instagram

> **Sistema:** PraticSystem (Agência Prátic / Pratic Labs)  
> **Módulo:** Automação de Instagram (`/automacao-instagram`)  
> **Status:** Operacional em Produção  
> **Objetivo:** Substituto nativo e autônomo do ManyChat, integrado diretamente com a Meta Graph API v25.0 e Supabase, eliminando custos recorrentes e limites de terceiros.

---

## 1. 🎯 Visão Geral do Módulo

A **Área de Automação de Instagram** é um sistema completo de disparo de mensagens diretas (DMs), respostas a comentários, controle de acesso a materiais (Follow Gate), triagem de contatos e rastreamento de cliques em links de conversão.

### Principais Casos de Uso:
1. **Envio de Links por Comentários:** O seguidor comenta uma palavra-chave (ex: `link`, `quero`) em um post/reel e recebe o material imediatamente por DM + resposta pública no comentário.
2. **Follow Gate (Exclusivo para Seguidores):** O lead só recebe o link/material se seguir o perfil. Caso contrário, recebe um convite com botão para confirmar o follow.
3. **Triagem & Captação de Leads:** Registro automático de IGSIDs, usernames e métricas de conversão para enriquecer o banco de contatos da agência.
4. **Respostas em 3 Formatos de CTA:** Link direto instantâneo, botão fixo interativo ou sugestão de resposta rápida.

---

## 2. 🏗️ Arquitetura & Fluxo de Dados

```mermaid
flowchart TD
    User([Usuário no Instagram]) -->|Comenta em Post/Reel| MetaIG[Instagram / Meta Graph API]
    MetaIG -->|Webhook POST com assinatura SHA256| WebhookRoute[/api/instagram/webhook]
    
    subgraph Backend [PraticSystem Backend & Supabase]
        WebhookRoute -->|Valida Assinatura| VerifyHMAC{Assinatura Válida?}
        VerifyHMAC -->|Sim| MatchEngine[Motor de Correspondência de Palavra-Chave]
        
        MatchEngine -->|Upsert Contato| DBContacts[(ig_contacts)]
        MatchEngine -->|Enfileira DM com DedupeKey| DBQueue[(ig_message_queue)]
        MatchEngine -->|Responde Comentário Público| IGReply[Meta API - Reply Comment]
        
        CronJob[pg_cron / Drain Queue] -->|Drena com Rate Limit| SendDM[Meta API - Send Message]
        SendDM -->|Entrega DM| User
    end

    User -->|Clica no Link/Botão| InteractionHandler{Tipo de Ação}
    InteractionHandler -->|Link Direto| RedirectRoute[/api/instagram/click/:id]
    RedirectRoute -->|Registra Clique| DBClicks[(ig_link_clicks)]
    RedirectRoute -->|Redireciona 302| Destination[Destino Final]
    
    InteractionHandler -->|Botão / Postback| WebhookRoute
    WebhookRoute -->|Se Follow Gate Ativo| FollowCheck{Segue o Perfil?}
    FollowCheck -->|Não| SendGatePrompt[Envia Aviso 'Siga o Perfil']
    FollowCheck -->|Sim| SendUnlockedLink[Envia o Link / Material]
```

---

## 3. 📂 Mapeamento de Arquivos e Pastas

```
praticsystem/
├── src/
│   ├── app/
│   │   ├── automacao-instagram/
│   │   │   ├── page.tsx                  # Server Component principal (carrega dados SSR)
│   │   │   ├── AutomationsClient.tsx     # Client Component (UI completa, abas, modais, stats)
│   │   │   ├── InstagramPostPicker.tsx   # Seletor visual de posts/reels do Instagram com métricas
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Tela de login com senha de administrador
│   │   │   └── resultados/
│   │   │       └── page.tsx              # Visualização detalhada de métricas e funil
│   │   ├── api/
│   │   │   └── instagram/
│   │   │       ├── auth/
│   │   │       │   ├── login/route.ts    # Validação de senha e emissão de cookie de sessão
│   │   │       │   └── logout/route.ts   # Encerramento de sessão
│   │   │       ├── automations/
│   │   │       │   ├── route.ts          # CRUD de automações (GET/POST)
│   │   │       │   └── [id]/route.ts     # Atualização/Exclusão de automação individual (PATCH/DELETE)
│   │   │       ├── click/
│   │   │       │   └── [queueId]/route.ts# Rastreamento de clique e redirect 302
│   │   │       ├── media/
│   │   │       │   └── route.ts          # Busca de posts recentes e métricas (views/likes/comments)
│   │   │       ├── oauth/
│   │   │       │   ├── start/route.ts    # Início do fluxo OAuth da Meta Graph API
│   │   │       │   └── callback/route.ts # Troca de code por token de longa duração (60 dias)
│   │   │       ├── queue/
│   │   │       │   └── drain/route.ts    # Processador da fila de mensagens (executado por cron/manual)
│   │   │       └── webhook/
│   │   │           └── route.ts          # Endpoint Webhook da Meta (comentários, mensagens, postbacks)
│   │   ├── instagram-privacidade/page.tsx # Página pública de Política de Privacidade (requisito Meta)
│   │   └── instagram-exclusao-dados/page.tsx # Página pública de Exclusão de Dados (requisito Meta)
│   ├── lib/
│   │   └── instagram.ts                  # Métodos auxiliares, tipos, Graph API helpers, sessões
│   └── proxy.ts                          # Middleware de proteção das rotas de automação
├── migration_instagram_automation.sql    # Schema inicial do banco de dados
├── migration_instagram_cta_type.sql      # Migração para os 3 formatos de CTA
└── migration_instagram_cron.sql          # Configuração de cron job no Supabase (pg_cron)
```

---

## 4. 🗄️ Modelo de Dados (Supabase / Postgres)

Todas as tabelas utilizam o prefixo isolado `ig_` e possuem **Row Level Security (RLS)** habilitado sem políticas públicas, garantindo acesso exclusivo via chave `service_role` no servidor:

| Tabela | Descrição | Principais Colunas |
| :--- | :--- | :--- |
| **`ig_config`** | Configuração e credenciais da conta conectada | `ig_user_id`, `ig_username`, `access_token`, `token_expires_at`, `connected_at` |
| **`ig_automations`** | Regras de automação configuradas | `name`, `is_active`, `post_id`, `keywords` (array), `match_mode` (`contains`/`exact`), `comment_reply_text`, `dm_message_text`, `dm_button_text`, `dm_button_url`, `cta_type` (`link`/`button`/`quick_reply`), `require_follow`, `follow_gate_message`, `follow_gate_button_text` |
| **`ig_contacts`** | Leads que interagiram com o perfil | `igsid` (ID único no Instagram), `username`, `first_seen_at`, `last_seen_at` |
| **`ig_message_queue`** | Fila de envio assíncrona anti-bloqueio | `automation_id`, `igsid`, `comment_id`, `message_text`, `button_text`, `button_url`, `cta_type`, `status` (`pending`/`sending`/`sent`/`failed`), `attempts`, `error`, `dedupe_key`, `sent_at` |
| **`ig_link_clicks`** | Rastreamento de conversão | `queue_id`, `automation_id`, `igsid`, `created_at` |
| **`ig_logs`** | Auditoria e histórico de execuções | `level` (`info`/`error`), `event`, `payload` (JSONB), `created_at` |

---

## 5. ⚙️ Funções e Mecanismos Principais

### 5.1. Motor de Correspondência (`findMatchingAutomation`)
- **Filtro de Post:** Se a automação tiver `post_id`, só dispara se o comentário for naquela publicação. Se `post_id` for nulo, aplica para qualquer publicação do perfil (Global).
- **Match Mode:**
  - `contains`: Dispara se a mensagem do comentário contiver qualquer uma das palavras-chave configuradas (ex: "quero o link" contém "link").
  - `exact`: Dispara apenas se o comentário for idêntico à palavra-chave.

### 5.2. Os 3 Formatos de CTA (`cta_type`)
1. **`link` (Link Direto):**
   - Usa template `web_url`.
   - Abre o link diretamente no navegador ao toque.
   - O link passa por `/api/instagram/click/[queueId]` para registrar o clique e redireciona (302).
2. **`button` (Botão Fixo):**
   - Usa template `postback`.
   - Fica fixo no balão da mensagem no direct.
   - Ao tocar, aciona o webhook que registra a interação e dispara a 2ª mensagem com o link/material.
3. **`quick_reply` (Sugestão de Resposta):**
   - Exibe pílulas de resposta rápida acima do teclado.
   - Some assim que o usuário toca ou responde outra coisa.

### 5.3. Follow Gate (Verificação de Seguidor)
- Consulta o endpoint da Graph API `/{igsid}?fields=is_user_follow_business`.
- **Se não seguir:** Envia mensagem personalizada (`follow_gate_message`) com botão de confirmação ("Pronto, agora te sigo").
- **Ao tocar no botão de confirmação:** O webhook reavalia o status de follow. Se confirmado, destrava e entrega o material.
- **Fallback Seguro:** Caso haja instabilidade na API da Meta ou ausência de consentimento, o sistema libera o conteúdo por segurança para não travar o lead.

### 5.4. Fila Segura Anti-Spam (`/api/instagram/queue/drain`)
- **Teto por Hora:** Respeita `IG_HOURLY_SEND_CAP` (padrão: 60 envios/hora) para evitar punições ou bloqueios de API.
- **Deduplicação (`dedupe_key`):** Garante que reenvios de webhooks da Meta não gerem DMs duplicadas para o mesmo comentário.
- **Janela de 24h:** O primeiro disparo utiliza o `comment_id` do usuário como `recipient` (resposta privada autorizada pela Meta), permitindo abrir a conversa mesmo fora da janela padrão de 24 horas de DM.

---

## 6. 🎨 Estrutura Visual & Layout (UI/UX)

A interface em `AutomationsClient.tsx` foi construída com foco em produtividade, estética refinada e alinhamento com a identidade visual da Prátic (Terracotta, Dark/Light mode).

### 6.1. Navegação & Abas
- **🏠 Inicial (Home):**
  - Saudação personalizada e status do canal conectado.
  - Grade de **Modelos Rápidos (Templates)** com badges ("POPULAR", "NOVO", "ESSENCIAL").
  - Card de **"Próximas Melhores Ações" (Checklist)** com barra de progresso interativa.
  - Indicadores em tempo real (Automações Ativas, DMs Entregues, Cliques no Link, Na Fila).
- **⚡ Minhas Automações:**
  - Listagem com badges de status (Ativa/Pausada), tag de "Follow Gate", palavras-chave e prévias.
  - Barra de busca por nome/palavra-chave e filtros rápidos (Todas, Ativas, Pausadas).
  - Ações diretas de Pausar/Ativar, Editar e Excluir.
- **👥 Contatos:**
  - Tabela organizada com usernames do Instagram (`@usuario`), IGSIDs e data da última interação.
- **📥 Caixa de Entrada & Fila:**
  - Monitoramento da fila de disparo (Na fila, Enviadas, Falharam).
  - Botão de ação manual **"Drenar Fila Agora"**.
  - Terminal/Log de eventos recentes em tempo real.
- **📊 Resultados (Analytics & Funil):**
  - Funil de 3 etapas com taxas de conversão percentuais:
    1. Comentários Recebidos (100%)
    2. DMs Entregues (Taxa de entrega)
    3. Cliques no Link (Taxa de conversão final)
- **✨ Pratic AI:**
  - Hub de atalhos e templates inteligentes pré-configurados.
- **⚙️ Configurações:**
  - Status da conexão OAuth com a Meta, ID da conta, data de expiração do token e botão para reconectar.

### 6.2. Modais e Componentes Interativos
- **Modal de Criação / Edição:**
  - Inputs com design limpo e validação.
  - **Seletor de Posts (`InstagramPostPicker`):** Grid visual que busca automaticamente os posts e reels mais recentes do perfil via Graph API, exibindo thumbnails, contagem de visualizações (views), likes, comentários e opção de seleção global ("Qualquer post").
  - Seletor dos 3 modos de CTA com explicação contextual.
  - Switch interativo de "Follow Gate" com campos customizáveis de mensagem e botão de confirmação.
- **Simulador de Disparos:**
  - Modal para testar palavras-chave em tempo real sem precisar postar no Instagram.

---

## 7. 🔒 Segurança e Autenticação

1. **Acesso ao Painel:**
   - Protegido por middleware em `src/proxy.ts`.
   - Autenticação baseada em senha mestra (`IG_SESSION_SECRET`) armazenada em cookie HttpOnly (`ig_admin_session`).
2. **Segurança do Webhook:**
   - Validação criptográfica de integridade através de HMAC-SHA256 (`x-hub-signature-256`) utilizando o `IG_APP_SECRET`.
   - Handshake de verificação inicial com `hub.challenge` e `IG_WEBHOOK_VERIFY_TOKEN`.
3. **Proteção de Dados:**
   - Supabase RLS ativo em todas as tabelas `ig_*`.
   - Execuções de backend isoladas através de chave `service_role`.

---

## 8. 💡 Oportunidades de Evolução e Aprimoramento

Para as próximas fases de desenvolvimento e melhoria contínua, destacam-se:

1. **Gatilhos Adicionais:**
   - Respostas automáticas a Menções nos Stories.
   - Respostas a mensagens diretas recebidas na DM (Live Chatbot).
2. **Integração com IA Generativa (Gemini / Claude):**
   - Respostas contextuais dinâmicas a dúvidas frequentes com IA antes do redirecionamento.
   - Variação automática de respostas a comentários para evitar repetição artificial (ex: 5 variações aleatórias de "Te mandei no direct!").
3. **Multi-Contas / Multi-Clientes:**
   - Suporte para gerenciar múltiplos perfis de clientes da agência na mesma interface.
4. **Variáveis Dinâmicas nas Mensagens:**
   - Suporte a tags como `{first_name}`, `{username}` e `{post_title}` no corpo das DMs.
5. **Automação de Renovação de Token:**
   - Job agendado para renovar tokens de longa duração (60 dias) automaticamente antes da expiração.
