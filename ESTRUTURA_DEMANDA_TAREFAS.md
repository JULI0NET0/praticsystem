# Estrutura de Demanda e Tarefas

> Levantamento do estado atual (2026-08-23) — dois modelos coexistem no código, um legado e um em uso ativo.

---

## 1. Modelo legado — `Demand`

Definido em [src/types/database.ts:69-78](src/types/database.ts#L69-L78). Estrutura plana, ligada diretamente ao cliente:

```ts
interface Demand {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_production' | 'review' | 'approved' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  type: string;
}
```

**Status:** praticamente morto. O único ponto que importa esse tipo é [src/mocks/db.ts](src/mocks/db.ts#L1), onde vira um array vazio (`demands: Demand[] = []`). Nenhuma tela consome esse tipo diretamente hoje — a contagem "X demandas" que aparece em [clients/page.tsx](src/app/admin/clients/page.tsx) vem de um `demandsCount` calculado à parte, não desse modelo.

---

## 2. Modelo novo — CRM "Operação OFICIAL"

Definido em [src/types/operacao.ts](src/types/operacao.ts), explicitamente isolado do `database.ts` (fase mock). Árvore hierárquica:

```
Espaço → Área (pasta) → Lista → Tarefa → Subtarefa (etapa) → Ação (entregável)
```

### Entidades principais

- **`Task`** ([operacao.ts:92-108](src/types/operacao.ts#L92-L108)): título, `taskType` (`default` / `onboarding` / `offboarding` / `pack_entrega` / `post` / `captacao`), `statusId`, responsáveis (`assigneeIds`), prioridade, datas, `customValues` (campos personalizados por lista) e `subtasks[]`.
- **`Subtask`**: etapa de uma tarefa, contém `actions: ActionItem[]` — checklist de entregáveis.
- **`List`**: carrega `StatusDef[]` e `FieldDef[]` próprios — cada lista define seu fluxo de status e colunas.
- **`Area`** / **`Space`**: agrupamento de listas (pastas) dentro do espaço de trabalho.
- Suporta 3 visualizações: `board` (Kanban), `table`, `calendar`.
- Tem gerador de **calendário editorial** (`EditorialGenerationInput`) que cria tarefas em lote a partir de posts/semana + canais (`MediaType`) + estágio de funil (`FunnelStage`).

**Status:** é o modelo que efetivamente roda o produto hoje.

- Dados mockados em `src/mocks/operacao/*` (seed, factory, templates, editorialCalendar).
- Consumido por toda a árvore de componentes em `src/components/operacao/*` (`KanbanBoard`, `TaskTable`, `TaskDrawer`, `EditorialCalendarView`, `NewTaskModal`, etc.), servidos via `OperacaoProvider`.
- Renderizado em [admin/operacao/page.tsx](src/app/admin/operacao/page.tsx) e [admin/operacao/[areaId]/page.tsx](src/app/admin/operacao/[areaId]/page.tsx).
- Mapeamento completo de áreas/listas/fluxos operacionais já documentado em [CRM_Operacao_OFICIAL_Estrutura.md](CRM_Operacao_OFICIAL_Estrutura.md).

---

## 3. Ponto em aberto

`Demand` (legado) e `Task` (ativo) nunca foram unificados — ainda não está decidido se `Demand` será migrado para dentro da árvore `Space → Area → List → Task` ou aposentado de vez. O modelo `Task` também ainda está em fase mock, sem persistência real em banco.
