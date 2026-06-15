-- Criação da tabela clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sequential_id SERIAL,
    name TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT NOT NULL,
    tipo_pessoa TEXT CHECK (tipo_pessoa IN ('PF', 'PJ')) DEFAULT 'PJ',
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_financeiro TEXT,
    phone TEXT NOT NULL,
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

-- Habilita o RLS (Row Level Security) - Descomente e ajuste as regras de acordo com sua necessidade de segurança
-- ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir acesso total temporário" ON public.clients FOR ALL USING (true);

-- Atualiza o cache do schema no Supabase (essencial para evitar o erro PGRST205)
NOTIFY pgrst, 'reload schema';
