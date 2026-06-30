-- Adiciona campo de observação interna nas transações do banco e nas entradas de despesa
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS notes TEXT;

-- Vincula uma "Cobrança recebida" ao payment transaction que ela confirma (sem double-count).
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS confirms_asaas_transaction_id TEXT REFERENCES asaas_transactions(id);

-- Corrige transações de cobrança recebida que foram salvas incorretamente como DEBIT.
-- O Asaas retorna type='PAYMENT' para cobranças recebidas; o sync antigo mapeava qualquer
-- tipo diferente de 'CREDIT' para 'DEBIT', causando a classificação errada.
UPDATE asaas_transactions
SET type = 'CREDIT'
WHERE type = 'DEBIT'
  AND description ILIKE 'Cobrança recebida%'
  AND expense_entry_id IS NULL;

-- Vínculo de CLIENTE (apenas visual), independente do vínculo financeiro (expense_entry/invoice).
-- Ex.: uma taxa de notificação WhatsApp é uma despesa vinculada à "TAXA BANCÁRIA",
-- mas referente ao cliente X — esse campo guarda essa atribuição visual.
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Referências do extrato Asaas para detalhar origem/destino (ex.: destino de um Pix de saída).
-- transfer_id permite buscar a transferência em /transfers/{id} (destinatário, chave Pix, banco).
-- Linhas antigas ficam nulas até um novo "Sincronizar" repopular o extrato.
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- REPASSE / TRÁFEGO PAGO: transação que é só passagem de dinheiro (ex.: pagamento de
-- Facebook Ads que será reembolsado pelo cliente). Marcada como repasse, ela NÃO deve
-- ser vinculada a despesa/fatura, então não entra em Faturamento, Despesas ou Fluxo de Caixa.
-- O DÉBITO (pagamento do anúncio) e o CRÉDITO (reembolso do cliente) são atribuídos ao
-- cliente via client_id; o saldo em aberto = adiantado (DEBIT) − reembolsado (CREDIT).
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS is_passthrough BOOLEAN NOT NULL DEFAULT false;

-- Para um CRÉDITO de repasse, indica se ele abate o "Saldo a Receber" do cliente.
-- true (padrão) = reembolso normal, reduz o saldo. false = reembolso extra/avulso que aparece
-- vinculado ao cliente mas NÃO abate o saldo (ex.: devolução sem adiantamento correspondente).
ALTER TABLE asaas_transactions ADD COLUMN IF NOT EXISTS passthrough_offsets BOOLEAN NOT NULL DEFAULT true;
