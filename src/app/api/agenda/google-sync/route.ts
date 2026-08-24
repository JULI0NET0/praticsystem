import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  CATEGORY_GOOGLE_ACCOUNT,
  GoogleAccount,
  insertEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  inferCategoryFromEvent,
  isAccountConfigured,
  isOAuthConfigured,
} from '@/lib/googleCalendar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

// GET: Retorna o status de conexão das contas Google
export async function GET() {
  try {
    const isOauthReady = isOAuthConfigured();
    const agenciapraticConfigured = isAccountConfigured('agenciapratic');
    const praticlabsConfigured = isAccountConfigured('praticlabs');

    return NextResponse.json({
      oauthReady: isOauthReady,
      accounts: {
        agenciapratic: {
          configured: agenciapraticConfigured,
          email: 'agenciapratic@gmail.com',
        },
        praticlabs: {
          configured: praticlabsConfigured,
          email: 'praticlabs@gmail.com',
        },
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// POST: Executa push (insert/update/delete) ou pull (sincronizar do Google para o banco)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, eventId, title, type, date, description, account } = body;

    if (!action) {
      return NextResponse.json({ error: 'Ação é obrigatória (pull, insert, update, delete)' }, { status: 400 });
    }

    // ==========================================
    // FLUXO DE VOLTA (PULL: Google -> PraticSystem)
    // ==========================================
    if (action === 'pull') {
      const targetAccount: GoogleAccount = account || 'agenciapratic';

      if (!isAccountConfigured(targetAccount)) {
        return NextResponse.json(
          {
            error: `Conta "${targetAccount}" não configurada no Google Calendar. Verifique as credenciais no .env.local`,
          },
          { status: 400 }
        );
      }

      // Busca eventos dos últimos 30 dias até os próximos 90 dias
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const googleEvents = await listEvents(targetAccount, {
        timeMin: pastDate.toISOString(),
        timeMax: futureDate.toISOString(),
        showDeleted: true,
      });

      // Busca todos os eventos atuais para evitar consultas repetidas e conflitos de concorrência
      const { data: allDbEvents } = await supabase
        .from('agenda_events')
        .select('id, title, date, description, type, google_event_id');

      const eventsByGoogleId = new Map<string, any>();
      const eventsByTitleDate = new Map<string, any>();

      // Se houver registros duplicados antigos com o mesmo google_event_id, remove os excedentes
      if (allDbEvents) {
        for (const dbEv of allDbEvents) {
          if (dbEv.google_event_id) {
            if (eventsByGoogleId.has(dbEv.google_event_id)) {
              // Duplicata encontrada, deleta a cópia extra
              await supabase.from('agenda_events').delete().eq('id', dbEv.id);
            } else {
              eventsByGoogleId.set(dbEv.google_event_id, dbEv);
            }
          } else if (dbEv.title && dbEv.date) {
            const key = `${dbEv.title.trim().toLowerCase()}_${new Date(dbEv.date).toISOString()}`;
            if (!eventsByTitleDate.has(key)) {
              eventsByTitleDate.set(key, dbEv);
            }
          }
        }
      }

      let insertedCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;

      for (const gEvent of googleEvents) {
        if (!gEvent.id) continue;

        const existingByGId = eventsByGoogleId.get(gEvent.id);

        // Se o evento foi cancelado no Google
        if (gEvent.status === 'cancelled') {
          if (existingByGId) {
            await supabase.from('agenda_events').delete().eq('id', existingByGId.id);
            eventsByGoogleId.delete(gEvent.id);
            deletedCount++;
          }
          continue;
        }

        const eventDateStr = gEvent.start?.dateTime || gEvent.start?.date;
        if (!eventDateStr) continue;

        const eventTitle = gEvent.summary || '(Sem título)';
        const eventDesc = gEvent.description || '';
        const inferredType = inferCategoryFromEvent(eventTitle, eventDesc);
        const eventDate = new Date(eventDateStr).toISOString();
        const titleDateKey = `${eventTitle.trim().toLowerCase()}_${eventDate}`;

        // Localiza por google_event_id ou por título+data caso tenha sido criado manualmente no sistema antes
        const existing = existingByGId || eventsByTitleDate.get(titleDateKey);

        if (existing) {
          const hasChanges =
            existing.title !== eventTitle ||
            new Date(existing.date).toISOString() !== eventDate ||
            (existing.description || '') !== eventDesc ||
            existing.google_event_id !== gEvent.id;

          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('agenda_events')
              .update({
                title: eventTitle,
                date: eventDate,
                description: eventDesc,
                type: existing.type || inferredType,
                google_event_id: gEvent.id,
                google_account: targetAccount,
              })
              .eq('id', existing.id);

            if (updateError) {
              console.error('Erro ao atualizar evento na tabela agenda_events:', updateError);
            } else {
              updatedCount++;
            }
          }
          eventsByGoogleId.set(gEvent.id, { ...existing, google_event_id: gEvent.id });
        } else {
          // Insere novo compromisso vindo do Google Agenda
          const { data: inserted, error: insertError } = await supabase
            .from('agenda_events')
            .insert([
              {
                title: eventTitle,
                date: eventDate,
                description: eventDesc,
                type: inferredType,
                visibility: 'public',
                status: 'scheduled',
                google_event_id: gEvent.id,
                google_account: targetAccount,
              },
            ])
            .select('id, title, date, description, type, google_event_id')
            .single();

          if (insertError) {
            console.error('Erro ao inserir evento na tabela agenda_events:', insertError);
          } else if (inserted) {
            eventsByGoogleId.set(gEvent.id, inserted);
            eventsByTitleDate.set(titleDateKey, inserted);
            insertedCount++;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        account: targetAccount,
        totalFetched: googleEvents.length,
        inserted: insertedCount,
        updated: updatedCount,
        deleted: deletedCount,
      });
    }

    // ==========================================
    // FLUXO DE IDA (PUSH: PraticSystem -> Google)
    // ==========================================
    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório para ações de push' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('agenda_events')
      .select('id, title, date, description, type, google_event_id, google_account, visibility')
      .eq('id', eventId)
      .maybeSingle();

    if (action === 'delete') {
      if (existing?.google_event_id && existing?.google_account) {
        if (isAccountConfigured(existing.google_account as GoogleAccount)) {
          await deleteEvent(existing.google_account as GoogleAccount, existing.google_event_id);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const resolvedType = type || existing?.type || 'meeting';
    let targetAccount = CATEGORY_GOOGLE_ACCOUNT[resolvedType] || 'agenciapratic';
    if (!isAccountConfigured(targetAccount) && isAccountConfigured('agenciapratic')) {
      targetAccount = 'agenciapratic';
    }

    if (!isAccountConfigured(targetAccount)) {
      return NextResponse.json(
        {
          error: `Credenciais do Google não configuradas para a conta "${targetAccount}"`,
          accountNotConfigured: true,
        },
        { status: 400 }
      );
    }

    const eventInput = {
      title: title || existing?.title || '(Sem título)',
      date: date || existing?.date || new Date().toISOString(),
      description: description !== undefined ? description : (existing?.description || ''),
    };

    // Se a categoria mudou para um grupo pertencente a outra conta, remove da anterior
    if (existing?.google_event_id && existing?.google_account && existing.google_account !== targetAccount) {
      if (isAccountConfigured(existing.google_account as GoogleAccount)) {
        await deleteEvent(existing.google_account as GoogleAccount, existing.google_event_id);
      }
    }

    let googleEventId = existing?.google_account === targetAccount ? existing.google_event_id : null;

    if (googleEventId) {
      try {
        await updateEvent(targetAccount, googleEventId, eventInput);
      } catch (patchErr: unknown) {
        const errorMsg = patchErr instanceof Error ? patchErr.message : String(patchErr);
        // Se o evento foi removido ou não existe mais no Google, recria
        if (errorMsg.includes('404') || errorMsg.includes('410') || errorMsg.includes('Not Found')) {
          googleEventId = await insertEvent(targetAccount, eventInput);
          await supabase
            .from('agenda_events')
            .update({ google_event_id: googleEventId, google_account: targetAccount })
            .eq('id', eventId);
        } else {
          throw patchErr;
        }
      }
    } else {
      googleEventId = await insertEvent(targetAccount, eventInput);
      await supabase
        .from('agenda_events')
        .update({ google_event_id: googleEventId, google_account: targetAccount })
        .eq('id', eventId);
    }

    return NextResponse.json({ ok: true, googleEventId, googleAccount: targetAccount });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno';
    console.error('google-sync error:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
