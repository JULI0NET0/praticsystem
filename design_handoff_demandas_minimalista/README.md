# Handoff: Demandas — visão minimalista (opção 1b desktop + 2a/2b mobile)

## Overview
Redesenho da página `/admin/demandas` (repo `JULI0NET0/praticsystem`) para reduzir o ruído visual da lista. Hoje cada `DemandRow` empilha até 8 chips numa segunda linha. Na nova versão, cada demanda mostra **3 sinais fixos** (prioridade, prazo e responsável), e o restante (status e contadores) aparece no hover (desktop) ou na tela de detalhe (mobile). Os filtros também foram enxugados.

Escopo desta entrega: **apenas a view Lista** (desktop e mobile). Kanban e o drawer de detalhe (`DemandModal`) continuam como estão.

## About the Design Files
`Demandas Minimalista.dc.html` é uma **referência de design em HTML**: mostra aparência e comportamento, mas não é código para copiar. A tarefa é recriar o design dentro dos componentes existentes (`DemandasView.tsx`, `DemandRow.tsx`, `DemandFilters.tsx`, `PageHeader`) usando os tokens CSS de `src/styles/theme.css` (`--text-primary`, `--border`, `--accent`, `--radius-badge` etc.) em vez dos hex literais do mock.

No arquivo, as seções relevantes são **1b** (desktop) e **2a / 2b** (mobile). 1a é o estado atual e 1c foi descartada.

## Fidelity
**High-fidelity.** Cores, tipografia e espaçamentos são finais e seguem o Contexto A do `pratic-design-system.md`: fundo pergaminho, coral como único acento de ação, sem sombra em superfícies e texto entre 11 e 15px (mobile até 26px no título da página).

---

## Screens / Views

### 1. Desktop — Lista (opção 1b)
Container da página: fundo `#FAF9F5`, padding 32px 36px, coluna com gap 22px.

**Header** (substitui o uso atual de `PageHeader` nesta página)
- Uma linha, `align-items: baseline`, gap 12px.
- O eyebrow "Operação" foi removido.
- Título "Demandas": 22px / 700 / letter-spacing −0.02em / `--text-primary`.
- Subtítulo inline: "6 em aberto · 1 atrasada", 12.5px, `--text-tertiary` (#6E6D66). O trecho "N atrasada(s)" fica em #B53B2C, peso 600, e só aparece se houver atraso. O texto "X de Y demandas" sai.
- Ações à direita (`margin-left: auto`, gap 4px):
  - WhatsApp → **botão só com ícone**, 32×32, radius 8, cor `--text-secondary`, hover com fundo #F0EFEA. Título: "Resumo para WhatsApp". O ícone deixa de ser verde.
  - Status → botão só com ícone (sliders), mesmas medidas. Título: "Gerenciar status".
  - "Nova demanda" → 32px de altura, padding 0 12px, radius 8, fundo `--accent` #D97757, texto `--text-primary` #1B1C1A, 12.5px/700. `<kbd>N</kbd>` em JetBrains Mono 10px, fundo `rgba(27,28,26,.12)`, radius 4, padding 1px 5px. margin-left 6px.

**Barra de escopo + visualização** (substitui `.filter-tabs`, `DemandViewSwitcher` e `DemandGroupBySwitcher`)
- Linha com `border-bottom: 1px solid --border`, gap 18px.
- Abas Todas / Clientes / Internas em texto, sem pílula: 13px. Aba ativa: 700, `border-bottom: 2px solid --text-primary` (margin-bottom −1px para sobrepor a borda). Inativas: 600, `--text-tertiary`. padding-bottom 10px.
- À direita: "Lista" | "Kanban" como segmento em texto (ativo com fundo #EFEEE9, radius 6, padding 4px 8px, 12px/700), um divisor de 1×14px e "Agrupar: Prazo ▾", um dropdown com as opções Prazo/Status (e Prioridade no Kanban).
- "Gerenciar status" e "Demanda + Cliente" saem da barra. O primeiro já existe como ícone no header. O segundo vai para dentro de "Filtros" (ver abaixo).

**Filtros** (substitui a `.filter-bar` com 10 controles)
- Linha com gap 8px e controles de 32px de altura.
- Busca: flex 1, max-width 300px, fundo #F0EFEA **sem borda**, radius 8, ícone 14px, placeholder "Buscar demanda ou cliente…".
- "Minhas": toggle em texto. Ativo = fundo #FFF1ED + borda #F3DFD3, texto ink. Inativo = sem fundo, `--text-secondary`.
- "Hoje": mesmo toggle.
- "Filtros": botão com ícone de funil (3 linhas) que abre um popover com Cliente, Responsáveis, Status, Prioridade, Formato, Concluídas (mostrar/ocultar), Demanda + Cliente e Som. Quando houver filtros ativos no popover, mostrar a contagem: "Filtros · 2". "Limpar" fica dentro do popover.

**Grupos**
- gap 22px entre grupos.
- Cabeçalho: nome 12px/700 + contagem 12px `--text-tertiary` com tabular-nums, padding 0 8px 6px. Sem fundo e sem chevron. O grupo "Atrasadas" tem o nome em #B53B2C. A função de recolher continua: clique no cabeçalho.

**Linha (`DemandRow` nova)**: uma única linha
- `display:flex; align-items:center; gap:12px; min-height:40px; padding:0 8px; border-radius:8px; border-top:1px solid #ECEBE6`. Hover: fundo #F3F2ED.
- Da esquerda para a direita:
  1. Checkbox redondo 16×16, **borda 1.5px** na cor da prioridade (hoje é 18px com 2px). Mantém as animações atuais de conclusão: anel, check desenhado e risco.
  2. Título: 13.5px/600, ellipsis, pode encolher.
  3. Cliente como **texto**, sem chip: 12.5px `--text-tertiary`, sem encolher. Demanda interna mostra "Interna".
  4. (opcional, tweak `mostrarDescricao`, **desligado por padrão**) descrição 12.5px #8A8983 com ellipsis, flex 1.
  5. **Só no hover**: status (bolinha de 6px na cor do status + label) e contadores ("✓ 2/5 · 3 coment. · 1 anexo"), 11.5px/600, `--text-tertiary`. Quando o agrupamento é por status, o status não aparece.
  6. Prazo: coluna fixa de 92px alinhada à direita, 12px/600, tabular-nums. Normal em `--text-secondary`, atrasado em #B53B2C.
  7. Responsáveis: coluna fixa de 54px alinhada à direita, avatares de 20px com overlap de −5px, borda 1.5px #FAF9F5, `flex-shrink:0`, no máximo 3.
- **Removidos da linha:** chip de cliente, chip de prazo (vira texto), chip de agenda, pill de status (vai para o hover), badge de prioridade (a cor do checkbox já indica), badge de formato e grip de arraste (o arrasto continua valendo na linha inteira).
- Os botões Play/Abrir do hover atual podem continuar à direita, antes do prazo.

### 2. Mobile — Lista (2a)
Viewport de referência: 390×844. Fundo #FAF9F5.
- **Header**: padding 8px 20px 0. Título "Demandas" 26px/700; subtítulo 13px com o mesmo tratamento do desktop. À direita, dois botões de 44×44 só com ícone: Buscar (a busca abre um campo em tela cheia ou expandido) e Filtros (abre 2b).
- **Abas de escopo**: iguais às do desktop, com texto de 14px e gap 20px. À direita, "Lista ▾" alterna para Kanban.
- **Chips rápidos**: linha com scroll horizontal, padding 12px 20px 4px, gap 8px. Chips de 34px de altura, radius 17, 13px/600: "Minhas", "Hoje", "Concluídas". Ativo = #FFF1ED + borda #F3DFD3. Inativo = borda #E3E2DF, texto `--text-secondary`.
- **Grupos**: cabeçalho 13px/700 + contagem, padding 0 20px 4px, gap 18px entre grupos.
- **Linha**: min-height 60px, padding 8px 20px, gap 14px, `border-top: 1px solid #ECEBE6`.
  - Checkbox 22×22 com borda de 2px na cor da prioridade (a área de toque deve ter 44px).
  - Linha 1: título 15px/600, uma linha, ellipsis.
  - Linha 2: "Cliente · Prazo", 13px `--text-tertiary`. O prazo em 600 e #B53B2C quando atrasado.
  - Avatares de 26px à direita com overlap de −7px.
  - Status e contadores **não aparecem** na lista mobile. Ficam no detalhe.
- **Swipe para a esquerda**: revela duas ações (152px no total). "▶ Timer" com 72px e fundo #EFEEE9, e "✓ Concluir" com 80px e fundo #D97757, ambas com texto ink 12px/700. Soltar depois de 50% abre as ações; um swipe longo conclui direto.
- **Toque na linha**: abre o detalhe (`DemandModal` em tela cheia).
- **FAB "Nova demanda"**: 56×56, radius 18, fundo #D97757, "+" de 28px em ink, posicionado a right 20px e bottom 34px (+ safe-area), com `box-shadow: 0 6px 16px rgba(27,28,26,.18)`. É a única sombra da tela, permitida por ser um elemento flutuante.

### 3. Mobile — Painel de filtros (2b)
- Overlay `rgba(27,28,26,.4)` e painel inferior com fundo #FAF9F5, radius 24px no topo, padding 10px 20px 34px.
- Alça de 40×5 #D6D5CF, radius 3.
- Cabeçalho: "Filtros" 17px/700 à esquerda e "Limpar" 14px/600 #A54A29 à direita.
- Linhas de 52px com `border-top: 1px solid #ECEBE6`: Cliente, Responsável, Status, Prioridade, Formato. Label 15px/500 e valor 14px `--text-tertiary` com "›". Tocar numa linha abre uma lista de seleção.
- Linha "Som ao concluir" com switch de 44×26, fundo coral quando ligado.
- Botão "Ver N demandas": altura 50, radius 14, coral, 15px/700. A contagem atualiza ao vivo.

---

## Interactions & Behavior
- Atalhos atuais continuam iguais (N, L, K, Cmd+A, Esc) e a seleção múltipla com Shift/Cmd continua (fundo `color-mix(--accent 12%)`).
- O hover da linha (desktop) só adiciona o bloco de status/contadores. A troca é instantânea, sem animação de largura. O título deve encolher com ellipsis para dar espaço.
- Drag-and-drop entre grupos continua na linha inteira.
- Breakpoint sugerido: abaixo de 640px usar o layout mobile.

## State Management
Não há estado novo além de:
- `filtersPopoverOpen` (desktop) / `filtersSheetOpen` (mobile).
- `hoveredId` (ou apenas CSS `:hover` para mostrar o bloco de metadados. CSS é preferível).
- A preferência "mostrar descrição" pode seguir o padrão de localStorage (`pratic-demandas-show-desc`), com padrão desligado.

## Design Tokens
| Uso | Hex | Token sugerido |
|---|---|---|
| Fundo página | #FAF9F5 | `--color-surface` |
| Texto primário | #1B1C1A | `--text-primary` |
| Texto secundário | #5E5D59 | `--text-secondary` |
| Texto terciário | #6E6D66 | `--text-tertiary` |
| Descrição | #8A8983 | (novo ou `--text-tertiary`) |
| Borda | #E3E2DF | `--border` |
| Divisor de linha | #ECEBE6 | (mais leve que `--border`) |
| Hover linha | #F3F2ED | |
| Busca / hover de ícone | #F0EFEA | `--color-surface-sunken` |
| Segmento ativo | #EFEEE9 | |
| Acento | #D97757 | `--accent` (texto sobre ele sempre ink) |
| Toggle ativo | #FFF1ED / borda #F3DFD3 | |
| Atraso | #B53B2C | `--color-danger` |
| Link / Limpar | #A54A29 | |

Prioridade (cor do checkbox): usar `PRIORITY_COLORS` existente. No mock: urgente #B53B2C, alta #D97757, média #3B6FB6, baixa #9A9992, nenhuma #C7C7BF.

Tipografia: Inter 11.5 / 12 / 12.5 / 13.5 / 22px no desktop e 13 / 14 / 15 / 17 / 26px no mobile. JetBrains Mono no kbd.
Raios: 4 (kbd), 6 (segmento), 8 (botões/linha), 14 e 17 (mobile), 18 (FAB), 24 (painel).

## Assets
Ícones: lucide-react, já usado no repo (`Search`, `SlidersHorizontal`, `MessageCircle`/`WhatsAppIcon`, `ListFilter`, `Play`, `Check`, `Plus`). Não há imagens novas.

## Files
- `Demandas Minimalista.dc.html`: referência (seções 1b, 2a e 2b).
- Arquivos a alterar no repo: `src/components/demandas/DemandasView.tsx`, `DemandRow.tsx`, `DemandFilters.tsx`, `DemandListView.tsx` (cabeçalho de grupo) e o CSS de `.filter-tabs`/`.filter-bar` em `src/styles/components.css`.
