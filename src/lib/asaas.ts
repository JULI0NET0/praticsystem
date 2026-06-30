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
  // Asaas returns many type values beyond CREDIT/DEBIT
  type: string;
  date: string;
  status: string;
  transferType?: string;
  category?: string;
  // Referências para detalhar origem/destino (Pix, TED, cobrança)
  transfer?: string | null;
  transferId?: string | null;
  payment?: string | null;
  paymentId?: string | null;
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

export interface AsaasBalance {
  balance: number;
  availableBalance: number;
}

export async function getBalance(): Promise<AsaasBalance> {
  const data = await asaasFetch('/finance/balance');
  return {
    balance: Number(data.balance ?? 0),
    availableBalance: Number(data.availableBalance ?? 0),
  };
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  personType: 'FISICA' | 'JURIDICA';
  address?: string;
  addressNumber?: string;
  cityName?: string;
  state?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  description?: string;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  dateCreated: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixQrCodeUrl?: string;
}

export async function getAsaasPaymentById(id: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${id}`);
}

// Detalhe de uma transferência (Pix/TED) — inclui destinatário, chave Pix e banco
export interface AsaasTransferBankAccount {
  bank?: { code?: string; name?: string };
  ownerName?: string;
  cpfCnpj?: string;
  agency?: string;
  account?: string;
  accountDigit?: string;
}

export interface AsaasTransfer {
  id: string;
  value: number;
  netValue?: number;
  status?: string;
  transferFee?: number;
  dateCreated?: string;
  effectiveDate?: string;
  operationType?: string; // PIX, TED, INTERNAL...
  pixAddressKey?: string;
  pixAddressKeyType?: string;
  description?: string;
  bankAccount?: AsaasTransferBankAccount;
  recipientName?: string;
  recipientCpfCnpj?: string;
}

export async function getAsaasTransferById(id: string): Promise<AsaasTransfer> {
  return asaasFetch(`/transfers/${id}`);
}

export async function createAsaasPayment(data: {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
}): Promise<AsaasPayment> {
  return asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAsaasCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
  const clean = cpfCnpj.replace(/\D/g, '');
  const params = new URLSearchParams({ cpfCnpj: clean });
  const res = await asaasFetch(`/customers?${params}`);
  return res.data?.[0] ?? null;
}

export async function getAsaasPaymentsByCustomer(
  customerId: string,
  offset = 0,
  limit = 100,
  dueDateStart?: string,
  dueDateEnd?: string,
): Promise<{ data: AsaasPayment[]; hasMore: boolean; totalCount: number }> {
  const params = new URLSearchParams({
    customer: customerId,
    offset: String(offset),
    limit: String(limit),
  });
  if (dueDateStart) params.set('dueDate[ge]', dueDateStart);
  if (dueDateEnd) params.set('dueDate[le]', dueDateEnd);
  return asaasFetch(`/payments?${params}`);
}

export async function getAllAsaasPaymentsByCustomer(
  customerId: string,
  dueDateStart?: string,
  dueDateEnd?: string,
): Promise<AsaasPayment[]> {
  const all: AsaasPayment[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await getAsaasPaymentsByCustomer(customerId, offset, limit, dueDateStart, dueDateEnd);
    all.push(...page.data);
    if (!page.hasMore) break;
    offset += limit;
  }

  return all;
}
