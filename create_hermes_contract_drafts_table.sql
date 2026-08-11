-- Integração Hermes Agent: rascunhos de contrato (revisão humana antes de virar contrato oficial)

CREATE TABLE IF NOT EXISTS public.hermes_contract_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    service_id UUID NOT NULL REFERENCES public.services(id),
    value NUMERIC NOT NULL,
    duration_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    posts_per_week INTEGER,
    capture_frequency TEXT,
    custom_clauses TEXT,
    document_content TEXT NOT NULL,
    notes TEXT,
    status TEXT CHECK (status IN ('pending_review', 'approved', 'rejected')) DEFAULT 'pending_review',
    resulting_contract_id UUID REFERENCES public.contracts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Atualiza o cache do schema no Supabase (essencial para evitar o erro PGRST205)
NOTIFY pgrst, 'reload schema';
