import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/hermesAuth';
import { requireTeamUser } from '@/lib/apiAuth';
import { createFolder, listChildFolders } from '@/lib/googleDrive';
import { parseDriveFolderId, type DriveFolderRef } from '@/lib/driveFolders';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Lista as captações já criadas para o cliente.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from('client_capture_folders')
    .select('*')
    .eq('client_id', id)
    .order('capture_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// Cria "CAP. [CLIENTE] DD-MM-AA" + subpastas dentro da pasta do cliente e
// guarda os links para abrir direto pela página do cliente.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const folderName = typeof body?.folderName === 'string' ? body.folderName.trim() : '';
  const captureDate = typeof body?.captureDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.captureDate) ? body.captureDate : null;
  const subfolderNames: string[] = Array.isArray(body?.subfolders)
    ? body.subfolders.filter((s: unknown): s is string => typeof s === 'string').map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (!folderName) return NextResponse.json({ error: 'Informe o nome da pasta.' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, google_drive_url')
    .eq('id', id)
    .single();
  if (clientError || !client) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });

  const parentId = parseDriveFolderId(client.google_drive_url);
  if (!parentId) {
    return NextResponse.json({ error: 'Vincule a pasta do Google Drive deste cliente primeiro.' }, { status: 400 });
  }

  try {
    const existing = (await listChildFolders(parentId)).find(
      (f) => f.name.toLowerCase() === folderName.toLowerCase()
    );
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma pasta com esse nome.', url: existing.url }, { status: 409 });
    }

    const parent = await createFolder(folderName, parentId);
    const subfolders: DriveFolderRef[] = [];
    for (const name of subfolderNames) {
      subfolders.push(await createFolder(name, parent.id));
    }

    const { data: record, error: insertError } = await supabase
      .from('client_capture_folders')
      .insert({
        client_id: id,
        name: parent.name,
        capture_date: captureDate,
        folder_id: parent.id,
        folder_url: parent.url,
        subfolders,
        created_by: auth.user.id,
      })
      .select('*')
      .single();

    // As pastas já existem no Drive; se só o registro falhar, devolve o link mesmo assim.
    if (insertError) {
      return NextResponse.json({ url: parent.url, subfolders, warning: 'Pasta criada, mas não foi possível salvar o registro.' }, { status: 201 });
    }

    return NextResponse.json({ url: parent.url, record }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao criar pastas.' }, { status: 500 });
  }
}
