-- Prospecção v3: dados completos do contato WhatsApp. Idempotente.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_contact_name  TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_business_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_about         TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_synced_at     TIMESTAMPTZ;
NOTIFY pgrst, 'reload schema';
