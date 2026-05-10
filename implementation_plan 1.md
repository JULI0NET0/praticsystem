# Agência Prátic — Sistema Integrado de Gestão

## Plano de Execução por Fases

Plataforma completa de gestão para agência, com estética **Apple Liquid Glass** — minimalismo premium com efeitos de glassmorphism, micro-animações suaves e paleta dark restrita.

## Conceitos Visuais

````carousel
![Conceito do Dashboard](/Users/julioneto/.gemini/antigravity/brain/e43b7ac1-b6f1-43ae-b8c7-c6cb0f26e46b/dashboard_concept_1777836757532.png)
<!-- slide -->
![Conceito do Login](/Users/julioneto/.gemini/antigravity/brain/e43b7ac1-b6f1-43ae-b8c7-c6cb0f26e46b/login_concept_1777836786522.png)
````

---

## Design System — Identidade Visual

### Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg-primary` | `#0A0A0A` | Fundo principal da maioria das telas |
| `--bg-secondary` | `#1C1C1C` | Cards, modais, slides alternados |
| `--bg-light` | `#F1EFED` | Capa, slides de respiro, onboarding |
| `--accent` | `#F97316` | Acento único de impacto (CTAs, badges, gráficos) |
| `--text-primary` | `#FFFFFF` | Texto principal sobre dark |
| `--text-secondary` | `#A8A8A8` | Texto de suporte, labels, corpo |
| `--text-dark` | `#0A0A0A` | Texto sobre fundos claros |
| `--border` | `#282828` | Divisores, bordas sutis de cards |

### Estilo Visual

- **Liquid Glass**: Cards e sidebar com `backdrop-filter: blur(20px)` + fundo semitransparente `rgba(28, 28, 28, 0.6)` + borda fina `1px solid #282828`
- **Tipografia**: Google Font **Outfit** (geométrica, clean, moderna) — títulos em peso 700, corpo em 400
- **Micro-animações**: Transições suaves de 300ms com `ease-out` em hover, entrada de cards com fade-in + translate-Y
- **Border-radius**: 16px para cards, 12px para inputs, 8px para badges
- **Sombras**: Glow sutil com `box-shadow: 0 0 40px rgba(249, 115, 22, 0.05)` no hover de cards

### Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | **Next.js 15** (App Router) |
| Linguagem | **TypeScript** |
| Estilos | **CSS Vanilla** (variáveis CSS nativas) |
| Fontes | **Google Fonts (Outfit)** |
| Dados | **Mocks estáticos** (migração futura para Supabase) |
| Ícones | **Lucide React** |

---

## Fase 1 — Setup do Projeto + Design System

> **Objetivo**: Base técnica funcional com design system codificado.

### Entregas

#### [NEW] Projeto Next.js
- `npx create-next-app@latest ./` com TypeScript, App Router, sem Tailwind

#### [NEW] `src/styles/globals.css`
- Variáveis CSS da paleta completa
- Reset CSS premium (sem margens, box-sizing)
- Classes utilitárias: `.glass-card`, `.glass-sidebar`, `.btn-accent`, `.input-dark`
- Animações globais: `@keyframes fadeInUp`, `@keyframes shimmer`
- Tipografia: import Outfit do Google Fonts
- Estilos responsivos base

#### [NEW] `src/styles/components.css`
- Estilos isolados para componentes reutilizáveis (botões, inputs, badges, tabelas, tooltips)

#### [NEW] `src/types/database.ts`
- Interfaces TypeScript espelhando as tabelas: `Client`, `Service`, `Contract`, `Invoice`, `AgendaEvent`, `PortfolioCase`, `User`

#### [NEW] `src/mocks/db.ts`
- Dados mockados realistas para todas as entidades
- 5 clientes, 4 serviços, 8 contratos, 12 faturas, 10 eventos de agenda, 6 cases de portfólio

### Verificação
- `npm run dev` roda sem erros
- Variáveis CSS carregam no browser

---

## Fase 2 — Layout Base + Tela de Login

> **Objetivo**: Sidebar glassmorphism funcional + autenticação visual completa.

### Entregas

#### [NEW] `src/app/(auth)/page.tsx` — Login
- Card central com efeito liquid glass sobre fundo `#0A0A0A`
- Gradientes ambientes sutis em laranja escuro no background
- Inputs de email/senha com estilo dark
- Botão "Entrar" com `#F97316`
- Link "Esqueci minha senha" em `#A8A8A8`
- Animação de entrada do card (fade-in + scale)
- Login simula autenticação e redireciona para `/admin/dashboard`

#### [NEW] `src/app/admin/layout.tsx` — Layout do Painel
- **Sidebar retrátil** com glassmorphism (`backdrop-filter: blur`)
- Logo "Prátic" no topo
- Itens de menu: Dashboard, Clientes, Serviços, Contratos, Financeiro, Agenda
- Ícones via Lucide React
- Estado aberto/fechado com animação suave
- Indicador visual de rota ativa com acento laranja
- **Topbar**: Busca, notificações, avatar do usuário

#### [NEW] `src/components/Sidebar.tsx`
#### [NEW] `src/components/Topbar.tsx`

### Verificação
- Login funcional com redirecionamento
- Sidebar colapsa/expande com animação fluida
- Layout responsivo em desktop

---

## Fase 3 — Dashboard Financeiro/Operacional

> **Objetivo**: Visão 360° da saúde da agência com dados mockados.

### Entregas

#### [NEW] `src/app/admin/dashboard/page.tsx`

**Componentes da página:**

1. **KPI Cards** (3 cards glass):
   - Previsão de Faturamento (com ícone de tendência)
   - Faturamento Realizado (com badge de progresso)
   - Previsão de Gastos
   - Cada card com hover glow sutil em laranja

2. **Gráfico de Evolução de Receita**:
   - Gráfico de área com gradiente laranja
   - Filtros por período (mês/trimestre/ano)
   - Usando canvas nativo ou biblioteca leve (Recharts)

3. **Acesso Rápido a Clientes**:
   - Lista lateral com avatares, nome e status
   - Link direto para `/admin/clients/:id`

4. **Tabela de Atividades Recentes**:
   - Últimas movimentações financeiras (entradas/saídas)
   - Status com badges coloridos

5. **Link para Agenda**:
   - Card com próximos 3 compromissos do dia

6. **Links de Cadastros Rápidos**:
   - Botões para "Novo Cliente", "Novo Serviço", "Novo Contrato"

#### [NEW] `src/components/KPICard.tsx`
#### [NEW] `src/components/RevenueChart.tsx`
#### [NEW] `src/components/ActivityTable.tsx`
#### [NEW] `src/components/QuickAccess.tsx`

### Verificação
- Todos os cards renderizam dados mockados
- Gráfico exibe curva com dados simulados
- Hover effects e animações funcionam

---

## Fase 4 — Módulos de Gestão

> **Objetivo**: Telas CRUD completas para Clientes, Serviços, Contratos e Financeiro.

### Fase 4.1 — Gestão de Clientes

#### [NEW] `src/app/admin/clients/page.tsx`
- Tabela de clientes com busca por nome/CNPJ
- Botão "Novo Cliente" abre modal glass
- Clique na linha navega para detalhe

#### [NEW] `src/app/admin/clients/[id]/page.tsx`
- **Card Dados Cadastrais**: Formulário editável (nome, CNPJ, contato, endereço)
- **Lista de Acessos (Redes Sociais)**: Senhas mascaradas com toggle de visibilidade
- **Mural de Observações**: Timeline de notas com input para adicionar
- **Galeria de Arquivos**: Grid de documentos com ícones por tipo

#### [NEW] `src/components/ClientForm.tsx`
#### [NEW] `src/components/SocialAccessCard.tsx`
#### [NEW] `src/components/NotesTimeline.tsx`

---

### Fase 4.2 — Catálogo de Serviços

#### [NEW] `src/app/admin/services/page.tsx`
- Tabela de serviços com edição inline
- Botão "Adicionar Serviço" com modal
- Badges indicando tipo: Recorrente, Avulso, Parcelado
- Campos: nome, descrição, preço, prazo, is_recurring

---

### Fase 4.3 — Contratos

#### [NEW] `src/app/admin/contracts/page.tsx`
- Tabela de contratos com badge de vencimento (dias restantes)
- Cores: verde (> 30 dias), amarelo (15-30), vermelho (< 15)
- Botão "Renovação Automática" com toggle
- Link para visualizar PDF do contrato
- Filtro por status (ativo, vencendo, encerrado)

---

### Fase 4.4 — Financeiro

#### [NEW] `src/app/admin/billing/page.tsx`
- Tabela de faturas com filtro por status (Pendente, Pago, Atrasado)
- Botão "Confirmar Recebimento" muda status para Pago
- Botão "Exportar Relatório" (gera CSV mockado)
- Cards resumo no topo: Total Pendente, Total Pago, Total Atrasado

### Verificação Fase 4
- Navegação entre todas as rotas funcional
- Modais abrem/fecham com animação
- Dados mockados populam todas as tabelas
- Ações simuladas (criar, editar) atualizam estado local

---

## Fase 5 — Páginas Públicas + Agenda

> **Objetivo**: Site institucional público + agenda da equipe.

### Fase 5.1 — Home Institucional

#### [NEW] `src/app/(public)/home/page.tsx`
- Hero section com fundo `#F1EFED` (claro) e texto `#0A0A0A`
- Seção "Sobre Nós" com números animados (counter-up)
- Grid de serviços com cards glass (versão light)
- Botão "Falar com Consultor" em `#F97316`

---

### Fase 5.2 — Portfólio

#### [NEW] `src/app/(public)/portfolio/page.tsx`
- Filtro de categorias (tabs com estilo pill)
- Grid masonry de cases
- Cada case: imagem, título, descrição, resultados
- Hover com overlay escuro + CTA

---

### Fase 5.3 — Onboarding de Cliente

#### [NEW] `src/app/(public)/onboarding/page.tsx`
- Formulário multi-step com progress bar
- Step 1: Dados da empresa
- Step 2: Acessos de redes sociais (Facebook, Instagram, TikTok)
- Step 3: Confirmação e envio
- Botão "Finalizar Cadastro" fecha o fluxo

---

### Fase 5.4 — Agenda da Equipe

#### [NEW] `src/app/admin/schedule/page.tsx`
- Calendário mensal/semanal interativo
- Botão "Novo Compromisso" com modal
- Filtros por tipo (captação, reunião, pagamento, contato, demanda)
- Filtro por responsável
- Lista de compromissos do dia na lateral
- Tipos com cores distintas

### Verificação Fase 5
- Navegação pública funcional (/home, /portfolio, /onboarding)
- Calendário renderiza eventos mockados
- Formulário multi-step avança e regride corretamente

---

## Estrutura Final de Diretórios

```text
PRATIC SYSTEM/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── page.tsx                    # Login
│   │   ├── (public)/
│   │   │   ├── home/page.tsx               # Home Institucional
│   │   │   ├── portfolio/page.tsx          # Portfólio
│   │   │   └── onboarding/page.tsx         # Onboarding
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Sidebar + Topbar
│   │   │   ├── dashboard/page.tsx          # Dashboard
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx                # Lista de Clientes
│   │   │   │   └── [id]/page.tsx           # Detalhe do Cliente
│   │   │   ├── services/page.tsx           # Catálogo de Serviços
│   │   │   ├── contracts/page.tsx          # Contratos
│   │   │   ├── billing/page.tsx            # Financeiro
│   │   │   └── schedule/page.tsx           # Agenda
│   │   ├── layout.tsx                      # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── KPICard.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── ActivityTable.tsx
│   │   ├── QuickAccess.tsx
│   │   ├── ClientForm.tsx
│   │   ├── SocialAccessCard.tsx
│   │   └── NotesTimeline.tsx
│   ├── mocks/
│   │   └── db.ts
│   ├── types/
│   │   └── database.ts
│   └── styles/
│       ├── globals.css
│       └── components.css
├── package.json
└── tsconfig.json
```

---

## Cronograma Estimado

| Fase | Entregas | Complexidade |
|------|----------|-------------|
| **Fase 1** | Setup + Design System + Mocks | 🟢 Baixa |
| **Fase 2** | Login + Sidebar + Layout | 🟡 Média |
| **Fase 3** | Dashboard completo | 🟡 Média |
| **Fase 4** | 4 módulos de gestão (Clientes, Serviços, Contratos, Financeiro) | 🔴 Alta |
| **Fase 5** | Páginas públicas + Agenda | 🟡 Média |

---

## User Review Required

> [!IMPORTANT]
> **Aprovação necessária antes de começar:**
> 1. A **paleta de cores** e o estilo **Apple Liquid Glass** estão alinhados com sua visão?
> 2. Quer usar **CSS Vanilla** (sem Tailwind) como proposto?
> 3. A ordem das **fases** faz sentido? Quer priorizar algum módulo específico?
> 4. Quer que comece pela **Fase 1** imediatamente após aprovação?

> [!NOTE]
> O projeto usará dados **100% mockados** nesta primeira etapa. A migração para Supabase pode ser feita depois sem refatorar a UI — basta trocar os imports de `mocks/db.ts` por chamadas ao banco.
