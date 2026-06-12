const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Asaas API error ${res.status}: ${body}`);
  }

  return res.json();
}

export interface AsaasTransactionRaw {
  id: string;
  description?: string;
  value: number;
  type: 'CREDIT' | 'DEBIT';
  date: string;
  status: string;
  transferType?: string;
  category?: string;
}

export interface AsaasTransactionsResponse {
  data: AsaasTransactionRaw[];
  totalCount: number;
  hasMore: boolean;
  totalPages: number;
}

export async function getTransactions(
  startDate: string,
  endDate: string,
  offset = 0,
  limit = 100
): Promise<AsaasTransactionsResponse> {
  const params = new URLSearchParams({
    startDate,
    endDate,
    offset: String(offset),
    limit: String(limit),
  });
  return asaasFetch(`/financialTransactions?${params}`);
}

export async function getAllTransactions(
  startDate: string,
  endDate: string
): Promise<AsaasTransactionRaw[]> {
  const all: AsaasTransactionRaw[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await getTransactions(startDate, endDate, offset, limit);
    all.push(...page.data);
    if (!page.hasMore) break;
    offset += limit;
  }

  return all;
}
