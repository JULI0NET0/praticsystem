import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function readPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Configuração do Supabase incompleta.");
  }
  return { url, anonKey };
}

export async function createClientForUser() {
  const { url, anonKey } = readPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Em Server Component o cookie é só leitura. O proxy renova a sessão.
        }
      },
    },
  });
}

export async function requireUser() {
  let supabase: Awaited<ReturnType<typeof createClientForUser>>;
  try {
    supabase = await createClientForUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuração do Supabase incompleta.";
    return { ok: false as const, status: 500, message };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false as const, status: 401, message: "Faça login para continuar." };
  }
  return { ok: true as const, supabase, user: data.user };
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Configuração do Supabase incompleta.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
