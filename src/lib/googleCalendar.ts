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
  prospecting: 'agenciapratic',
  task: 'agenciapratic',
  social_media: 'agenciapratic',
  ads: 'agenciapratic',
  launch: 'agenciapratic',
  payment: 'praticlabs',
  leadership_meeting: 'praticlabs',
};

const REFRESH_TOKEN_BY_ACCOUNT: Record<GoogleAccount, string> = {
  agenciapratic: process.env.GOOGLE_REFRESH_TOKEN_AGENCIAPRATIC || '',
  praticlabs: process.env.GOOGLE_REFRESH_TOKEN_PRATICLABS || '',
};

const accessTokenCache: Partial<Record<GoogleAccount, { token: string; expiresAt: number }>> = {};

async function getAccessToken(account: GoogleAccount): Promise<string> {
  const cached = accessTokenCache[account];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const refreshToken = REFRESH_TOKEN_BY_ACCOUNT[account];
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !refreshToken) {
    throw new Error(`Credenciais do Google não configuradas para a conta "${account}"`);
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
  } catch (err: any) {
    // Evento já removido manualmente no Google — não é um erro para o nosso fluxo.
    if (!String(err.message).includes('404') && !String(err.message).includes('410')) {
      throw err;
    }
  }
}
