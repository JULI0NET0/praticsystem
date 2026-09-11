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
});

async function handler(request: Request) {
  const authError = requireHermesAuth(request);
  if (authError) return authError;

  return mcpHandler(request);
}

export { handler as GET, handler as POST };
