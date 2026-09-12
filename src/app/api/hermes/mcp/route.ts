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
  addDemandComment,
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

  server.registerTool(
    'list_invoices',
    {
      title: 'Listar faturas',
      description: 'Lista as faturas e status de pagamento de um cliente (somente leitura).',
      inputSchema: z.object({ client_id: z.string() }),
    },
    async ({ client_id }) => {
      try {
        return asToolResult(await listInvoices(client_id));
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
