import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, clientData } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Tenta criar o usuário no Auth; se já existir, reutiliza o existente
    let userId: string;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes('already been registered') || msg.includes('already registered') || msg.includes('already exists')) {
        // Busca o usuário existente pelo e-mail
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find(u => u.email === email);
        if (!existing) {
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
        userId = existing.id;
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      userId = createData.user.id;
    }

    // Salva na tabela clients usando service role (bypassa o RLS)
    if (clientData) {
      const { error: insertError } = await supabaseAdmin.from('clients').upsert({
        ...clientData,
        id: userId,
        portal_email: email,
        status: 'prospect',
        onboarding_date: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (insertError) {
        return NextResponse.json({ error: `Erro ao salvar dados do cliente: ${insertError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ user: { id: userId, email } }, { status: 200 });

  } catch (error: any) {
    console.error("Erro interno no servidor:", error.message);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
