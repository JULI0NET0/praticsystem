const FOCUS = "/prospeccao";
const ADMIN = "/admin/prospeccao";

/** Base da prospecção conforme a rota em que a pessoa entrou. */
export function prospeccaoBase(pathname: string): typeof FOCUS | typeof ADMIN {
  if (pathname === FOCUS || pathname.startsWith(`${FOCUS}/`)) return FOCUS;
  return ADMIN;
}

/** Caminho focado equivalente à aba atual, para copiar e compartilhar. */
export function prospeccaoFocusPath(pathname: string, search = ""): string {
  const base = prospeccaoBase(pathname);
  const suffix = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  return `${FOCUS}${suffix}${search}`;
}

/**
 * Só aceita um caminho interno da prospecção focada.
 * Rejeita URL absoluta, protocolo e qualquer destino fora de /prospeccao.
 */
export function safeProspeccaoNext(raw: string | null): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw, "http://local");
  } catch {
    return null;
  }
  if (url.origin !== "http://local") return null;
  const path = url.pathname;
  if (path !== FOCUS && !path.startsWith(`${FOCUS}/`)) return null;
  return path + url.search;
}
