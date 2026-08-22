# Sistema Visual — Identidade para Produto SaaS de IA

> **v1.1** — o terracota base foi recalibrado: menos rosado/salmão, mais próximo de laranja-terra queimado (`#D37F49`), com um tom de apoio mais grave (`#BB6B4C`) e um hover mais escuro e sério (`#B84627`).

Direção: tecnologia editorial e quente. Humana, inteligente, calma, premium. Minimalista sem ser estéril — inspirada na sobriedade visual da Anthropic, mas construída como uma linguagem própria, sem reproduzir logotipo, wordmark ou ativos de marca registrados.

---

## 1. Cor

### Base

| Token | Hex | Uso |
|---|---|---|
| `--color-dark` | `#141413` | Texto principal, superfícies invertidas, modo escuro |
| `--color-cream` | `#FAF9F5` | Fundo padrão (modo claro) |
| `--color-gray-mid` | `#B0AEA5` | Bordas fortes, texto terciário |
| `--color-gray-light` | `#E8E6DC` | Bordas sutis, divisores |
| `--color-terracotta` | `#D37F49` | Acento primário — ação, CTA |
| `--color-blue` | `#6A9BCC` | Acento de informação, foco de campo |
| `--color-olive` | `#788C5D` | Acento de sucesso/confirmação |

### Derivados (hover, wash, estado)

| Token | Hex | Uso |
|---|---|---|
| `--color-terracotta-700` | `#B84627` | Hover/active do primário |
| `--color-terracotta-100` | `#F3DFD3` | Fundo tonal (tags, wash) |
| `--color-terracotta-muted` | `#BB6B4C` | Ícones e texto de apoio em contexto de marca — alternativa ao wash claro quando precisa de mais peso |
| `--color-blue-700` | `#4C7EAE` | Texto sobre wash azul |
| `--color-blue-100` | `#E3ECF6` | Fundo tonal informativo |
| `--color-olive-700` | `#5E6F48` | Texto sobre wash oliva |
| `--color-olive-100` | `#E6EADD` | Fundo tonal de sucesso |
| `--color-danger` | `#B23B2E` | Erro, ação destrutiva |
| `--color-danger-ink` | `#8F2E23` | Texto sobre wash de erro |
| `--color-gray-100` | `#F1EFE8` | Superfície rebaixada (sunken) |
| `--color-gray-700` | `#45433E` | Texto secundário |
| `--color-gray-500` | `#726F67` | Texto terciário (modo claro) |

### Regra de uso

Cada acento tem **um único papel fixo** em todo o produto — nunca trocam de função entre telas:

- **Terracota** → ação primária e destaque de marca. Nunca usado para erro.
- **Azul** → informação e foco de campo. Nunca usado para ação primária.
- **Oliva** → sucesso e confirmação. Nunca usado como decoração neutra.
- **Vermelho (`danger`)** → exclusivo para erro e ações destrutivas.

### Modo escuro

Superfícies invertem (`--color-dark` como fundo, `--color-cream` como texto). Os tons de wash (`-100`) escurecem e os tons `-700` clareiam, para manter contraste AA em ambos os modos — nenhuma cor de acento muda de identidade, apenas de luminosidade.

---

## 2. Tipografia

| Família | Papel |
|---|---|
| **Poppins** | Interface — botões, labels, navegação, badges, dados tabulares |
| **Lora** | Corpo de texto, parágrafos longos, e o headline editorial (display/H1) |
| Arial, Georgia | Fallbacks caso as fontes não carreguem |

> O headline principal (`display`/`H1`) usa **Lora itálico** — não Poppins — porque é o registro editorial e literário que aproxima a marca da voz visual da Anthropic. Todo o resto da interface permanece na sans geométrica.

### Escala

| Estilo | Fonte | Peso | Tamanho |
|---|---|---|---|
| Display | Lora itálico | 500 | 40–66px |
| H1 | Lora itálico | 500 | 30–42px |
| H2 | Poppins | 600 | 26–32px |
| H3 | Poppins | 600 | 22px |
| H4 | Poppins | 600 | 17px |
| Label / Eyebrow | Poppins | 600 | 12–13px, tracking +4–12% |
| Corpo grande | Lora | 400 | 19px / 1.7 |
| Corpo padrão | Lora | 400 | 16px / 1.7 |
| Corpo pequeno | Lora | 400 | 14px / 1.6 |
| Legenda | Poppins | 400 | 12px |

---

## 3. Espaçamento

Escala de 4px com saltos editoriais (não uma grade rígida de 8pt):

```
space-1   4px
space-2   8px
space-3  12px
space-4  16px
space-5  24px
space-6  32px
space-7  48px
space-8  64px
space-9  96px
```

## 4. Raio de borda

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Inputs, pills de status |
| `radius-md` | 10px | Botões, tags, ícones de card |
| `radius-lg` | 16px | Cards, modais, tabelas |
| `radius-xl` | 24px | Composer de chat, superfícies grandes |
| `radius-full` | 999px | Switches, badges pill |

---

## 5. Componentes

### Botões
- **Primário** — fundo terracota, texto branco. Única ação de destaque por tela.
- **Secundário** — borda forte, fundo transparente.
- **Ghost/Terciário** — sem borda, hover com fundo sunken.
- **Danger** — vermelho, reservado a exclusão/irreversibilidade.
- Tamanhos: `sm` (13px/8-16px), padrão (15px/12-22px), `lg` (16px/15-28px).
- Estado `disabled`: opacidade 40%, sem hover.

### Inputs
- Foco em **azul** (nunca terracota — terracota é só para ação).
- Erro em vermelho com `box-shadow` de wash.
- Desabilitado: fundo sunken, texto terciário, cursor `not-allowed`.
- Checkbox/radio: `accent-color` terracota. Switch: trilho terracota quando ativo.

### Cards
- **Padrão** — borda sutil, sem sombra. Para grades densas.
- **Elevado** — sem borda, sombra suave. Para destaque.
- **Interativo** — eleva 3px no hover, sombra cresce. Para navegação.

### Navegação
- **Topo** — para páginas públicas/marketing. Link ativo com sublinhado terracota.
- **Sidebar** — para produto autenticado. Item ativo com fundo wash terracota + texto terracota-700.

### Superfície de conversa (chat)
Componente central do produto:
- Rail lateral com histórico de conversas, item ativo em wash terracota.
- Mensagem do usuário em bolha sunken alinhada à direita.
- Resposta do assistente **sem bolha**, corrida como texto serifado — sem avatar de marca.
- Composer arredondado (`radius-xl`) com foco azul e botão de envio circular terracota.
- Indicador de "pensando": três pontos com animação de pulso, respeitando `prefers-reduced-motion`.

### Modais
Reservados para decisões (confirmar, excluir, alertar) — nunca para conteúdo passivo. Sombra pronunciada, ícone de contexto, ações alinhadas à direita com a ação destrutiva/primária por último.

### Alertas
Quatro estados, cada um com wash e ink do próprio acento de marca — nunca vermelho/verde genéricos fora do vocabulário definido:
- Info → azul · Sucesso → oliva · Aviso → terracota · Erro → vermelho dedicado.

### Tabelas
Cabeçalho sunken com label em caixa alta; linhas com respiro generoso (14px vertical); hover sunken na linha inteira; status via pills coloridos com ponto indicador.

### Estados vazios
Borda tracejada, fundo sunken, ícone de contexto, texto de convite à ação + botão primário pequeno. Nunca apenas um aviso de ausência.

---

## 6. Acessibilidade

- Contraste mínimo AA em todo texto sobre papel, em ambos os modos.
- Foco visível padrão do sistema: anel azul de 2px com offset de 2px (`:focus-visible`).
- Skip link para pular a navegação.
- `prefers-reduced-motion: reduce` remove/reduz toda transição e animação.
- Estados de erro nunca dependem só de cor — sempre acompanhados de texto (`error-text`).

---

## 7. Responsivo

| Breakpoint | Regra |
|---|---|
| ≤ 640px | Colunas empilham em 1; navegação de topo colapsa. |
| ≤ 860px | Grades de 3 colunas viram 2. |
| ≥ 1180px | Largura máxima de conteúdo fixa em 1180px. |

---

## 8. Assinatura visual

- **Grão de papel** sutil (SVG turbulence, opacidade ~3.5%) sobre todas as superfícies — remove a esterilidade digital sem comprometer contraste.
- **Halo orgânico** único no topo do hero — não um campo de blobs decorativos, um único gesto de cor suave, como no site institucional da Anthropic.
- **Headline serifada em itálico** como registro de voz — o elemento mais memorável do sistema, usado com moderação (só em display/H1).

---

## 9. O que este sistema evita, de propósito

- Gradientes neon ou efeitos "futuristas" genéricos.
- Glassmorphism excessivo.
- Reprodução do logotipo, símbolo ou wordmark da Anthropic/Claude.
- Uso do nome "Claude" ou "Anthropic" como marca do produto.
- Vermelho/verde genéricos para feedback — todo estado usa um acento já definido no sistema.
