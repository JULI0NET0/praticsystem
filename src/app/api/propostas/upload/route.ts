import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { getProposalsFolderId, uploadDocxAsGoogleDoc } from '@/lib/googleDrive';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

// Recebe um .docx (multipart: `file`, opcional `name`) e cria um Google Doc na pasta "Propostas"
// do Drive da agência. Em `next dev` fica aberto (usado pela skill proposta-pratic);
// fora dele exige usuário logado do time.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const auth = await requireTeamUser(request);
    if (auth.error) return auth.error;
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie o arquivo .docx no campo "file".' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'O arquivo precisa ser .docx.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo acima de 10 MB.' }, { status: 413 });
    }

    const rawName = form.get('name');
    const name = (typeof rawName === 'string' && rawName.trim()) || file.name.replace(/\.docx$/i, '');
    const doc = await uploadDocxAsGoogleDoc(name, Buffer.from(await file.arrayBuffer()), getProposalsFolderId());

    return NextResponse.json(doc);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao enviar ao Drive.' }, { status: 500 });
  }
}
