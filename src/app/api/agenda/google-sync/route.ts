import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATEGORY_GOOGLE_ACCOUNT, GoogleAccount, insertEvent, updateEvent, deleteEvent } from '@/lib/googleCalendar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { eventId, action, title, type, date, description } = await req.json();

    if (!eventId || !action) {
      return NextResponse.json({ error: 'eventId e action são obrigatórios' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('agenda_events')
      .select('google_event_id, google_account')
      .eq('id', eventId)
      .maybeSingle();

    if (action === 'delete') {
      if (existing?.google_event_id && existing?.google_account) {
        await deleteEvent(existing.google_account as GoogleAccount, existing.google_event_id);
      }
      return NextResponse.json({ ok: true });
    }

    const targetAccount = CATEGORY_GOOGLE_ACCOUNT[type];
    if (!targetAccount) {
      return NextResponse.json({ error: `Categoria "${type}" sem conta do Google configurada` }, { status: 400 });
    }

    const eventInput = { title, date, description };

    // Se a categoria mudou para um grupo que pertence a outra conta, o evento precisa sair
    // da conta antiga e ser recriado na nova — não dá para só "mover" via update.
    if (existing?.google_event_id && existing?.google_account && existing.google_account !== targetAccount) {
      await deleteEvent(existing.google_account as GoogleAccount, existing.google_event_id);
    }

    let googleEventId = existing?.google_account === targetAccount ? existing.google_event_id : null;

    if (googleEventId) {
      await updateEvent(targetAccount, googleEventId, eventInput);
    } else {
      googleEventId = await insertEvent(targetAccount, eventInput);
      await supabase
        .from('agenda_events')
        .update({ google_event_id: googleEventId, google_account: targetAccount })
        .eq('id', eventId);
    }

    return NextResponse.json({ ok: true, googleEventId, googleAccount: targetAccount });
  } catch (err: any) {
    console.error('google-sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
