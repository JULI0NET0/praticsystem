-- =============================================================
-- Prospecção v4: impede leads duplicados pelo 9º dígito do celular
-- (5543999359959 e 554399359959 são o mesmo número) e une os que já
-- existem. Idempotente. Rodar DEPOIS da v3.
-- =============================================================

-- Chave canônica: remove o 9 inserido em celulares BR de 13 dígitos
CREATE OR REPLACE FUNCTION public.phone_key(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN t IS NULL THEN NULL
        WHEN length(t) = 13 AND substr(t, 1, 2) = '55' AND substr(t, 5, 1) = '9'
            THEN substr(t, 1, 4) || substr(t, 6)
        ELSE t
    END
$$;

-- 1) União dos duplicados existentes
DO $$
DECLARE
    grp RECORD;
    keeper UUID;
    keeper_phone TEXT;
    other UUID;
BEGIN
    FOR grp IN
        SELECT public.phone_key(telefone) AS k
        FROM public.leads
        WHERE telefone IS NOT NULL
        GROUP BY 1
        HAVING count(*) > 1
    LOOP
        -- principal: cadastro manual primeiro, depois o mais antigo
        SELECT id INTO keeper
        FROM public.leads
        WHERE public.phone_key(telefone) = grp.k
        ORDER BY (origem = 'manual') DESC, created_at ASC
        LIMIT 1;

        -- telefone preferido: a forma com 9 (a que o WhatsApp aceita para envio)
        SELECT telefone INTO keeper_phone
        FROM public.leads
        WHERE public.phone_key(telefone) = grp.k
        ORDER BY length(telefone) DESC, created_at ASC
        LIMIT 1;

        FOR other IN
            SELECT id FROM public.leads WHERE public.phone_key(telefone) = grp.k AND id <> keeper
        LOOP
            UPDATE public.lead_messages SET lead_id = keeper WHERE lead_id = other;
            UPDATE public.lead_activities SET lead_id = keeper WHERE lead_id = other;
            -- destinatário de campanha: evita violar UNIQUE (campaign_id, lead_id)
            DELETE FROM public.campaign_recipients c
                WHERE c.lead_id = other
                  AND EXISTS (SELECT 1 FROM public.campaign_recipients k WHERE k.lead_id = keeper AND k.campaign_id = c.campaign_id);
            UPDATE public.campaign_recipients SET lead_id = keeper WHERE lead_id = other;

            -- completa o principal com o que só o outro tem
            UPDATE public.leads k SET
                wa_name          = COALESCE(k.wa_name, o.wa_name),
                wa_contact_name  = COALESCE(k.wa_contact_name, o.wa_contact_name),
                wa_business_name = COALESCE(k.wa_business_name, o.wa_business_name),
                wa_about         = COALESCE(k.wa_about, o.wa_about),
                wa_avatar_url    = COALESCE(k.wa_avatar_url, o.wa_avatar_url),
                wa_is_business   = k.wa_is_business OR o.wa_is_business,
                wa_synced_at     = COALESCE(k.wa_synced_at, o.wa_synced_at),
                empresa          = COALESCE(k.empresa, o.empresa),
                email            = COALESCE(k.email, o.email),
                instagram        = COALESCE(k.instagram, o.instagram),
                notas            = COALESCE(k.notas, o.notas),
                unread_count     = k.unread_count + o.unread_count,
                last_message_preview = CASE WHEN COALESCE(o.last_message_at, 'epoch') > COALESCE(k.last_message_at, 'epoch') THEN o.last_message_preview ELSE k.last_message_preview END,
                last_message_at  = GREATEST(k.last_message_at, o.last_message_at)
            FROM public.leads o
            WHERE k.id = keeper AND o.id = other;

            DELETE FROM public.leads WHERE id = other;
        END LOOP;

        UPDATE public.leads SET telefone = keeper_phone WHERE id = keeper;
    END LOOP;
END $$;

-- 2) Daqui em diante o banco recusa a duplicata
DROP INDEX IF EXISTS public.leads_telefone_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_key_uidx
    ON public.leads (public.phone_key(telefone)) WHERE telefone IS NOT NULL;

NOTIFY pgrst, 'reload schema';
