import type { AsaasTransaction, Invoice } from "@/types/database";

/** Minimal client shape needed for matching (name = razão social). */
export interface ClientLite {
  id: string;
  name: string;
  nome_fantasia?: string;
  cnpj?: string;
}

export function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai número de fatura de descrições como "Cobrança recebida - fatura nr. 828259495 ...". */
export function extractFaturaNumber(desc: string): string | null {
  const m = desc.match(/(?:fatura|cobran[cç]a)\s+(?:nr\.?\s*)?(\d{6,})/i);
  return m ? m[1] : null;
}

/** Mapeia taxas Asaas para categorias de despesa. */
export function detectFeeCategory(desc: string): string | null {
  if (/taxa\s+do?\s+pix/i.test(desc)) return "taxa_asaas";
  if (/taxa\s+de\s+notifica[cç][aã]o/i.test(desc)) return "taxa_mensageria";
  if (/taxa\s+de\s+mensageria/i.test(desc)) return "taxa_mensageria";
  if (/taxa\s+(?:de\s+)?boleto/i.test(desc)) return "taxa_boleto";
  if (/taxa\s+asaas/i.test(desc)) return "taxa_asaas";
  return null;
}

/**
 * Fuzzy-match de cliente a partir da descrição da transação Asaas.
 * Considera Razão Social (name), Nome Fantasia e CNPJ, pois o Asaas
 * às vezes traz a razão social ("... Ltda.") em vez do nome fantasia.
 */
export function matchClient(
  description: string,
  clientList: ClientLite[]
): { client: ClientLite; score: number } | null {
  const descNorm = normalizeStr(description);
  const descDigits = description.replace(/\D/g, "");
  let best: { client: ClientLite; score: number } | null = null;

  for (const client of clientList) {
    // CNPJ exato presente na descrição é match máximo
    const clientDigits = (client.cnpj || "").replace(/\D/g, "");
    if (clientDigits.length >= 11 && descDigits.includes(clientDigits)) {
      return { client, score: 1 };
    }

    // Testa tokens de razão social e nome fantasia
    let bestForClient = 0;
    for (const field of [client.name, client.nome_fantasia]) {
      if (!field) continue;
      const words = normalizeStr(field).split(/\s+/).filter((w) => w.length >= 4);
      if (words.length === 0) continue;
      let matches = 0;
      for (const word of words) {
        if (descNorm.includes(word)) { matches++; continue; }
        const prefix = word.slice(0, 5);
        if (prefix.length >= 4 && descNorm.includes(prefix)) matches++;
      }
      const score = matches / words.length;
      if (matches >= 1 && score > bestForClient) bestForClient = score;
    }

    if (bestForClient >= 0.5 && (!best || bestForClient > best.score)) {
      best = { client, score: bestForClient };
    }
  }
  return best;
}

export interface FaturaGroup {
  faturaNumber: string;
  clientLabel: string;
  date: string;
  amount: number;
  totalFees: number;
  bankConfirmationTxn: AsaasTransaction | null;
  paymentTxn: AsaasTransaction | null;
  paymentInvoice: Invoice | null;
  feeTxns: Array<{ txn: AsaasTransaction; category: string | null }>;
  isAutoReconciled: boolean;
}

/** Agrupa transações Asaas por número de fatura (cobrança recebida + taxas + pagamento). */
export function buildFaturaGroups(
  transactions: AsaasTransaction[],
  invoices: Invoice[],
  clients: ClientLite[]
): FaturaGroup[] {
  const map = new Map<string, FaturaGroup>();

  for (const txn of transactions) {
    if (!txn.description) continue;
    const faturaNum = extractFaturaNumber(txn.description);
    if (!faturaNum) continue;

    if (!map.has(faturaNum)) {
      map.set(faturaNum, {
        faturaNumber: faturaNum, clientLabel: "", date: txn.date,
        amount: 0, totalFees: 0,
        bankConfirmationTxn: null, paymentTxn: null, paymentInvoice: null,
        feeTxns: [], isAutoReconciled: false,
      });
    }
    const g = map.get(faturaNum)!;

    if (txn.type === "CREDIT" && /cobran[cç]a\s+recebida/i.test(txn.description)) {
      g.bankConfirmationTxn = txn;
      g.amount = Number(txn.value);
      g.date = txn.date;
      const sc = matchClient(txn.description, clients);
      g.clientLabel = sc ? (sc.client.nome_fantasia || sc.client.name) : "";
    } else if (txn.type === "DEBIT") {
      g.feeTxns.push({ txn, category: detectFeeCategory(txn.description) });
      g.totalFees += Number(txn.value);
    }
  }

  // Casa cada grupo com o payment transaction (já vinculado via sync-clients)
  for (const g of map.values()) {
    if (!g.bankConfirmationTxn || g.amount === 0) continue;
    const match = findConfidentConfirmation(g.bankConfirmationTxn, transactions, invoices, clients);
    if (match) {
      g.paymentTxn = transactions.find((t) => t.id === match.paymentTxnId) ?? null;
      g.paymentInvoice = invoices.find((i) => i.id === match.invoiceId) ?? null;
      g.isAutoReconciled = true;
      if (g.paymentInvoice) {
        const client = clients.find((c) => c.id === g.paymentInvoice!.client_id);
        if (client) g.clientLabel = client.nome_fantasia || client.name;
      }
    }
  }

  return Array.from(map.values())
    .filter((g) => g.bankConfirmationTxn !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Para uma "Cobrança recebida" sem vínculo, acha a invoice paga + paymentTxn
 * cujo cliente + valor + mês batem com confiança. Retorna ids ou null.
 */
export function findConfidentConfirmation(
  bankTxn: AsaasTransaction,
  transactions: AsaasTransaction[],
  invoices: Invoice[],
  clients: ClientLite[]
): { paymentTxnId: string; invoiceId: string } | null {
  if (!bankTxn.description) return null;
  const amount = Number(bankTxn.value);
  if (amount === 0) return null;
  const bcMonth = bankTxn.date.slice(0, 7);
  const sc = matchClient(bankTxn.description, clients);
  const clientLabel = sc ? (sc.client.nome_fantasia || sc.client.name) : "";

  for (const inv of invoices) {
    if (Math.abs(Number(inv.amount) - amount) >= 0.02) continue;
    if (inv.due_date.slice(0, 7) !== bcMonth) continue;
    const client = clients.find((c) => c.id === inv.client_id);
    if (!client) continue;

    // confirma que o cliente da invoice corresponde ao da descrição
    const cnpjDigits = (client.cnpj || "").replace(/\D/g, "");
    const descDigits = bankTxn.description.replace(/\D/g, "");
    const cnpjHit = cnpjDigits.length >= 11 && descDigits.includes(cnpjDigits);
    let overlap = 0;
    if (clientLabel) {
      const cNorm = normalizeStr(client.nome_fantasia || client.name);
      const lNorm = normalizeStr(clientLabel);
      overlap = lNorm.split(/\s+/).filter((w) => w.length >= 4 && cNorm.includes(w)).length;
    }
    if (!cnpjHit && overlap < 1) continue;

    const payTxn = transactions.find(
      (t) => t.invoice_id === inv.id && t.type === "CREDIT" && t.id !== bankTxn.id && !t.confirms_asaas_transaction_id
    );
    if (payTxn) {
      return { paymentTxnId: payTxn.id, invoiceId: inv.id };
    }
  }
  return null;
}

export interface LancamentoStages {
  invoice: Invoice;
  paymentTxn: AsaasTransaction | null;
  bankConfirmationTxn: AsaasTransaction | null;
  feeTxns: AsaasTransaction[];
  gross: number;
  totalFees: number;
  net: number;
}

/**
 * Monta as 3 etapas de um lançamento (invoice): emissão no sistema,
 * pagamento Asaas e cobrança real (líquido com taxas) para o detalhe.
 */
export function buildLancamentoStages(
  invoice: Invoice,
  transactions: AsaasTransaction[]
): LancamentoStages {
  const linked = transactions.filter((t) => t.invoice_id === invoice.id);
  const paymentTxn =
    linked.find((t) => t.type === "CREDIT" && !t.confirms_asaas_transaction_id) ?? null;
  const bankConfirmationTxn =
    linked.find((t) => t.confirms_asaas_transaction_id) ??
    linked.find((t) => t.type === "CREDIT" && /cobran[cç]a\s+recebida/i.test(t.description || "")) ??
    null;

  // Taxas: mesma fatura da cobrança recebida (ou do pagamento)
  let feeTxns: AsaasTransaction[] = [];
  const faturaSource = bankConfirmationTxn?.description || paymentTxn?.description || "";
  const faturaNum = faturaSource ? extractFaturaNumber(faturaSource) : null;
  if (faturaNum) {
    feeTxns = transactions.filter(
      (t) => t.type === "DEBIT" && extractFaturaNumber(t.description || "") === faturaNum
    );
  }

  const gross = paymentTxn ? Number(paymentTxn.value) : Number(invoice.amount);
  const totalFees = feeTxns.reduce((s, t) => s + Number(t.value), 0);
  return {
    invoice,
    paymentTxn,
    bankConfirmationTxn,
    feeTxns,
    gross,
    totalFees,
    net: gross - totalFees,
  };
}
