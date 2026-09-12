import { NextResponse } from 'next/server';
import { requireHermesAuth } from '@/lib/hermesAuth';

/**
 * Schema de ferramentas no formato de tool-calling (compatível com
 * function-calling da Anthropic/OpenAI), para o HERMES descobrir
 * dinamicamente o que pode chamar nesta API.
 */
const TOOLS = [
  {
    name: 'search_clients',
    description: 'Busca clientes do PraticSystem por nome, nome fantasia, CNPJ/CPF ou e-mail.',
    input_schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Termo de busca (nome, CNPJ ou e-mail).' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 20, máximo 50).' },
      },
    },
  },
  {
    name: 'get_client',
    description: 'Retorna os dados completos de um cliente pelo ID (sem senhas/credenciais).',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID do cliente.' } },
      required: ['id'],
    },
  },
  {
    name: 'create_note',
    description: 'Lança uma nota no PraticSystem, opcionalmente vinculada a um cliente.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'ID do cliente (opcional).' },
        title: { type: 'string', description: 'Título da nota.' },
        content: { type: 'string', description: 'Texto/markdown simples da nota (parágrafos separados por linha em branco).' },
        subjects: { type: 'array', items: { type: 'string' }, description: 'Marcadores/assuntos opcionais.' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'list_notes',
    description: 'Lista as notas vinculadas a um cliente.',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'create_proposal',
    description:
      'Registra uma proposta comercial vinculada a um cliente. O conteúdo/design (.docx) já deve vir pronto, gerado pela skill de identidade visual da Pratic — esta ferramenta apenas guarda o arquivo e os metadados.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        title: { type: 'string' },
        value: { type: 'number', description: 'Valor total da proposta (opcional).' },
        file_base64: { type: 'string', description: 'Conteúdo do arquivo .docx codificado em base64.' },
        file_name: { type: 'string', description: 'Nome do arquivo, ex.: proposta-cliente-x.docx' },
      },
      required: ['client_id', 'title', 'file_base64', 'file_name'],
    },
  },
  {
    name: 'get_proposal',
    description: 'Consulta uma proposta pelo ID.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'list_proposals',
    description: 'Lista as propostas de um cliente.',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'list_invoices',
    description: 'Lista as faturas e status de pagamento de um cliente (somente leitura).',
    input_schema: {
      type: 'object',
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'list_demands',
    description: 'Lista demandas, opcionalmente filtradas por cliente, status, responsável ou escopo.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        status: { type: 'string', description: 'Ex.: pending, in_production, review, approved, completed.' },
        assignee_id: { type: 'string' },
        scope: { type: 'string', enum: ['client', 'internal'] },
      },
    },
  },
  {
    name: 'get_demand',
    description: 'Consulta uma demanda pelo ID, incluindo os comentários.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_demand',
    description: 'Cria uma nova demanda/tarefa, vinculada a um cliente ou interna.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        client_id: { type: 'string', description: 'Omitir para demanda interna.' },
        priority: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'urgent'] },
        assignee_ids: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', description: 'Padrão: pending.' },
        due_date: { type: 'string' },
        due_time: { type: 'string' },
        start_date: { type: 'string' },
        type: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_demand_status',
    description: 'Muda o status de uma demanda existente.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' }, status: { type: 'string' } },
      required: ['id', 'status'],
    },
  },
  {
    name: 'add_demand_comment',
    description: 'Adiciona um comentário de acompanhamento a uma demanda existente.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' }, body: { type: 'string' } },
      required: ['id', 'body'],
    },
  },
  {
    name: 'list_agenda_events',
    description: 'Lista compromissos da agenda, opcionalmente filtrados por cliente, tipo ou período.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string' },
        type: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },
  {
    name: 'create_agenda_event',
    description:
      'Agenda um novo compromisso e sincroniza automaticamente com o Google Calendar da conta correspondente ao tipo.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        type: {
          type: 'string',
          enum: ['meeting', 'prospecting', 'task', 'social_media', 'ads', 'launch', 'payment', 'leadership_meeting', 'demand'],
        },
        date: { type: 'string', description: 'Data/hora ISO 8601.' },
        description: { type: 'string' },
        client_id: { type: 'string' },
        assigned_to: { type: 'string' },
        visibility: { type: 'string', enum: ['public', 'private'] },
      },
      required: ['title', 'type', 'date'],
    },
  },
  {
    name: 'update_agenda_event',
    description: 'Atualiza título, data, descrição ou tipo de um compromisso existente (reflete no Google Calendar).',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        date: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'cancel_agenda_event',
    description: 'Cancela (remove) um compromisso, inclusive do Google Calendar.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'list_chat_messages',
    description: 'Lista mensagens recentes do chat interno do time (canal geral ou uma conversa direta).',
    input_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: "Padrão: 'general'." },
        with_user_id: { type: 'string', description: 'ID de um usuário para ler a DM com ele.' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'send_chat_message',
    description:
      'Envia uma mensagem no chat interno do time, como o próprio HERMES (identidade dedicada, não uma pessoa do time).',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        channel: { type: 'string', description: "Padrão: 'general'." },
        receiver_id: { type: 'string', description: 'ID de um usuário para mandar uma DM.' },
      },
      required: ['content'],
    },
  },
];

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  return NextResponse.json({ tools: TOOLS });
}
