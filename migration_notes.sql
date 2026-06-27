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
