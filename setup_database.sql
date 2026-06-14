-- =============================================================
-- PRATIC SYSTEM — Setup do Banco de Dados Supabase
-- Execute este script no Supabase → SQL Editor → Run
-- É seguro rodar múltiplas vezes (IF NOT EXISTS / ON CONFLICT)
-- =============================================================


-- =============================================================
-- BLOCO 1: TABELA CLIENTS (garante que existe com schema completo)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT NOT NULL DEFAULT '',
    tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PJ',
    contact_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    email_financeiro TEXT,
    phone TEXT NOT NULL DEFAULT '',
    whatsapp_financeiro TEXT,
    telefone_fixo TEXT,
    setor TEXT,
    website TEXT,
    sistema_proprio TEXT,
    address JSONB,
    status TEXT CHECK (status IN ('active', 'inactive', 'prospect')) DEFAULT 'prospect',
    social_access JSONB,
    notes JSONB DEFAULT '[]'::jsonb,
    portal_email TEXT,
    portal_password TEXT,
    briefing TEXT,
    servico_interesse TEXT,
    onboarding_date DATE,
    google_drive_url TEXT,
    essential_links JSONB DEFAULT '[]'::jsonb,
    drive_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona colunas que podem não existir em instâncias antigas
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_financeiro TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp_financeiro TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telefone_fixo TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS setor TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sistema_proprio TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_password TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS briefing TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS servico_interesse TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_drive_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS essential_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_settings JSONB;


-- =============================================================
-- BLOCO 2: TABELAS FINANCEIRAS
-- =============================================================

-- Despesas fixas programadas
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pro_labore', 'funcionario_pj', 'sistema', 'internet', 'outros')),
    amount NUMERIC NOT NULL,
    due_day INT,
    recurrence TEXT NOT NULL CHECK (recurrence IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    related_user_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lançamentos reais de despesas (pagamentos efetuados)
CREATE TABLE IF NOT EXISTS public.expense_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES public.expenses(id),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    asaas_transaction_id TEXT UNIQUE,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de transações importadas do Asaas
CREATE TABLE IF NOT EXISTS public.asaas_transactions (
    id TEXT PRIMARY KEY,
    description TEXT,
    value NUMERIC,
    type TEXT CHECK (type IN ('CREDIT', 'DEBIT')),
    date DATE,
    status TEXT,
    expense_entry_id UUID REFERENCES public.expense_entries(id),
    invoice_id UUID REFERENCES public.invoices(id),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- BLOCO 3: TABELA AGENDA EVENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agenda_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('meeting', 'prospecting', 'task', 'social_media', 'ads', 'launch', 'payment')),
    date TIMESTAMPTZ NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona colunas que podem não existir em instâncias antigas da tabela
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS: usuários veem eventos públicos ou os que foram atribuídos a eles
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_select" ON public.agenda_events;
CREATE POLICY "agenda_select" ON public.agenda_events
    FOR SELECT USING (visibility = 'public' OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "agenda_insert" ON public.agenda_events;
CREATE POLICY "agenda_insert" ON public.agenda_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_update" ON public.agenda_events;
CREATE POLICY "agenda_update" ON public.agenda_events
    FOR UPDATE USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "agenda_delete" ON public.agenda_events;
CREATE POLICY "agenda_delete" ON public.agenda_events
    FOR DELETE USING (assigned_to = auth.uid());


-- =============================================================
-- BLOCO 4: RESTAURAR CLIENTES PERDIDOS
-- (ON CONFLICT DO NOTHING — não duplica se já existir pelo nome)
-- =============================================================

-- Inserção simples por nome — edite os dados reais depois em /admin/clients
INSERT INTO public.clients (name, nome_fantasia, cnpj, tipo_pessoa, contact_name, email, phone, status)
VALUES
    ('Recloset Bazar', 'Recloset Bazar', '00.000.000/0001-01', 'PJ', 'Recloset Bazar', 'recloset@placeholder.com', '00000000000', 'active'),
    ('Cold Joias',     'Cold Joias',     '00.000.000/0001-02', 'PJ', 'Cold Joias',     'coldjoias@placeholder.com', '00000000000', 'active')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- BLOCO 5: DIAGNÓSTICO — invoices sem cliente vinculado
-- Rode este SELECT SEPARADAMENTE para ver quais faturas
-- precisam ser re-associadas a um cliente.
-- =============================================================

SELECT
    i.id          AS invoice_id,
    i.description,
    i.amount,
    i.due_date,
    i.status,
    i.client_id   AS client_id_atual
FROM public.invoices i
LEFT JOIN public.clients c ON c.id = i.client_id
WHERE c.id IS NULL
ORDER BY i.due_date DESC;


-- =============================================================
-- BLOCO 6: (OPCIONAL) Vincular invoices existentes aos clientes
-- Se o SELECT acima mostrar faturas orphaned, você pode
-- executar os comandos abaixo adaptando os filtros de descrição.
--
-- Exemplo: vincular todas as faturas "Recloset" ao cliente recém-criado
--
-- UPDATE public.invoices
-- SET client_id = (SELECT id FROM public.clients WHERE name = 'Recloset Bazar' LIMIT 1)
-- WHERE description ILIKE '%recloset%';
--
-- UPDATE public.invoices
-- SET client_id = (SELECT id FROM public.clients WHERE name = 'Cold Joias' LIMIT 1)
-- WHERE description ILIKE '%cold%' OR description ILIKE '%joia%';
-- =============================================================


-- Atualiza o cache do schema no Supabase
NOTIFY pgrst, 'reload schema';
