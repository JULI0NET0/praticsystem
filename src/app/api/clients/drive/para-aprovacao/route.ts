import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { requireTeamUser } from '@/lib/apiAuth';
import { createFolder, listChildFolders } from '@/lib/googleDrive';
import { APPROVAL_FOLDER_NAME, hasApprovalFolder, parseDriveFolderId } from '@/lib/driveFolders';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Action = 'criar' | 'criada' | 'ja_existe' | 'sem_pasta' | 'erro';

interface Row {
  clientId: string;
  name: string;
  status: string | null;
  action: Action;
  detail?: string;
  url?: string;
}

const BATCH = 5;

async function inspect(
  client: { id: string; name: string; nome_fantasia: string | null; status: string | null; google_drive_url: string | null },
  apply: boolean
): Promise<Row> {
  const base = { clientId: client.id, name: client.nome_fantasia || client.name, status: client.status };
  try {
    const clientFolderId = parseDriveFolderId(client.google_drive_url);
    if (!clientFolderId) return { ...base, action: 'sem_pasta' };

    if (hasApprovalFolder(await listChildFolders(clientFolderId))) return { ...base, action: 'ja_existe' };
    if (!apply) return { ...base, action: 'criar' };

    const created = await createFolder(APPROVAL_FOLDER_NAME, clientFolderId);
    return { ...base, action: 'criada', url: created.url };
  } catch (err: unknown) {
    return { ...base, action: 'erro', detail: err instanceof Error ? err.message : 'Erro no Drive.' };
  }
}

async function run(request: Request, apply: boolean) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await getSupabaseAdmin()
    .from('clients')
    .select('id, name, nome_fantasia, status, google_drive_url')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = data ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < clients.length; i += BATCH) {
    rows.push(...(await Promise.all(clients.slice(i, i + BATCH).map((c) => inspect(c, apply)))));
  }
  return NextResponse.json({ folderName: APPROVAL_FOLDER_NAME, rows });
}

// Simulação: mostra o que seria criado, sem criar nada.
export async function GET(request: Request) {
  return run(request, false);
}

// Cria "PARA APROVAÇÃO" dentro da pasta de cada cliente (já fica dentro de "01 PRATIC") que ainda não tem.
export async function POST(request: Request) {
  return run(request, true);
}
