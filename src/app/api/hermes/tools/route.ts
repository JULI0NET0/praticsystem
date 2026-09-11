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
];

export async function GET(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  return NextResponse.json({ tools: TOOLS });
}
