-- =============================================================
-- PRATIC SYSTEM — Setup do Banco de Dados Supabase
-- Execute este script no Supabase → SQL Editor → Run
-- É seguro rodar múltiplas vezes (IF NOT EXISTS / DROP IF EXISTS)
-- =============================================================


-- =============================================================
-- BLOCO 1: TABELA CLIENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequential_id   SERIAL,
    name            TEXT NOT NULL,
    nome_fantasia   TEXT,
    cnpj            TEXT NOT NULL DEFAULT '',
    tipo_pessoa     TEXT CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PJ',
    contact_name    TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    email_financeiro TEXT,
    phone           TEXT NOT NULL DEFAULT '',
    whatsapp_financeiro TEXT,
    telefone_fixo   TEXT,
    setor           TEXT,
    website         TEXT,
    sistema_proprio TEXT,
    address         JSONB,
    status          TEXT CHECK (status IN ('active', 'inactive', 'prospect')) DEFAULT 'prospect',
    social_access   JSONB,
    portal_email    TEXT,
    portal_password TEXT,
    briefing        TEXT,
    servico_interesse TEXT,
    onboarding_date DATE,
    google_drive_url TEXT,
    essential_links JSONB DEFAULT '[]'::jsonb,
    drive_settings  JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sequential_id      SERIAL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nome_fantasia      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_financeiro   TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS whatsapp_financeiro TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telefone_fixo      TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS setor              TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website            TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sistema_proprio    TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_email       TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_password    TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS briefing           TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS servico_interesse  TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_date    DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS google_drive_url   TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS essential_links    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS drive_settings     JSONB;


-- =============================================================
-- BLOCO 2: SERVIÇOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.services (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    price         NUMERIC NOT NULL DEFAULT 0,
    is_recurring  BOOLEAN NOT NULL DEFAULT true,
    category      TEXT NOT NULL DEFAULT 'outros',
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    minimum_term  INT,
    observations  TEXT,
    descriptive   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- BLOCO 3: CONTRATOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id          UUID REFERENCES public.services(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired')),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    value               NUMERIC NOT NULL DEFAULT 0,
    auto_renew          BOOLEAN NOT NULL DEFAULT false,
    billing_cycle       TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    minimum_term        INT,
    posts_per_week      INT,
    content_capture     BOOLEAN DEFAULT false,
    capture_frequency   TEXT,
    document_content    TEXT,
    document_status     TEXT DEFAULT 'pending' CHECK (document_status IN ('pending', 'generated', 'sent', 'signed')),
    signed_document_url TEXT,
    contract_number     INT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS document_content    TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS document_status     TEXT DEFAULT 'pending';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_number     INT;


-- =============================================================
-- BLOCO 4: FATURAS (invoices)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id         UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id       UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    amount            NUMERIC NOT NULL DEFAULT 0,
    due_date          DATE NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    description       TEXT NOT NULL DEFAULT '',
    asaas_payment_id  TEXT,
    paid_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ;


-- =============================================================
-- BLOCO 5: TABELAS FINANCEIRAS (despesas)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('pro_labore', 'funcionario_pj', 'sistema', 'internet', 'outros')),
    amount          NUMERIC NOT NULL,
    due_day         INT,
    recurrence      TEXT NOT NULL CHECK (recurrence IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    related_user_id UUID,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_entries (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id            UUID REFERENCES public.expenses(id),
    description           TEXT NOT NULL,
    amount                NUMERIC NOT NULL,
    date                  DATE NOT NULL,
    status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    asaas_transaction_id  TEXT UNIQUE,
    category              TEXT,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de transações do Asaas (depende de invoices e expense_entries)
CREATE TABLE IF NOT EXISTS public.asaas_transactions (
    id               TEXT PRIMARY KEY,
    description      TEXT,
    value            NUMERIC,
    type             TEXT CHECK (type IN ('CREDIT', 'DEBIT')),
    date             DATE,
    status           TEXT,
    expense_entry_id UUID REFERENCES public.expense_entries(id),
    invoice_id       UUID REFERENCES public.invoices(id),
    synced_at        TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================
-- BLOCO 6: AGENDA EVENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agenda_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('meeting', 'prospecting', 'task', 'social_media', 'ads', 'launch', 'payment')),
    date        TIMESTAMPTZ NOT NULL,
    client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    visibility  TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status      TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas (sem NOT NULL para não falhar em tabelas com dados)
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS type        TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS visibility  TEXT DEFAULT 'public';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'scheduled';
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_select" ON public.agenda_events;
CREATE POLICY "agenda_select" ON public.agenda_events
    FOR SELECT USING (
        visibility = 'public'
        OR (auth.uid())::text = (assigned_to)::text
    );

DROP POLICY IF EXISTS "agenda_insert" ON public.agenda_events;
CREATE POLICY "agenda_insert" ON public.agenda_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_update" ON public.agenda_events;
CREATE POLICY "agenda_update" ON public.agenda_events
    FOR UPDATE USING ((auth.uid())::text = (assigned_to)::text);

DROP POLICY IF EXISTS "agenda_delete" ON public.agenda_events;
CREATE POLICY "agenda_delete" ON public.agenda_events
    FOR DELETE USING ((auth.uid())::text = (assigned_to)::text);


-- =============================================================
-- BLOCO 7: NOTAS INTERNAS (notes)
-- Colunas usadas pelo código:
--   id, user_id, title, content (JSONB TipTap), date, subjects (TEXT[]),
--   client_id, shared_with (UUID[]), share_all, pin_to_client,
--   created_at, updated_at
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notes (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT '',
    content       JSONB DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    subjects      TEXT[] DEFAULT '{}',
    client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    shared_with   UUID[] DEFAULT '{}',
    share_all     BOOLEAN NOT NULL DEFAULT false,
    pin_to_client BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Garante colunas em instâncias antigas
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS subjects      TEXT[] DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS shared_with   UUID[] DEFAULT '{}';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS share_all     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pin_to_client BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Trigger: atualiza updated_at automaticamente a cada UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Usuário vê: próprias notas + share_all + notas onde está em shared_with
DROP POLICY IF EXISTS "notes_select" ON public.notes;
CREATE POLICY "notes_select" ON public.notes
    FOR SELECT USING (
        (auth.uid())::text = (user_id)::text
        OR share_all = true
        OR (auth.uid())::text = ANY(shared_with::text[])
    );

DROP POLICY IF EXISTS "notes_insert" ON public.notes;
CREATE POLICY "notes_insert" ON public.notes
    FOR INSERT WITH CHECK ((auth.uid())::text = (user_id)::text);

DROP POLICY IF EXISTS "notes_update" ON public.notes;
CREATE POLICY "notes_update" ON public.notes
    FOR UPDATE USING ((auth.uid())::text = (user_id)::text);

DROP POLICY IF EXISTS "notes_delete" ON public.notes;
CREATE POLICY "notes_delete" ON public.notes
    FOR DELETE USING ((auth.uid())::text = (user_id)::text);


-- =============================================================
-- BLOCO 8: RESTAURAR CLIENTES DE AMOSTRA
-- ON CONFLICT DO NOTHING — não duplica se o id já existir
-- =============================================================

INSERT INTO public.clients (name, nome_fantasia, cnpj, tipo_pessoa, contact_name, email, phone, status)
VALUES
    ('Recloset Bazar', 'Recloset Bazar', '00.000.000/0001-01', 'PJ', 'Recloset Bazar', 'recloset@placeholder.com', '00000000000', 'active'),
    ('Cold Joias',     'Cold Joias',     '00.000.000/0001-02', 'PJ', 'Cold Joias',     'coldjoias@placeholder.com', '00000000000', 'active')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- BLOCO 9: USUÁRIOS INTERNOS (users)
-- Espelha auth.users com dados de perfil da equipe
-- =============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    username        TEXT UNIQUE,
    role            TEXT,
    status_message  TEXT,
    avatar_url      TEXT,
    phone           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone          TEXT;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete" ON public.users
    FOR DELETE USING (auth.uid() IS NOT NULL);


-- =============================================================
-- BLOCO 10: CARGOS E PERMISSÕES (roles)
-- id é slug TEXT (ex: 'admin', 'social_media')
-- permissions é TEXT[] para corresponder ao tipo TypeScript
-- =============================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Cargos são públicos para leitura (necessário no formulário de criação de usuário)
DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_insert" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_update" ON public.roles;
CREATE POLICY "roles_update" ON public.roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "roles_delete" ON public.roles;
CREATE POLICY "roles_delete" ON public.roles
    FOR DELETE USING (auth.uid() IS NOT NULL);


-- Atualiza o cache do schema no Supabase
NOTIFY pgrst, 'reload schema';
