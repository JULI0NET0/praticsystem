import { NextResponse } from 'next/server';
import { requireTeamUser } from '@/lib/apiAuth';
import { validateCnpj } from '@/lib/prospeccao/leads';

// Consulta de CNPJ na BrasilAPI. Só para usuários logados.
export async function GET(request: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  const auth = await requireTeamUser(request);
  if (auth.error) return auth.error;

  const cnpj = (await params).cnpj.replace(/\D/g, '');
  if (!validateCnpj(cnpj)) return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 });

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(15_000), next: { revalidate: 86_400 } }).catch(() => null);
  if (!res) return NextResponse.json({ error: 'Consulta indisponível. Tente novamente.' }, { status: 502 });
  if (res.status === 404) return NextResponse.json({ error: 'CNPJ não encontrado.' }, { status: 404 });
  if (!res.ok) return NextResponse.json({ error: 'Consulta indisponível. Tente novamente.' }, { status: 502 });

  const d = (await res.json()) as Record<string, string | null>;
  return NextResponse.json({
    cnpj,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia,
    cidade: d.municipio,
    uf: d.uf,
    cnae_descricao: d.cnae_fiscal_descricao,
    email: d.email?.toLowerCase() || null,
    telefone: d.ddd_telefone_1,
    situacao: d.descricao_situacao_cadastral,
  });
}
