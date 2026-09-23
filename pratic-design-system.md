# Pratic — Design System

> Fonte da verdade: `src/styles/theme.css` (tokens), `src/styles/components.css` (componentes), `src/components/ui/*` (primitivos React) e `pratic-brand-identity.skill` (marca da agência).
> Este arquivo substitui o antigo `design-system (1).md` (v1.1, Poppins/Lora), que está defasado.

---

## 0. Como usar este arquivo

A Pratic tem **dois contextos visuais** que compartilham a marca mas **não** a paleta completa. Antes de desenhar qualquer coisa, decida em qual está:

| Contexto | O que é | Onde vale | Cor de acento |
|---|---|---|---|
| **A · Produto (Pratic System)** | App de gestão da agência: dashboard, demandas, financeiro, clientes, agenda, chat | Tudo em `/admin`, `/client`, `/login`, `/onboarding` | Coral `#D97757` sobre pergaminho quente, com modo escuro |
| **B · Peças da marca** | Posts, stories, propostas, PDFs, capas, assinaturas da própria agência | Instagram @julioneto.ia / Pratic, documentos comerciais | Laranja Pratic `#F2581A` sobre preto/branco |

Regra de decisão: **tela com sidebar, tabela, formulário ou KPI → Contexto A.** **Peça de comunicação com símbolo e frase de impacto → Contexto B.** Nunca misture: coral `#D97757` não entra numa peça da marca, e `#F2581A` não entra na interface do app.

Idioma de toda a interface e de todo texto: **português do Brasil**.

---

## 1. Princípios

1. **Direto ao ponto.** Slogan da agência: *"Pratic: direto ao ponto."* Interface densa, sem floreio, uma ação de destaque por tela.
2. **Quente, não estéril.** Pergaminho `#FAF9F5` em vez de branco/cinza frio. Tinta `#1B1C1A` em vez de preto puro.
3. **Plano e opaco.** Sem glassmorphism, sem blur, sem glow, sem sombras pesadas. A separação entre superfícies vem da **borda**, não de sombra nem de transparência.
4. **Hierarquia por peso, não por tamanho.** Numa tela de dados tudo fica entre 11–15px; o que diferencia é `font-weight`.
5. **Cada cor tem um papel fixo.** Coral = ação. Azul = informação e foco de campo. Oliva = sucesso. Vermelho = erro/destrutivo. Nunca trocam de função.
6. **Acessível por padrão.** AA em texto, nos dois temas. Estado nunca depende só de cor.

---

## 2. Cor — Contexto A (Produto)

Tema **claro é o padrão** (`:root`). O escuro é um override via `[data-theme='dark']` (next-themes, sem detecção de sistema).

### 2.1 Superfícies

| Papel | Token | Claro | Escuro | Uso |
|---|---|---|---|---|
| Canvas | `--color-surface-canvas` | `#FAF9F5` | `#141413` | Fundo da página, área de conteúdo |
| Raised | `--color-surface-raised` | `#FFFFFF` | `#22211E` | Cards, sidebar, modais, inputs, popovers |
| Sunken | `--color-surface-sunken` | `#F4F4F0` | `#1A1917` | Cabeçalho de tabela, hover de linha, empty state, ghost hover |
| Inset | `--color-surface-inset` | `#EFEEEA` | `#2A2825` | Poço dentro de card (campos embutidos) |
| Inverse | `--color-surface-inverse` | `#1B1C1A` | `#FAF9F5` | Tooltip, toast |
| Scrim | `--color-scrim` | tinta 45% | tinta 45% | Véu atrás de modal — **sem blur** |

### 2.2 Bordas

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--color-border-subtle` | `#E3E2DF` | `#3A3833` | Divisores, borda de card, linhas de tabela |
| `--color-border-default` | `#C7C7BF` | `#4A4740` | Inputs, botão secundário, menus |
| `--color-border-strong` | `#777871` | `#6E6B62` | Hover de controle |

> ⚠️ No escuro a diferença de preenchimento entre `#22211E` e `#141413` é ~1.08:1 — praticamente invisível. **A borda é quem carrega a hierarquia.** Nunca tire a borda de um card no tema escuro.

### 2.3 Texto

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--color-text-primary` | `#1B1C1A` | `#F5F4EF` | Corpo, títulos, valores |
| `--color-text-secondary` | `#5E5D59` | `#B5B2A8` | Descrições, labels de campo |
| `--color-text-tertiary` | `#6E6D66` | `#96948B` | Placeholder, metadados, cabeçalho de tabela |
| `--color-text-muted` | `#87867F` | `#7A786F` | **Só ícones e divisores** (≈3.4:1, reprova AA para texto) |
| `--color-text-on-accent` | `#1B1C1A` | `#1B1C1A` | Rótulo sobre coral — **escuro, não branco** |
| `--color-text-on-danger` | `#FFFFFF` | `#FFFFFF` | Rótulo sobre vermelho |

### 2.4 Acento de marca — coral / terracota

| Token | Hex | Uso |
|---|---|---|
| `--color-terracotta` | `#D97757` | **CTA primário**, fundo de botão sólido |
| `--color-terracotta-hover-solid` | `#E08A6E` | Hover do botão sólido (clareia) |
| `--color-terracotta-active-solid` | `#EBA48F` | Pressed do botão sólido |
| `--color-terracotta-700` | `#C96442` | Borda/hover em superfície, eyebrow, ponto de badge |
| `--color-terracotta-800` | `#B84627` | Pressed em superfície |
| `--color-terracotta-100` | `#FFF1ED` (escuro `#3A2419`) | Wash: item ativo da sidebar, badge accent |
| `--color-terracotta-200` | `#F3DFD3` (escuro `#4A2E20`) | Wash forte / borda |
| `--color-terracotta-ink` | `#A54A29` (escuro `#E8A98D`) | **Texto** sobre o wash terracota |
| `--color-selection-bg` | coral 30% (escuro 38%) | `::selection` |

**Regra crítica de contraste:** o rótulo do botão primário é **tinta escura** (`#1B1C1A`, 5.48:1), não branco (branco sobre `#D97757` dá 3.12:1 e reprova AA). Por isso o hover **clareia** o fundo (sobe o contraste para 6.54:1); escurecer para o `-700` derrubaria para 4.39:1. Texto pequeno sobre wash usa `terracotta-ink`, nunca `-700` (3.54:1).

### 2.5 Famílias semânticas

Cada família tem três tokens: cor base, **ink** (texto sobre o wash) e **wash** (fundo tonal). Os inks já foram escurecidos para passar AA em texto de 11px sobre o próprio wash.

| Família | Papel | Base | Ink (claro → escuro) | Wash (claro → escuro) |
|---|---|---|---|---|
| **Success** (oliva) | Sucesso, concluído, pago | `#788C5D` | `#4A5838` → `#9CB381` | `#E6EADD` → `#232A1C` |
| **Info** (azul) | Informação, em andamento, **foco de campo** | `#6A9BCC` | `#3A6491` → `#8FB6DE` | `#E3ECF6` → `#1D2733` |
| **Warning** (âmbar-terracota) | Atenção, atrasando | `#D37F49` | `#A03B1F` → `#E0A276` | `#F3DFD3` → `#34241A` |
| **Danger** (vermelho) | Erro, exclusão, irreversível | `#B23B2E` | `#8F2E23` → `#E0897A` | `#F5E1DC` → `#331D19` |

**Papéis fixos — nunca invertidos:**
- Coral **nunca** significa erro. Vermelho **nunca** é CTA.
- Azul **nunca** é ação primária. Foco de campo é **sempre azul**, nunca coral.
- Oliva **nunca** é decoração neutra.
- Não use vermelho/verde genéricos de Tailwind para feedback — use as famílias acima.

### 2.6 Cores categóricas (kanban, tags, séries de gráfico)

Codificam **categoria**, não estado. Dessaturadas e escurecidas (~50–55% de luminosidade) para assentar no pergaminho. Ordem estável de atribuição para séries sem cor definida:

```
terracotta #C96442 · blue #5B84AD · olive #788C5D · amber #BE8A4A · violet #8A6FA0
teal #5A9188 · rose #B05C63 · indigo #6A6FA8 · magenta #A66189 · green #5E7F52 · slate #6E6D66
```

Faixa de kanban usa a cor cheia; o wash é a mesma cor a ~10% de opacidade (`hex + "1A"`). Para **estado** de um status use o tom semântico: não iniciado → neutral, ativo → info, fechado → success.

### 2.7 Cores de terceiros (intocáveis)

Ícones de redes sociais mantêm a cor da própria marca e **nunca** são recoloridos com tokens Pratic:
Google `#4285F4` · Instagram `#E1306C` · Facebook `#1877F2` · LinkedIn `#0A66C2` · Pinterest `#E60023` · WhatsApp `#25D366` · YouTube `#FF0000` · TikTok `#000000`.

---

## 3. Cor — Contexto B (Peças da marca)

Marca **monocromática + 1 cor de destaque**. Nunca introduza uma segunda cor de acento (azul, verde, roxo…).

| Cor | Hex | Uso |
|---|---|---|
| Preto | `#000000` | Fundo principal, fundo padrão do símbolo |
| Cinza escuro | `#272727` | Fundo escuro alternativo |
| Cinza médio | `#8C8C8C` | Texto secundário, palavra não destacada, rodapé de documento |
| Cinza linha | `#D9D9D9` | Filetes divisórios em documentos |
| Cinza fundo | `#F2F4F7` | Caixas e zebra de tabela **em documentos** (não em posts) |
| Branco gelo | `#F3F4F8` | "Branco" padrão de texto/símbolo sobre escuro (levemente frio) |
| Branco | `#FFFFFF` | Alternativa menos frequente |
| **Laranja Pratic** | **`#F2581A`** | Palavra-chave, símbolo de destaque, fundo do logo "pratic.", cabeçalho de tabela de preços |

Padrão de peça (vertical ~9:16, cantos arredondados): símbolo pequeno centralizado no topo com respiro → fundo (preto/cinza sólido, foto dessaturada, gradiente laranja ou foto com overlay quente) → bloco de texto no terço inferior, alinhado à esquerda → **uma palavra-chave por frase em laranja**, visivelmente maior que o texto de apoio. Seta `→` como CTA, sem decoração extra.

Documentos multipágina: fundo branco; símbolo preto no topo esquerdo + título em caixa alta; rodapé com filete `#D9D9D9` e `pratic.Tipo  Cliente` em `#8C8C8C`; seções com numeração laranja + título preto bold; **uma** frase-chave laranja centralizada por seção; quadro "Sair de / Para" (esquerda cinza, direita laranja); lista com `✓` laranja; tabela de preços com cabeçalho laranja sólido, texto branco, zebra `#F2F4F7`.

Tipografia da marca: sans geométrica bold/black em caixa baixa para títulos (equivalentes: Archivo Black, Poppins ExtraBold, General Sans Bold); mesma família em regular para corpo; script fina **só ocasionalmente** (Mrs Saint Delafield, Allura, Caveat). **Máx. 2 famílias por peça.**

---

## 4. Tipografia — Contexto A (Produto)

| Família | Variável | Papel |
|---|---|---|
| **Inter** | `--font-sans` | Toda a interface e todos os dados. Tem `tnum` (números tabulares) |
| **Newsreader** (serifa; 400/500/600, normal e itálico) | `--font-serif` | Registro editorial — **títulos de empty state**, display de páginas públicas. **Não use em tabelas, botões, labels, dados ou no `h1` de página** |
| **JetBrains Mono** (400/500) | `--font-mono` | IDs, códigos, chaves, URLs curtas, trechos técnicos |

Fallbacks: `ui-sans-serif, system-ui, sans-serif` · `ui-serif, Georgia, serif` · `ui-monospace, monospace`. `-webkit-font-smoothing: antialiased`.

### Escala

| Token | Tamanho | Uso típico |
|---|---|---|
| `--text-micro` | 11px | Badge, contagem, cabeçalho de tabela, eyebrow (600, caixa alta, tracking 0.06–0.08em) |
| `--text-caption` | 12px | Legenda, botão pequeno, tabela compacta |
| `--text-data` | 13px | Células de tabela, título de card |
| `--text-ui` | 13.5px | Botões, inputs, texto de interface, subtítulo |
| `--text-body` | 15px | Corpo de texto (`line-height: 1.5`) |
| `--text-h4` | 15px | Subtítulo (peso 600) |
| `--text-h3` | 17px | Título de seção, título de empty state (serifa 500) |
| `--text-h2` | 20px | Título de seção grande |
| `--text-h1` | 26px | Título de página — Inter **700**, `line-height 1.2`, `letter-spacing -0.02em` |

Pesos: 400 corpo · 500 números em tabela · 600 botões, labels, títulos de card, badges · 700 `h1` e KPIs.
**Números que se comparam em coluna** (valores, datas, contagens, timers): `font-variant-numeric: tabular-nums` (classe `.tabular` ou atributo `data-numeric`, que também alinha à direita em tabela).

---

## 5. Espaçamento, raio, densidade, sombra, movimento

### Espaçamento (grade de 4px)
`--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48 · `-8` 64 · `-9` 96

### Raio
| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` / `--radius-badge` | 6px | Badges, pills de status |
| `--radius-input` | 8px | **Botões e inputs** |
| `--radius-md` | 10px | Botão de ícone, menus, tooltips |
| `--radius-card` | 12px | **Cards e superfícies** |
| `--radius-lg` | 16px | Blocos grandes |
| `--radius-xl` | 24px | Bottom-sheet mobile (cantos superiores), composer de chat |
| `--radius-full` | 999px | Switches, avatares, botão flutuante circular |

### Densidade
`--row-h` 40px (linha de tabela) · `--row-h-compact` 32px · `--card-pad` 16px · `--card-pad-compact` 12px · `--card-head-h` 40px · `--page-gap` 12px (10px em ≤1024)

### Sombras — planas, quase nunca usadas
`--shadow-sm: 0 1px 2px rgba(27,28,26,.05)` · `--shadow-md: 0 4px 12px rgba(27,28,26,.08)` · `--shadow-lg: 0 12px 32px rgba(27,28,26,.12)`.
No **escuro**: `sm` e `md` viram `none`; só `lg` permanece (`rgba(0,0,0,.4)`). Cards **não** têm sombra. Sombra só em tooltip, dropdown e modal.

### Movimento
`--duration-fast` 120ms (hover, cor, borda) · `--duration-base` 200ms (sidebar, tema, superfícies) · `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`.
Modal: 220ms com `cubic-bezier(0.16, 1, 0.3, 1)`, desktop `scale .96 → 1` + fade, mobile desliza de baixo. Entrada de bloco: `fadeInUp` 500ms. Respeitar `prefers-reduced-motion: reduce` (zerar animações/transições).

---

## 6. Layout e shell

- **Shell:** `position: fixed; inset: 0`, flex horizontal, **sem gutter nem gap** — a borda direita da sidebar separa as áreas. Área de conteúdo rola por dentro; fundo canvas.
- **Sidebar:** 240px expandida / 64px colapsada (tablet ≤1024 já nasce colapsada). Fundo `surface-raised`, `border-right: 1px solid border-subtle`. Grupos com título, itens com ícone Lucide + label. **Item ativo:** fundo `terracotta-100`, texto `terracotta-ink`. Colapsada mostra tooltip inverso à direita do ícone. Botão circular 24px de expandir/colapsar sobre a borda.
- **Header:** 56px (52px no mobile). **Nav inferior mobile:** 64px + safe-area.
- **Padding de conteúdo:** 24px · 20px (≤1024) · 16px (≤768).
- **Largura máx. de conteúdo** em páginas públicas: `1200px` centralizado, padding lateral 24/16px.
- **Breakpoints:** `1024` tablet (sidebar colapsa) · `900` page-header empilha · `768` mobile (nav inferior, inputs 16px/44px, botões 40px) · `640` grades colapsam para 1 coluna.
- **Navegação do produto** (grupos): *Minha Área* (WorkSpace, Demandas, Cronogramas, Diagramas, Agenda, Notas, Chat, Ranking) · *Gestão Comercial* (Clientes, Serviços, QR Codes) · *Administrativa* (Cadastros, Contratos, Equipe, …).

---

## 7. Componentes

### 7.1 Botão — `.btn` + variante + tamanho
Base: `inline-flex`, gap 6px, padding `8px 14px`, `min-height 34px`, raio 8px, `font 600 13.5px`, borda 1px transparente, transição 120ms.

| Variante | Classe | Aparência |
|---|---|---|
| **Primário** | `.btn-accent` | Fundo coral, **texto tinta**, hover clareia (`#E08A6E`), active `#EBA48F`. **No máximo um por tela/região** |
| Secundário | `.btn-secondary` | Fundo raised, borda `default`, hover fundo sunken + borda `strong` |
| Ghost | `.btn-ghost` | Transparente, texto secondary, hover fundo sunken + texto primary |
| Danger | `.btn-danger` | Fundo vermelho, texto branco, hover vai para `danger-ink`. Só exclusão/irreversível |
| Link | (ghost) | Ação terciária inline |

Tamanhos: `sm` 28px (`5px 10px`, 12px) · padrão 34px · `lg` 40px (`11px 20px`, 15px) · `icon` 30×30, raio 10px.
`disabled`: opacidade **0.45**, `cursor: not-allowed`, sem hover. `loading`: ícone `Loader2` girando substitui o ícone à esquerda. Mobile: `min-height 40px`.

### 7.2 Campos — `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`
Fundo raised, borda 1px `border-default`, raio 8px, `min-height 34px`, padding `7px 10px`, `13.5px`, placeholder `text-tertiary`.
- **Foco:** borda `--color-info` (azul) + anel `0 0 0 3px info-wash`. **Nunca coral.**
- **Erro:** borda vermelha + anel `danger-wash` **e** mensagem de texto abaixo (não só cor).
- **Desabilitado:** fundo sunken, texto tertiary, `not-allowed`.
- Select: seta Lucide `ChevronDown`, `padding-right 32px`. Busca: ícone de lupa à esquerda (`padding-left 32px`) que fica azul no foco.
- Checkbox/radio: `accent-color` coral. Switch: trilho coral quando ativo.
- **Mobile:** fonte 16px e `min-height 44px` (evita zoom do iOS).

### 7.3 Card / superfície
- **`.surface`** (`Card`): fundo raised, borda 1px subtle, raio 12px, **sem sombra**. Padding 16px (12px compact).
- **`.surface-sunken`** (`Card sunken`): fundo sunken, mesma borda.
- **`CardHeader`:** altura 40px, ícone 14–16px em `text-tertiary`, título `13px/600`, contagem `11px` tabular à direita do título, ação à direita (`margin-left: auto`), borda inferior subtle.
- **`CardFooter`:** ações alinhadas à direita, gap 8px, padding `12px 16px`, borda superior subtle.
- Hover interativo: **troca a borda** (para coral em navegação/seleção via `.hover-accent`), não sobe nem ganha sombra.
- `.glass-card` é alias legado de `.surface` (é plano/opaco, apesar do nome). **Não use o nome "glass" em código novo.**

### 7.4 StatCard (KPI)
Card `surface` com: label **micro em caixa alta** (11px, 600, tracking 0.06em, `text-tertiary`), número grande **700 tabular-nums**, unidade discreta ao lado (`hrs`, `%`), ícone num tile pequeno, tendência `TrendingUp/Down` em `success-ink` / `danger-ink` / `text-tertiary`, subtítulo opcional. Densidades `standard` e `compact`.

### 7.5 Badge / status pill
`inline-flex`, gap 5px, padding `2px 8px`, raio 6px, `11px / 600`. Tons: `neutral` (sunken + borda subtle + texto secondary), `accent` (`terracotta-100` + `terracotta-ink`), `success`, `warning`, `danger`, `info` (wash + ink da família). Ponto indicador opcional de 6px na cor do ink. Sempre acompanha **texto** — nunca só cor.

### 7.6 Tabela — `DataTable` / `.table`
- Cabeçalho: altura 28px, fundo sunken, **11px/600 caixa alta, tracking 0.06em**, `text-tertiary`, borda inferior subtle.
- Linha: altura 40px (32px `table-compact`), padding `9px 12px`, texto 13px, borda inferior subtle, **hover: fundo sunken na linha inteira**.
- Colunas numéricas: `data-numeric` → `tabular-nums`, alinhado à direita, peso 500.
- Status como badge com ponto. Contêiner com `overflow-x: auto`, `min-width: 600px`. Estado de carregamento com `Skeleton`.

### 7.7 Modal — `DialogShell`
Reservado para **decisões** (criar/editar, confirmar, excluir) — nunca para conteúdo passivo. Fundo `--color-scrim`, **sem blur**. Painel `.surface`, largura máx. 640px (configurável), altura máx. `100dvh − 48px`. Cabeçalho: título `1.25rem/700` + botão `X` de 18px, padding `18px 24px`, borda inferior. Corpo com scroll, padding 24px. Rodapé com ações à direita, **ação primária/destrutiva por último**. Mobile: bottom-sheet colada embaixo, `max-height 90dvh`, cantos superiores 24px. Fecha clicando no véu.

### 7.8 Menus — Context menu, Dropdown, Combobox
Painel raised, borda `border-default`, raio 10px, padding 4px, `min-width 200px`, `shadow-md`, z-index alto. Item: hover sunken, atalho de teclado alinhado à direita em `text-tertiary`, separadores 1px subtle, item destrutivo em `danger`. Combobox: gatilho estilo input, painel com busca no topo, opção com label + descrição, check na opção ativa, ponto colorido opcional.

### 7.9 Tabs / filtros
`filter-tabs` em linha com **rolagem horizontal sem scrollbar visível**; aba ativa com fundo wash coral e texto `terracotta-ink`. `filter-bar` com controles e busca alinhados.

### 7.10 Page header — `PageHeader`
Eyebrow opcional (11px/600/caixa alta/tracking 0.08em em `terracotta-700`) → `h1` Inter 700 26px → subtítulo 13.5px `text-secondary`. Ações à direita; ≤900px empilha, ações abaixo alinhadas à esquerda.

### 7.11 Empty state — `EmptyState`
Borda **tracejada** `border-default`, fundo sunken, raio 12px, centralizado (padding 48/24; compact 24/16). Ícone em `text-muted`, **título em Newsreader 17px/500**, descrição 13.5px `text-secondary` (máx. 340px), botão primário pequeno. É convite à ação, nunca só "nenhum resultado".

### 7.12 Toast / confirmação / skeleton
Toast em `surface-inverse` com texto invertido. Confirmação destrutiva via modal com botão `danger` por último. `Skeleton` no lugar de conteúdo em carregamento (tabelas, cards).

### 7.13 Kanban e cards de demanda
Coluna com faixa/cabeçalho na **cor categórica**, cards `surface` com título 13px/600, badges de status/prioridade, avatares 20–24px redondos. Timer ao vivo em `tabular-nums` com ponto pulsante.

### 7.14 Ícones
**Lucide React** (`lucide-react`), traço padrão 2px. Tamanhos: 13px (botão sm), 15px (botão padrão), 14–16px (card header/sidebar), 18px (fechar modal). Cor herda do texto; ícones decorativos em `text-tertiary`/`text-muted`. Redes sociais usam `SocialIcons` com cores de terceiros (§2.7).

---

## 8. Logo e símbolo

Símbolo: a letra **"p" minúscula desenhada como perfil de raposa/lobo** olhando para cima e à direita. Logotipo: **"pratic."** (o "p" carrega o mesmo recorte).

| Arquivo | Fundo em que entra |
|---|---|
| `/logo-horizontal-preta.png`, `/SIMBOLO-PRETO.png` | Tema **claro** / fundo claro |
| `/logo-horizontal-branca.png`, `/SIMBOLO-BRANCO.png` | Tema **escuro** / fundo escuro, foto, laranja sólido |
| símbolo laranja `#F2581A` | Destaque pontual sobre preto (só Contexto B) |

Regras: versão preta **só** em fundo claro, branca **só** em fundo escuro (`ThemeLogo` troca sozinho). Sidebar colapsada usa só o símbolo (40px). O símbolo é assinatura, não protagonista: pequeno, com **respiro mínimo igual à própria largura** em todas as direções. Não deformar, inclinar, aplicar sombra/efeito 3D nem recolorir fora da paleta.

---

## 9. Acessibilidade

- Contraste AA (4.5:1) em todo texto, **nos dois temas**. Já validado: coral × tinta 5.48:1; hover 6.54:1; os inks das famílias sobre seus washes passam em 11px.
- **Foco visível:** `:focus-visible { outline: 2px solid var(--color-info); outline-offset: 2px }` — azul, em qualquer elemento.
- Alvos de toque ≥ 40–44px no mobile.
- Estado nunca só por cor: erro → texto; status → texto no badge.
- `prefers-reduced-motion: reduce` desliga animação e transição.
- `::selection` em coral translúcido.

---

## 10. Voz e microcopy

Português do Brasil, direto, verbo no infinitivo nos botões (*Salvar, Criar demanda, Adicionar cliente, Exportar*). Frases curtas. Sem exclamação decorativa nem emoji na interface. Datas `dd/MM/yyyy`, moeda `R$ 1.234,56` em `tabular-nums`. Empty states convidam a agir ("Nenhuma demanda ainda. Crie a primeira."). Ações destrutivas dizem o que será perdido ("Excluir este cliente e seus contratos?").

---

## 11. O que evitar

- ❌ Glassmorphism, `backdrop-filter`, blur, glow neon, gradientes "futuristas".
- ❌ Sombra em card; cards flutuando com gutter (o shell é colado, separado por borda).
- ❌ Texto **branco** sobre botão coral (reprova AA) — use tinta.
- ❌ Foco de campo em coral; coral como erro; vermelho como CTA.
- ❌ Serifa em tabela, botão, label, dado ou `h1` de página.
- ❌ Números de dados sem `tabular-nums`.
- ❌ Hex solto no código — sempre o token (`var(--color-…)`). Exceções: cores categóricas (hex literal por necessidade) e cores de terceiros.
- ❌ Segunda cor de acento nas peças da marca; misturar `#F2581A` na UI do app ou `#D97757` nas peças.
- ❌ Tirar a borda de superfície no tema escuro.
- ❌ Mais de um botão primário por região; mais de 2 famílias tipográficas numa peça da marca.

---

## 12. Bloco de tokens (copiar e colar)

```css
:root {
  /* Superfícies */
  --color-surface-canvas: #faf9f5;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #f4f4f0;
  --color-surface-inset: #efeeea;
  --color-surface-inverse: #1b1c1a;
  --color-scrim: color-mix(in oklab, #1b1c1a 45%, transparent);

  /* Bordas */
  --color-border-subtle: #e3e2df;
  --color-border-default: #c7c7bf;
  --color-border-strong: #777871;

  /* Texto */
  --color-text-primary: #1b1c1a;
  --color-text-secondary: #5e5d59;
  --color-text-tertiary: #6e6d66;
  --color-text-muted: #87867f;
  --color-text-on-accent: #1b1c1a;
  --color-text-on-danger: #ffffff;

  /* Acento coral */
  --color-terracotta: #d97757;
  --color-terracotta-hover-solid: #e08a6e;
  --color-terracotta-active-solid: #eba48f;
  --color-terracotta-700: #c96442;
  --color-terracotta-800: #b84627;
  --color-terracotta-100: #fff1ed;
  --color-terracotta-200: #f3dfd3;
  --color-terracotta-ink: #a54a29;

  /* Semânticas */
  --color-success: #788c5d; --color-success-ink: #4a5838; --color-success-wash: #e6eadd;
  --color-info:    #6a9bcc; --color-info-ink:    #3a6491; --color-info-wash:    #e3ecf6;
  --color-warning: #d37f49; --color-warning-ink: #a03b1f; --color-warning-wash: #f3dfd3;
  --color-danger:  #b23b2e; --color-danger-ink:  #8f2e23; --color-danger-wash:  #f5e1dc;

  /* Raio */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px; --radius-full: 999px;
  --radius-card: 12px; --radius-input: 8px; --radius-badge: 6px;

  /* Espaçamento */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px;
  --space-6: 32px; --space-7: 48px; --space-8: 64px; --space-9: 96px;

  /* Tipografia */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Newsreader", ui-serif, Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --text-micro: 11px; --text-caption: 12px; --text-data: 13px; --text-ui: 13.5px;
  --text-body: 15px; --text-h4: 15px; --text-h3: 17px; --text-h2: 20px; --text-h1: 26px;

  /* Densidade e layout */
  --row-h: 40px; --row-h-compact: 32px; --card-pad: 16px; --card-pad-compact: 12px; --card-head-h: 40px;
  --sidebar-width: 240px; --sidebar-collapsed-width: 64px; --header-height: 56px; --mobile-nav-height: 64px;
  --content-padding: 24px; --page-gap: 12px;

  /* Sombra e movimento */
  --shadow-sm: 0 1px 2px rgba(27,28,26,.05);
  --shadow-md: 0 4px 12px rgba(27,28,26,.08);
  --shadow-lg: 0 12px 32px rgba(27,28,26,.12);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms; --duration-base: 200ms;
}

[data-theme='dark'] {
  --color-surface-canvas: #141413;
  --color-surface-raised: #22211e;
  --color-surface-sunken: #1a1917;
  --color-surface-inset: #2a2825;
  --color-surface-inverse: #faf9f5;

  --color-border-subtle: #3a3833;
  --color-border-default: #4a4740;
  --color-border-strong: #6e6b62;

  --color-text-primary: #f5f4ef;
  --color-text-secondary: #b5b2a8;
  --color-text-tertiary: #96948b;
  --color-text-muted: #7a786f;

  --color-terracotta-100: #3a2419;
  --color-terracotta-200: #4a2e20;
  --color-terracotta-ink: #e8a98d;

  --color-success-wash: #232a1c; --color-success-ink: #9cb381;
  --color-info-wash:    #1d2733; --color-info-ink:    #8fb6de;
  --color-warning-wash: #34241a; --color-warning-ink: #e0a276;
  --color-danger-wash:  #331d19; --color-danger-ink:  #e0897a;

  --shadow-sm: none; --shadow-md: none; --shadow-lg: 0 12px 32px rgba(0,0,0,.4);
}

:focus-visible { outline: 2px solid var(--color-info); outline-offset: 2px; }
```

---

## 13. Checklist antes de entregar um design

**Produto (Contexto A)**
- [ ] Fundo é canvas, cards são raised **com borda** e **sem sombra**; nenhum blur/glass.
- [ ] Um único botão coral por região, com texto **tinta escura**.
- [ ] Foco de campo azul; erro com texto além da cor.
- [ ] Inter em tudo; serifa só em título de empty state/display; números com `tabular-nums`.
- [ ] Tabela com cabeçalho micro caixa alta, linha 40px, hover sunken.
- [ ] Coral/azul/oliva/vermelho respeitam os papéis fixos (§2.5).
- [ ] Testado nos dois temas; no escuro as bordas seguram a hierarquia.
- [ ] Mobile: inputs 16px/44px, nav inferior, tabelas com scroll horizontal.
- [ ] Todo texto em pt-BR; ícones Lucide; tokens em vez de hex.

**Peça da marca (Contexto B)**
- [ ] Só preto, branco/branco-gelo, cinza e `#F2581A`.
- [ ] Símbolo na versão certa, pequeno, com respiro, centralizado no topo.
- [ ] Uma palavra-chave por frase em laranja, maior que o texto de apoio.
- [ ] No máx. 2 famílias tipográficas; script só se fizer sentido emocional/sazonal.
- [ ] Texto no terço inferior, alinhado à esquerda.
