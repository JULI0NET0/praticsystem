import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ [Supabase] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não foram encontradas. Crie um arquivo .env.local na raiz do projeto com suas credenciais do Supabase.'
  );
}

const STALE_REFRESH_TOKEN =
  /invalid refresh token|refresh token not found|refresh token is not valid|refresh token already used/i;

const STALE_REFRESH_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
]);

function isStaleRefreshTokenLog(args: unknown[]) {
  return args.some((arg) => {
    if (typeof arg === 'string') return STALE_REFRESH_TOKEN.test(arg);
    if (!arg || typeof arg !== 'object') return false;

    const record = arg as { message?: unknown; code?: unknown };
    if (typeof record.code === 'string' && STALE_REFRESH_CODES.has(record.code)) return true;
    return typeof record.message === 'string' && STALE_REFRESH_TOKEN.test(record.message);
  });
}

// O auth-js faz console.error quando o refresh token guardado no navegador
// já não existe no servidor, mesmo depois de limpar a sessão. O Next trata
// esse log como erro de overlay. O caso já está resolvido (usuário deslogado).
function ignoreStaleRefreshTokenLogs() {
  if (typeof window === 'undefined') return;

  const current = console.error as typeof console.error & { __praticStaleRefreshFilter?: boolean };
  if (current.__praticStaleRefreshFilter) return;

  const filtered = ((...args: unknown[]) => {
    if (isStaleRefreshTokenLog(args)) return;
    current.apply(console, args);
  }) as typeof console.error & { __praticStaleRefreshFilter?: boolean };

  filtered.__praticStaleRefreshFilter = true;
  console.error = filtered;
}

ignoreStaleRefreshTokenLogs();

const globalForSupabase = globalThis as typeof globalThis & {
  __praticSupabase?: ReturnType<typeof createClient>;
};

export const supabase =
  globalForSupabase.__praticSupabase ?? createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== 'undefined') {
  globalForSupabase.__praticSupabase = supabase;
}
