const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export type GoogleAccount = 'agenciapratic' | 'praticlabs';

// Reunião, Captação, Tarefa Interna, Social Media, Tráfego Pago e Lançamento são "gerais" e
// vão para agenciapratic@gmail.com; pagamento e reunião de liderança são assuntos internos/
// financeiros e vão para praticlabs@gmail.com.
export const CATEGORY_GOOGLE_ACCOUNT: Record<string, GoogleAccount> = {
  meeting: 'agenciapratic',
  leadership_meeting: 'agenciapratic',
  prospecting: 'agenciapratic',
  task: 'agenciapratic',
  social_media: 'agenciapratic',
  ads: 'agenciapratic',
  launch: 'agenciapratic',
  payment: 'agenciapratic',
};

const REFRESH_TOKEN_BY_ACCOUNT: Record<GoogleAccount, string> = {
  agenciapratic: process.env.GOOGLE_REFRESH_TOKEN_AGENCIAPRATIC || '',
  praticlabs: process.env.GOOGLE_REFRESH_TOKEN_PRATICLABS || '',
};

const accessTokenCache: Partial<Record<GoogleAccount, { token: string; expiresAt: number }>> = {};

export function isAccountConfigured(account: GoogleAccount): boolean {
  const refreshToken = REFRESH_TOKEN_BY_ACCOUNT[account];
  return Boolean(GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET && refreshToken);
}

export function isOAuthConfigured(): boolean {
  return Boolean(GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET);
}

export function getGoogleAuthUrl(account: GoogleAccount, redirectUri: string): string {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID não está configurado nas variáveis de ambiente.');
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state: account,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error('Credenciais GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET não configuradas.');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erro ao trocar código por token do Google: ${res.status} ${errorBody}`);
  }

  return await res.json();
}

async function getAccessToken(account: GoogleAccount): Promise<string> {
  const cached = accessTokenCache[account];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const refreshToken = REFRESH_TOKEN_BY_ACCOUNT[account];
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !refreshToken) {
    throw new Error(`Credenciais do Google não configuradas para a conta "${account}". Verifique GOOGLE_REFRESH_TOKEN_${account.toUpperCase()}`);
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao renovar token do Google (${account}): ${res.status} ${body}`);
  }

  const data = await res.json();
  accessTokenCache[account] = {
    token: data.access_token,
    // Renova um pouco antes do vencimento real para evitar folga zero.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function calendarFetch(account: GoogleAccount, path: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken(account);
  const res = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API error ${res.status}: ${body}`);
  }

  return res.status === 204 ? null : res.json();
}

export interface GoogleEventInput {
  title: string;
  date: string;
  description?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  updated?: string;
}

function toEventResource({ title, date, description }: GoogleEventInput) {
  const start = new Date(date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    summary: title,
    description: description || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

export function inferCategoryFromEvent(title: string = '', description: string = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  if (
    text.includes('captação') ||
    text.includes('captacao') ||
    text.includes('gravação') ||
    text.includes('gravacao') ||
    text.includes('prospecção') ||
    text.includes('prospeccao')
  ) {
    return 'prospecting';
  }
  if (text.includes('social media') || text.includes('instagram') || text.includes('post') || text.includes('reels') || text.includes('carrossel')) {
    return 'social_media';
  }
  if (text.includes('tráfego') || text.includes('trafego') || text.includes('ads') || text.includes('meta ads') || text.includes('google ads')) {
    return 'ads';
  }
  if (text.includes('lançamento') || text.includes('lancamento')) {
    return 'launch';
  }
  if (text.includes('liderança') || text.includes('lideranca') || text.includes('diretoria') || text.includes('board')) {
    return 'leadership_meeting';
  }
  if (text.includes('pagamento') || text.includes('financeiro') || text.includes('fatura') || text.includes('boleto')) {
    return 'payment';
  }
  if (text.includes('tarefa') || text.includes('task') || text.includes('interno')) {
    return 'task';
  }
  return 'meeting';
}

export async function listEvents(
  account: GoogleAccount,
  options: { timeMin?: string; timeMax?: string; maxResults?: number; showDeleted?: boolean } = {}
): Promise<GoogleCalendarEvent[]> {
  const query = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(options.maxResults || 250),
    showDeleted: options.showDeleted ? 'true' : 'false',
  });

  if (options.timeMin) {
    query.set('timeMin', options.timeMin);
  }
  if (options.timeMax) {
    query.set('timeMax', options.timeMax);
  }

  const data = await calendarFetch(account, `/calendars/primary/events?${query.toString()}`);
  return data?.items || [];
}

export async function insertEvent(account: GoogleAccount, input: GoogleEventInput): Promise<string> {
  const event = await calendarFetch(account, '/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(toEventResource(input)),
  });
  return event.id;
}

export async function updateEvent(account: GoogleAccount, googleEventId: string, input: GoogleEventInput): Promise<void> {
  await calendarFetch(account, `/calendars/primary/events/${googleEventId}`, {
    method: 'PATCH',
    body: JSON.stringify(toEventResource(input)),
  });
}

export async function deleteEvent(account: GoogleAccount, googleEventId: string): Promise<void> {
  try {
    await calendarFetch(account, `/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Evento já removido manualmente no Google — não é um erro para o nosso fluxo.
    if (!errorMsg.includes('404') && !errorMsg.includes('410')) {
      throw err;
    }
  }
}
