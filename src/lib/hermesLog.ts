import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Registra toda ação (leitura ou escrita) do Hermes Agent em hermes_agent_logs.
 * Falha de log nunca deve derrubar a requisição principal — por isso engole erros.
 */
export async function logHermesAction(
  supabase: SupabaseClient,
  action: string,
  payload: unknown,
  result: 'success' | 'error',
  detail?: unknown
): Promise<void> {
  try {
    await supabase.from('hermes_agent_logs').insert([
      {
        action,
        payload: payload ?? null,
        result,
        detail: detail ?? null,
      },
    ]);
  } catch {
    // Auditoria não pode quebrar o fluxo principal.
  }
}
