import { getValidAccessToken, type GoogleAccount } from '@/lib/googleCalendar';
import { folderUrl, type DriveFolderRef } from '@/lib/driveFolders';

// Integração com o Google Drive via a mesma conta OAuth da Agenda
// (escopo `drive` adicionado em getGoogleAuthUrl). Server-only.

const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export const DRIVE_ACCOUNT: GoogleAccount = 'agenciapratic';

export function getClientsRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_CLIENTS_ROOT_ID;
  if (!id) throw new Error('GOOGLE_DRIVE_CLIENTS_ROOT_ID não configurado.');
  return id;
}

async function driveFetch(path: string, options: RequestInit = {}) {
  const accessToken = await getValidAccessToken(DRIVE_ACCOUNT);
  const res = await fetch(`${GOOGLE_DRIVE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 && body.includes('insufficient')) {
      throw new Error('A conta Google da agência ainda não autorizou o Drive. Reconecte a conta agenciapratic nas configurações da Agenda.');
    }
    throw new Error(`Google Drive API error ${res.status}: ${body}`);
  }

  return res.status === 204 ? null : res.json();
}

export async function listChildFolders(parentId: string): Promise<DriveFolderRef[]> {
  const folders: DriveFolderRef[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: '1000',
      orderBy: 'name',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const data = await driveFetch(`/files?${params.toString()}`);
    for (const f of data.files as { id: string; name: string }[]) {
      folders.push({ id: f.id, name: f.name, url: folderUrl(f.id) });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return folders;
}

export async function createFolder(name: string, parentId: string): Promise<DriveFolderRef> {
  const data = await driveFetch('/files?supportsAllDrives=true&fields=id,name', {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  return { id: data.id, name: data.name, url: folderUrl(data.id) };
}

const GOOGLE_DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const GDOC_MIME = 'application/vnd.google-apps.document';
// Pasta "Propostas" no Drive da agência (GOOGLE_DRIVE_PROPOSALS_FOLDER_ID sobrescreve).
const PROPOSALS_FOLDER_ID = '1xfW5VrZLjFFewfhhEBDjolYcjIRBuNjB';

export function getProposalsFolderId(): string {
  return process.env.GOOGLE_DRIVE_PROPOSALS_FOLDER_ID || PROPOSALS_FOLDER_ID;
}

// Envia um .docx ao Drive convertendo para Google Doc.
export async function uploadDocxAsGoogleDoc(
  name: string,
  docx: Buffer,
  parentId: string
): Promise<{ id: string; url: string }> {
  const accessToken = await getValidAccessToken(DRIVE_ACCOUNT);
  const boundary = `pratic-${Date.now().toString(36)}`;
  const meta = JSON.stringify({ name, mimeType: GDOC_MIME, parents: [parentId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: ${DOCX_MIME}\r\n\r\n`
    ),
    docx,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  if (!res.ok) throw new Error(`Google Drive upload error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { id: data.id, url: data.webViewLink };
}
