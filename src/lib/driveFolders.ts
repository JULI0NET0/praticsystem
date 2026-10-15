// Regras puras das pastas de captação no Google Drive (sem chamadas de API),
// usadas tanto pelas rotas quanto pelos modais. A integração em si fica em
// src/lib/googleDrive.ts (server-only).

/** Subpasta do modelo, com subpastas opcionais dentro (ex.: METADADOS da câmera). */
export interface SubfolderTemplate {
  name: string;
  children?: string[];
}

export const DEFAULT_CAPTURE_SUBFOLDERS: SubfolderTemplate[] = [
  { name: '1-FOTOS CAMERA' },
  { name: '2-VIDEOS CAMERA', children: ['METADADOS'] },
  { name: '3-FOTOS CELULAR' },
  { name: '4-VIDEOS CELULAR' },
  { name: '5-FOTOS CELULAR' },
  { name: '6-BACKSTAGE PRATIC' },
];

export interface DriveFolderRef {
  id: string;
  name: string;
  url: string;
}

/** Subpasta criada no Drive, com as pastas de dentro (se houver). */
export interface CreatedSubfolder extends DriveFolderRef {
  children?: DriveFolderRef[];
}

/** Registro de `client_capture_folders`. */
export interface CaptureFolderRecord {
  id: string;
  client_id: string;
  name: string;
  capture_date: string | null;
  folder_id: string;
  folder_url: string;
  subfolders: CreatedSubfolder[];
  created_at: string;
}

export function folderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** Extrai o ID de links como /drive/u/0/folders/<id>?usp=… ou open?id=<id>. */
export function parseDriveFolderId(url: string | null | undefined): string | null {
  if (!url) return null;
  const byPath = url.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (byPath) return byPath[1];
  const byQuery = url.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  return byQuery ? byQuery[1] : null;
}

/** `2026-09-25` → `CAP. 25-09-26` (a pasta já fica dentro da pasta do cliente). */
export function formatCaptureFolderName(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  const date = y && m && d ? `${d}-${m}-${y.slice(-2)}` : isoDate;
  return `CAP. ${date}`;
}

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ClientFolderMatch {
  clientId: string;
  folderId: string | null;
  folderName: string | null;
  confidence: 'exact' | 'partial' | null;
}

/**
 * Sugere a pasta de cada cliente dentro de "01 PRATIC" pelo nome. Exato quando
 * o nome normalizado bate com `name` ou `nome_fantasia`; parcial quando um
 * contém o outro (ex.: "Thamires - Psicóloga" ↔ "Thamires").
 */
export function matchClientsToFolders(
  clients: { id: string; name: string; nome_fantasia?: string | null }[],
  folders: { id: string; name: string }[]
): ClientFolderMatch[] {
  const normFolders = folders.map((f) => ({ ...f, norm: normalizeName(f.name) }));

  return clients.map((client) => {
    const names = [client.name, client.nome_fantasia]
      .filter((n): n is string => !!n)
      .map(normalizeName)
      .filter((n) => n.length > 0);

    const exact = normFolders.find((f) => names.includes(f.norm));
    if (exact) return { clientId: client.id, folderId: exact.id, folderName: exact.name, confidence: 'exact' };

    const partial = normFolders.find((f) =>
      f.norm.length >= 4 &&
      names.some((n) => n.length >= 4 && (f.norm.includes(n) || n.includes(f.norm)))
    );
    if (partial) return { clientId: client.id, folderId: partial.id, folderName: partial.name, confidence: 'partial' };

    return { clientId: client.id, folderId: null, folderName: null, confidence: null };
  });
}
