import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getUazapiStatus, getUazapiWebhook, uazapiConfig } from '@/lib/whatsapp/uazapi';

// Dados da conta WhatsApp conectada + se o webhook de recebimento está registrado.
export async function GET(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;
  if (process.env.WA_PROVIDER !== 'uazapi' || !uazapiConfig().ready) {
    return NextResponse.json({ provider: process.env.WA_PROVIDER || 'mock', connected: false, configured: false });
  }
  try {
    const [status, hooks] = await Promise.all([getUazapiStatus(), getUazapiWebhook().catch(() => null)]);
    const list = Array.isArray(hooks) ? hooks : hooks ? [hooks] : [];
    return NextResponse.json({
      provider: 'uazapi',
      configured: true,
      connected: status.status === 'connected',
      status: status.status,
      profileName: status.profileName,
      number: status.owner,
      avatar: status.profilePicUrl,
      webhookRegistered: list.length > 0,
    });
  } catch (err) {
    return NextResponse.json({ provider: 'uazapi', configured: true, connected: false, error: err instanceof Error ? err.message : 'Falha ao consultar.' });
  }
}
