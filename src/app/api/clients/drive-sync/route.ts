import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { requireTeamUser } from '@/lib/apiAuth';
import { getClientsRootFolderId, listChildFolders } from '@/lib/googleDrive';
import { folderUrl, matchClientsToFolders } from '@/lib/driveFolders';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Sugere a pasta de cada cliente dentro de "01 PRATIC". Não grava nada.
export async function GET(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  try {
    const [folders, clientsRes] = await Promise.all([
      listChildFolders(getClientsRootFolderId()),
      getSupabaseAdmin().from('clients').select('id, name, nome_fantasia, status, google_drive_url').order('name'),
    ]);
    if (clientsRes.error) throw new Error(clientsRes.error.message);

    const clients = clientsRes.data ?? [];
    const matches = matchClientsToFolders(clients, folders);
    const rows = clients.map((c, i) => ({
      clientId: c.id,
      name: c.nome_fantasia || c.name,
      status: c.status,
      currentUrl: c.google_drive_url ?? null,
      folderId: matches[i].folderId,
      folderName: matches[i].folderName,
      newUrl: matches[i].folderId ? folderUrl(matches[i].folderId!) : null,
      confidence: matches[i].confidence,
    }));

    return NextResponse.json({ folders, rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao ler o Drive.' }, { status: 500 });
  }
}

// Aplica os pares confirmados: { updates: [{ clientId, folderId }] }.
export async function POST(request: Request) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const updates: { clientId: string; folderId: string }[] = Array.isArray(body?.updates)
    ? body.updates.filter((u: { clientId?: unknown; folderId?: unknown }) => typeof u?.clientId === 'string' && typeof u?.folderId === 'string')
    : [];
  if (updates.length === 0) return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from('clients').update({ google_drive_url: folderUrl(u.folderId) }).eq('id', u.clientId)
    )
  );
  const failed = results.filter((r) => r.error).length;
  return NextResponse.json({ updated: updates.length - failed, failed });
}
