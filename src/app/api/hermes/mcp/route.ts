import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { requireHermesAuth } from '@/lib/hermesAuth';
import {
  searchClients,
  getClient,
  createNote,
  listNotes,
  createProposal,
  getProposal,
  listProposals,
  listInvoices,
  listDemands,
  getDemand,
  createDemand,
  updateDemandStatus,
  listDemandStatuses,
  updateDemand,
  completeDemand,
  reopenDemand,
  listDemandChecklist,
  addDemandChecklistItem,
  setDemandChecklistItemDone,
  addDemandComment,
  createInvoice,
  updateInvoice,
  listExpenses,
  listExpenseEntries,
  createExpenseEntry,
  updateExpenseEntry,
  listAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  cancelAgendaEvent,
  listChatMessages,
  sendChatMessage,
} from '@/lib/hermesTools';

/**
 * Servidor MCP consumido pelo agente HERMES (Nous Research, self-hosted).
 * O Hermes só integra ferramentas externas via MCP remoto (ver
 * ~/.hermes/config.yaml -> mcp_servers.<nome>.url), não via REST solto —
 * por isso a lógica em src/lib/hermesTools.ts é exposta aqui, além das
 * rotas REST em src/app/api/hermes/** (mantidas para uso manual/outros
 * integradores).
 */

function asToolResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

function asToolError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Erro inesperado.';
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    'search_clients',
    {
      title: 'Buscar clientes',
      description: 'Busca clientes do PraticSystem por nome, nome fantasia, CNPJ/CPF ou e-mail.',
      inputSchema: z.object({
        q: z.string().optional().describe('Termo de busca (nome, CNPJ ou e-mail).'),
        limit: z.number().int().min(1).max(50).optional().describe('Máximo de resultados (padrão 20).'),
      }),
    },
    async ({ q, limit }) => {
      try {
        return asToolResult(await searchClients(q, limit));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'get_client',
    {
      title: 'Detalhe do cliente',
      description: 'Retorna os dados completos de um cliente pelo ID (sem senhas/credenciais).',
      inputSchema: z.object({ id: z.string().describe('ID do cliente.') }),
    },
    async ({ id }) => {
      try {
        return asToolResult(await getClient(id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_note',
    {
      title: 'Lançar nota',
      description: 'Lança uma nota no PraticSystem, opcionalmente vinculada a um cliente.',
      inputSchema: z.object({
        client_id: z.string().optional().describe('ID do cliente (opcional).'),
        title: z.string().describe('Título da nota.'),
        content: z
          .string()
          .describe('Texto/markdown simples da nota (parágrafos separados por linha em branco).'),
        subjects: z.array(z.string()).optional().describe('Marcadores/assuntos opcionais.'),
      }),
    },
    async ({ client_id, title, content, subjects }) => {
      try {
        return asToolResult(await createNote({ client_id, title, content, subjects }));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_notes',
    {
      title: 'Listar notas',
      description: 'Lista as notas vinculadas a um cliente.',
      inputSchema: z.object({ client_id: z.string() }),
    },
    async ({ client_id }) => {
      try {
        return asToolResult(await listNotes(client_id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_proposal',
    {
      title: 'Registrar proposta',
      description:
        'Registra uma proposta comercial vinculada a um cliente. O conteúdo/design (.docx) já deve vir pronto, gerado pela skill de identidade visual da Pratic — esta ferramenta apenas guarda o arquivo e os metadados.',
      inputSchema: z.object({
        client_id: z.string(),
        title: z.string(),
        value: z.number().optional().describe('Valor total da proposta (opcional).'),
        file_base64: z.string().describe('Conteúdo do arquivo .docx codificado em base64.'),
        file_name: z.string().describe('Nome do arquivo, ex.: proposta-cliente-x.docx'),
      }),
    },
    async ({ client_id, title, value, file_base64, file_name }) => {
      try {
        return asToolResult(await createProposal({ client_id, title, value, file_base64, file_name }));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'get_proposal',
    {
      title: 'Detalhe da proposta',
      description: 'Consulta uma proposta pelo ID.',
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      try {
        return asToolResult(await getProposal(id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_proposals',
    {
      title: 'Listar propostas',
      description: 'Lista as propostas de um cliente.',
      inputSchema: z.object({ client_id: z.string().optional() }),
    },
    async ({ client_id }) => {
      try {
        return asToolResult(await listProposals(client_id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  // -----------------------------------------------------------
  // Financeiro — contas a receber (faturas) e a pagar (despesas)
  // -----------------------------------------------------------

  server.registerTool(
    'list_invoices',
    {
      title: 'Listar faturas (contas a receber)',
      description: 'Lista faturas/cobranças, filtrando por cliente, status ou período de vencimento.',
      inputSchema: z.object({
        client_id: z.string().optional(),
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        from: z.string().optional().describe('Vencimento mínimo, YYYY-MM-DD.'),
        to: z.string().optional().describe('Vencimento máximo, YYYY-MM-DD.'),
      }),
    },
    async (filters) => {
      try {
        return asToolResult(await listInvoices(filters));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_invoice',
    {
      title: 'Lançar fatura (conta a receber)',
      description:
        'Registra uma cobrança de cliente no financeiro. Não emite cobrança no Asaas — só o lançamento interno.',
      inputSchema: z.object({
        client_id: z.string(),
        amount: z.number().positive().describe('Valor em reais.'),
        due_date: z.string().describe('Vencimento, YYYY-MM-DD.'),
        description: z.string(),
        status: z.enum(['pending', 'paid']).optional().describe('Padrão: pending.'),
        paid_at: z.string().optional().describe('Data do recebimento (YYYY-MM-DD) quando status=paid. Padrão: hoje.'),
        contract_id: z.string().optional(),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await createInvoice(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'update_invoice',
    {
      title: 'Ajustar fatura (conta a receber)',
      description:
        'Ajusta valor, vencimento, descrição ou status de uma fatura. Para dar baixa use status=paid (paid_at padrão: hoje); qualquer outro status limpa paid_at. Não altera a cobrança no Asaas.',
      inputSchema: z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        due_date: z.string().optional().describe('YYYY-MM-DD.'),
        description: z.string().optional(),
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        paid_at: z.string().optional().describe('Data do recebimento, YYYY-MM-DD.'),
      }),
    },
    async ({ id, ...input }) => {
      try {
        return asToolResult(await updateInvoice(id, input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_expenses',
    {
      title: 'Listar despesas fixas',
      description: 'Lista as despesas recorrentes cadastradas (pró-labore, sistemas, internet etc.).',
      inputSchema: z.object({ status: z.enum(['active', 'inactive']).optional() }),
    },
    async (filters) => {
      try {
        return asToolResult(await listExpenses(filters));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_expense_entries',
    {
      title: 'Listar contas a pagar',
      description:
        'Lista os lançamentos de despesa (contas a pagar), filtrando por status, despesa fixa de origem ou período (campo date).',
      inputSchema: z.object({
        status: z.enum(['pending', 'paid', 'cancelled']).optional(),
        expense_id: z.string().optional(),
        from: z.string().optional().describe('YYYY-MM-DD.'),
        to: z.string().optional().describe('YYYY-MM-DD.'),
      }),
    },
    async (filters) => {
      try {
        return asToolResult(await listExpenseEntries(filters));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_expense_entry',
    {
      title: 'Lançar conta a pagar',
      description: 'Registra um lançamento de despesa, avulso ou vinculado a uma despesa fixa (expense_id).',
      inputSchema: z.object({
        description: z.string(),
        amount: z.number().positive().describe('Valor em reais.'),
        date: z.string().describe('Vencimento (ou data do pagamento, se já paga), YYYY-MM-DD.'),
        status: z.enum(['pending', 'paid']).optional().describe('Padrão: pending.'),
        expense_id: z.string().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await createExpenseEntry(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'update_expense_entry',
    {
      title: 'Ajustar conta a pagar',
      description:
        'Ajusta valor, data, descrição, categoria, observações ou status de um lançamento de despesa. Para dar baixa, envie status=paid e date=data do pagamento (padrão do sistema); cancelled cancela a conta.',
      inputSchema: z.object({
        id: z.string(),
        description: z.string().optional(),
        amount: z.number().positive().optional(),
        date: z.string().optional().describe('YYYY-MM-DD.'),
        status: z.enum(['pending', 'paid', 'cancelled']).optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
    async ({ id, ...input }) => {
      try {
        return asToolResult(await updateExpenseEntry(id, input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  // -----------------------------------------------------------
  // Demandas
  // -----------------------------------------------------------

  server.registerTool(
    'list_demands',
    {
      title: 'Listar demandas',
      description: 'Lista demandas, opcionalmente filtradas por cliente, status, responsável ou escopo.',
      inputSchema: z.object({
        client_id: z.string().optional(),
        status: z.string().optional().describe('Ex.: pending, in_production, review, approved, completed.'),
        assignee_id: z.string().optional(),
        scope: z.enum(['client', 'internal']).optional(),
      }),
    },
    async ({ client_id, status, assignee_id, scope }) => {
      try {
        return asToolResult(await listDemands({ client_id, status, assignee_id, scope }));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'get_demand',
    {
      title: 'Detalhe da demanda',
      description: 'Consulta uma demanda pelo ID, incluindo os comentários.',
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      try {
        return asToolResult(await getDemand(id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_demand',
    {
      title: 'Criar demanda',
      description: 'Cria uma nova demanda/tarefa, vinculada a um cliente ou interna.',
      inputSchema: z.object({
        title: z.string(),
        description: z.string().optional().describe('Texto/markdown simples.'),
        client_id: z.string().optional().describe('Omitir para demanda interna.'),
        priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).optional(),
        assignee_ids: z.array(z.string()).optional(),
        status: z.string().optional().describe('Padrão: pending.'),
        due_date: z.string().optional().describe('Formato YYYY-MM-DD.'),
        due_time: z.string().optional().describe('Formato HH:MM.'),
        start_date: z.string().optional().describe('Formato YYYY-MM-DD.'),
        type: z.string().optional(),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await createDemand(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'update_demand_status',
    {
      title: 'Atualizar status da demanda',
      description: 'Muda o status de uma demanda existente (ex.: pending, in_production, review, approved, completed).',
      inputSchema: z.object({ id: z.string(), status: z.string() }),
    },
    async ({ id, status }) => {
      try {
        return asToolResult(await updateDemandStatus(id, status));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_demand_statuses',
    {
      title: 'Listar status de demanda',
      description:
        'Lista os status configurados (id, rótulo, categoria nao_iniciado/ativo/fechado). Use os ids em update_demand_status/update_demand.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return asToolResult(await listDemandStatuses());
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'update_demand',
    {
      title: 'Editar demanda',
      description:
        'Edita campos de uma demanda/tarefa existente. Só os campos enviados mudam; envie null para limpar (ex.: due_date: null, client_id: null torna a demanda interna).',
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().nullable().optional().describe('Texto/markdown simples; substitui a descrição atual.'),
        client_id: z.string().nullable().optional(),
        priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).optional(),
        assignee_ids: z.array(z.string()).optional().describe('Substitui a lista inteira de responsáveis.'),
        status: z.string().optional(),
        due_date: z.string().nullable().optional().describe('YYYY-MM-DD.'),
        due_time: z.string().nullable().optional().describe('HH:MM.'),
        start_date: z.string().nullable().optional().describe('YYYY-MM-DD.'),
        type: z.string().nullable().optional(),
      }),
    },
    async ({ id, ...input }) => {
      try {
        return asToolResult(await updateDemand(id, input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'complete_demand',
    {
      title: 'Concluir demanda',
      description: 'Marca uma demanda/tarefa como concluída (status de categoria fechado; completed_at é preenchido).',
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      try {
        return asToolResult(await completeDemand(id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'reopen_demand',
    {
      title: 'Reabrir demanda',
      description: 'Reabre uma demanda concluída, voltando para o status informado (padrão: pending).',
      inputSchema: z.object({ id: z.string(), status: z.string().optional() }),
    },
    async ({ id, status }) => {
      try {
        return asToolResult(await reopenDemand(id, status));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'list_demand_checklist',
    {
      title: 'Ver checklist da demanda',
      description: 'Lista os itens do checklist de uma demanda (etapa = group_name, ação = label).',
      inputSchema: z.object({ demand_id: z.string() }),
    },
    async ({ demand_id }) => {
      try {
        return asToolResult(await listDemandChecklist(demand_id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'add_demand_checklist_item',
    {
      title: 'Adicionar item ao checklist',
      description: 'Adiciona uma ação ao checklist de uma demanda, dentro de uma etapa (group_name).',
      inputSchema: z.object({
        demand_id: z.string(),
        group_name: z.string().describe('Etapa, ex.: Roteiro, Captação, Edição.'),
        label: z.string(),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await addDemandChecklistItem(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'set_demand_checklist_item_done',
    {
      title: 'Marcar item do checklist',
      description: 'Marca (done=true) ou desmarca (done=false) um item do checklist de uma demanda.',
      inputSchema: z.object({ item_id: z.string(), done: z.boolean() }),
    },
    async ({ item_id, done }) => {
      try {
        return asToolResult(await setDemandChecklistItemDone(item_id, done));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'add_demand_comment',
    {
      title: 'Comentar na demanda',
      description: 'Adiciona um comentário de acompanhamento a uma demanda existente.',
      inputSchema: z.object({ id: z.string(), body: z.string() }),
    },
    async ({ id, body }) => {
      try {
        return asToolResult(await addDemandComment(id, body));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  // -----------------------------------------------------------
  // Agenda
  // -----------------------------------------------------------

  server.registerTool(
    'list_agenda_events',
    {
      title: 'Listar eventos da agenda',
      description: 'Lista compromissos da agenda, opcionalmente filtrados por cliente, tipo ou período.',
      inputSchema: z.object({
        client_id: z.string().optional(),
        type: z.string().optional(),
        from: z.string().optional().describe('Data/hora ISO mínima.'),
        to: z.string().optional().describe('Data/hora ISO máxima.'),
      }),
    },
    async ({ client_id, type, from, to }) => {
      try {
        return asToolResult(await listAgendaEvents({ client_id, type, from, to }));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'create_agenda_event',
    {
      title: 'Criar evento na agenda',
      description:
        'Agenda um novo compromisso e sincroniza automaticamente com o Google Calendar da conta correspondente ao tipo.',
      inputSchema: z.object({
        title: z.string(),
        type: z.enum([
          'meeting',
          'prospecting',
          'task',
          'social_media',
          'ads',
          'launch',
          'payment',
          'leadership_meeting',
          'demand',
        ]),
        date: z.string().describe('Data/hora ISO 8601.'),
        description: z.string().optional(),
        client_id: z.string().optional(),
        assigned_to: z.string().optional().describe('ID do usuário responsável (padrão: HERMES_DEFAULT_USER_ID).'),
        visibility: z.enum(['public', 'private']).optional(),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await createAgendaEvent(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'update_agenda_event',
    {
      title: 'Atualizar evento da agenda',
      description: 'Atualiza título, data, descrição ou tipo de um compromisso existente (reflete no Google Calendar).',
      inputSchema: z.object({
        id: z.string(),
        title: z.string().optional(),
        date: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
      }),
    },
    async ({ id, ...input }) => {
      try {
        return asToolResult(await updateAgendaEvent(id, input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'cancel_agenda_event',
    {
      title: 'Cancelar evento da agenda',
      description: 'Cancela (remove) um compromisso, inclusive do Google Calendar.',
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      try {
        return asToolResult(await cancelAgendaEvent(id));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  // -----------------------------------------------------------
  // Chat interno
  // -----------------------------------------------------------

  server.registerTool(
    'list_chat_messages',
    {
      title: 'Ler chat interno',
      description: 'Lista mensagens recentes do chat interno do time (canal geral ou uma conversa direta).',
      inputSchema: z.object({
        channel: z.string().optional().describe("Padrão: 'general'."),
        with_user_id: z.string().optional().describe('ID de um usuário para ler a conversa direta (DM) com ele.'),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    async ({ channel, with_user_id, limit }) => {
      try {
        return asToolResult(await listChatMessages({ channel, with_user_id, limit }));
      } catch (err) {
        return asToolError(err);
      }
    }
  );

  server.registerTool(
    'send_chat_message',
    {
      title: 'Enviar mensagem no chat interno',
      description:
        'Envia uma mensagem no chat interno do time, como o próprio HERMES (identidade dedicada, não uma pessoa do time).',
      inputSchema: z.object({
        content: z.string(),
        channel: z.string().optional().describe("Padrão: 'general'."),
        receiver_id: z.string().optional().describe('ID de um usuário para mandar uma mensagem direta (DM).'),
      }),
    },
    async (input) => {
      try {
        return asToolResult(await sendChatMessage(input));
      } catch (err) {
        return asToolError(err);
      }
    }
  );
});

async function handler(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  return mcpHandler(request);
}

export { handler as GET, handler as POST };
