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

-- Sincronização da Agenda com duas contas do Google Calendar (agenciapratic@gmail.com para
-- agendas/captações gerais, praticlabs@gmail.com para pagamento e reuniões de liderança).
-- Nova subcategoria "Reunião de Liderança", separada da "Reunião" comum, para poder rotear
-- cada uma para uma conta diferente.
ALTER TABLE agenda_events DROP CONSTRAINT IF EXISTS agenda_events_type_check;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_events_type_check
  CHECK (type IN ('meeting','prospecting','task','social_media','ads','launch','payment','leadership_meeting'));

-- Guarda o evento correspondente no Google Calendar e em qual das duas contas ele foi criado,
-- para permitir atualizar/apagar depois (inclusive mover de conta se a categoria mudar).
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS google_account TEXT CHECK (google_account IN ('agenciapratic','praticlabs'));

-- Vínculo opcional Demandas <-> Agenda: uma demanda pode "aparecer" na
-- agenda como um evento-espelho se receber um Assunto (mesmo vocabulário de
-- agenda_events.type). NULL = não aparece na agenda (estado padrão / de
-- todas as demandas existentes hoje).
ALTER TABLE demands ADD COLUMN IF NOT EXISTS agenda_subject TEXT
  CHECK (agenda_subject IN ('meeting','leadership_meeting','prospecting','task','demand'));

-- Evento-espelho gerado a partir de uma demanda (um-para-um). ON DELETE
-- CASCADE: apagar a demanda remove o evento correspondente na Agenda.
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS demand_id UUID
  REFERENCES public.demands(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS agenda_events_demand_id_key
  ON agenda_events (demand_id) WHERE demand_id IS NOT NULL;

-- Novo assunto genérico "Demanda" no vocabulário da Agenda.
ALTER TABLE agenda_events DROP CONSTRAINT IF EXISTS agenda_events_type_check;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_events_type_check
  CHECK (type IN ('meeting','prospecting','task','social_media','ads','launch','payment','leadership_meeting','demand'));

-- RLS de agenda_events só permitia o próprio assigned_to atualizar/apagar um
-- evento. Isso quebra o vínculo com Demandas, que qualquer membro da equipe
-- pode gerenciar (inclusive o DELETE em cascata do evento ao apagar a
-- demanda de outra pessoa, que roda sob esse mesmo RLS). Alinha com a
-- policy já usada em `demands` (BLOCO 11.6 de setup_database.sql): qualquer
-- membro da equipe pode gerenciar qualquer evento, não só o dono.
DROP POLICY IF EXISTS "agenda_update" ON public.agenda_events;
CREATE POLICY "agenda_update" ON public.agenda_events
    FOR UPDATE USING (public.is_team_member() OR (auth.uid())::text = (assigned_to)::text);

DROP POLICY IF EXISTS "agenda_delete" ON public.agenda_events;
CREATE POLICY "agenda_delete" ON public.agenda_events
    FOR DELETE USING (public.is_team_member() OR (auth.uid())::text = (assigned_to)::text);

NOTIFY pgrst, 'reload schema';

-- Fix: o upsert do evento-espelho ("ON CONFLICT (demand_id)") não conseguia
-- casar com o índice único acima porque ele é PARCIAL (WHERE demand_id IS
-- NOT NULL) — o Postgres só infere ON CONFLICT por lista de colunas quando
-- o índice não tem predicado. O predicado era desnecessário: uma constraint
-- UNIQUE normal já trata cada NULL como distinto, então múltiplas linhas
-- com demand_id nulo continuam permitidas sem precisar do WHERE.
DROP INDEX IF EXISTS agenda_events_demand_id_key;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_events_demand_id_key UNIQUE (demand_id);

NOTIFY pgrst, 'reload schema';
