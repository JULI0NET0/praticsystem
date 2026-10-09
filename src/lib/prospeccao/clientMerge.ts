import { maskCnpj, maskPhone, normalizePhone, parseInstagram, parseSegments, phoneKey } from './leads';
import type { Client, Lead, LeadActivity } from '@/types/database';

export type MergeKey = 'contato' | 'empresa' | 'razao' | 'cnpj' | 'email' | 'telefone' | 'instagram' | 'setor' | 'servico' | 'cidade' | 'uf';
export type MergeState = 'same' | 'fill_client' | 'fill_lead' | 'conflict';
/** lead: o valor do lead vale para os dois; client: o do cliente vale para os dois; skip: não mexe. */
export type MergeChoice = 'lead' | 'client' | 'skip';

export interface MergeField {
  key: MergeKey;
  label: string;
  leadValue: string;
  clientValue: string;
  state: MergeState;
}

const LABEL: Record<MergeKey, string> = {
  contato: 'Nome do contato',
  empresa: 'Empresa / nome fantasia',
  razao: 'Razão social',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'WhatsApp',
  instagram: 'Instagram',
  setor: 'Segmento',
  servico: 'Serviço de interesse',
  cidade: 'Cidade',
  uf: 'UF',
};

const ORDER: MergeKey[] = ['contato', 'empresa', 'razao', 'cnpj', 'email', 'telefone', 'instagram', 'setor', 'servico', 'cidade', 'uf'];

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function leadValue(lead: Lead, key: MergeKey): string {
  switch (key) {
    case 'contato': return s(lead.nome);
    case 'empresa': return s(lead.empresa) || s(lead.wa_business_name);
    case 'razao': return s(lead.razao_social);
    case 'cnpj': return s(lead.cnpj).replace(/\D/g, '');
    case 'email': return s(lead.email);
    case 'telefone': return s(lead.telefone);
    case 'instagram': return s(lead.instagram);
    case 'setor': return (lead.segmentos ?? []).join(', ');
    case 'servico': return s(lead.servico_interesse);
    case 'cidade': return s(lead.cidade);
    case 'uf': return s(lead.uf);
  }
}

function clientValue(client: Client, key: MergeKey): string {
  switch (key) {
    case 'contato': return s(client.contact_name);
    case 'empresa': return s(client.nome_fantasia);
    case 'razao': return s(client.name);
    case 'cnpj': return s(client.cnpj).replace(/\D/g, '');
    case 'email': return s(client.email);
    case 'telefone': return s(client.phone);
    case 'instagram': return s(client.social_access?.instagram?.usuario);
    case 'setor': return s(client.setor);
    case 'servico': return s(client.servico_interesse);
    case 'cidade': return s(client.address?.cidade);
    case 'uf': return s(client.address?.uf);
  }
}

/** Compara ignorando formato: telefone pelo 9º dígito, CNPJ por dígitos, resto sem caixa/espaços. */
function sameValue(key: MergeKey, a: string, b: string): boolean {
  if (key === 'telefone') return phoneKey(a) === phoneKey(b);
  if (key === 'instagram') return (parseInstagram(a) ?? a).toLowerCase() === (parseInstagram(b) ?? b).toLowerCase();
  if (key === 'setor') return JSON.stringify(parseSegments(a).sort()) === JSON.stringify(parseSegments(b).sort());
  return a.toLowerCase() === b.toLowerCase();
}

/** Campos que existem nos dois lados e o que cada lado tem; só retorna os que têm algum valor. */
export function buildMerge(lead: Lead, client: Client): MergeField[] {
  const fields: MergeField[] = [];
  for (const key of ORDER) {
    const l = leadValue(lead, key);
    const c = clientValue(client, key);
    if (!l && !c) continue;
    const state: MergeState = !l ? 'fill_lead' : !c ? 'fill_client' : sameValue(key, l, c) ? 'same' : 'conflict';
    fields.push({ key, label: LABEL[key], leadValue: l, clientValue: c, state });
  }
  return fields;
}

/** Padrão: vazios são preenchidos; nos conflitos, vale o cadastro do cliente. */
export function defaultChoices(fields: MergeField[]): Record<string, MergeChoice> {
  const out: Record<string, MergeChoice> = {};
  for (const f of fields) out[f.key] = f.state === 'fill_client' ? 'lead' : f.state === 'fill_lead' || f.state === 'conflict' ? 'client' : 'skip';
  return out;
}

export interface MergePatches {
  clientPatch: Partial<Client>;
  leadPatch: Partial<Lead>;
  /** quantos campos foram efetivamente alterados (nos dois cadastros somados por campo) */
  changed: number;
}

/** Converte as escolhas em alterações para `clients` e `leads`; ao final os dois ficam iguais nos campos escolhidos. */
export function applyMerge(client: Client, fields: MergeField[], choices: Record<string, MergeChoice>): MergePatches {
  const clientPatch: Partial<Client> = {};
  const leadPatch: Partial<Lead> = {};
  let address = { ...(client.address ?? { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' }) };
  let addressTouched = false;
  let social = client.social_access;
  let changed = 0;

  for (const f of fields) {
    const choice = choices[f.key] ?? 'skip';
    if (choice === 'skip' || f.state === 'same') continue;
    const value = choice === 'lead' ? f.leadValue : f.clientValue;
    if (!value) continue;
    changed++;
    const toClient = choice === 'lead';
    switch (f.key) {
      case 'contato': toClient ? (clientPatch.contact_name = value) : (leadPatch.nome = value); break;
      case 'empresa': toClient ? (clientPatch.nome_fantasia = value) : (leadPatch.empresa = value); break;
      case 'razao': toClient ? (clientPatch.name = value) : (leadPatch.razao_social = value); break;
      case 'cnpj': toClient ? (clientPatch.cnpj = value.length === 14 ? maskCnpj(value) : value) : (leadPatch.cnpj = value.replace(/\D/g, '')); break;
      case 'email': toClient ? (clientPatch.email = value) : (leadPatch.email = value); break;
      case 'telefone': {
        if (toClient) {
          const n = normalizePhone(value);
          clientPatch.phone = n ? maskPhone(n) : value;
        } else {
          leadPatch.telefone = normalizePhone(value) ?? value;
        }
        break;
      }
      case 'instagram': {
        const handle = parseInstagram(value) ?? value;
        if (toClient) social = { ...(social ?? {}), instagram: { ...(social?.instagram ?? { usuario: '' }), usuario: handle } };
        else leadPatch.instagram = handle;
        break;
      }
      case 'setor': toClient ? (clientPatch.setor = parseSegments(value).join(', ')) : (leadPatch.segmentos = parseSegments(value)); break;
      case 'servico': toClient ? (clientPatch.servico_interesse = value) : (leadPatch.servico_interesse = value); break;
      case 'cidade': if (toClient) { address = { ...address, cidade: value }; addressTouched = true; } else leadPatch.cidade = value; break;
      case 'uf': if (toClient) { address = { ...address, uf: value.toUpperCase() }; addressTouched = true; } else leadPatch.uf = value.toUpperCase(); break;
    }
  }
  if (addressTouched) clientPatch.address = address;
  if (social !== client.social_access) clientPatch.social_access = social;
  return { clientPatch, leadPatch, changed };
}

/**
 * Observações do atendimento viram notas do cliente. Ids estáveis evitam duplicar numa reimportação.
 */
export function notesToImport(
  lead: Pick<Lead, 'id' | 'notas'>,
  activities: Pick<LeadActivity, 'id' | 'tipo' | 'descricao' | 'created_at'>[],
  existing: Client['notes'],
  author: string
): NonNullable<Client['notes']> {
  const have = new Set((existing ?? []).map((n) => n.id));
  const out: NonNullable<Client['notes']> = [];
  const add = (id: string, content: string, date: string) => {
    if (content.trim() && !have.has(id)) out.push({ id, content: `[Importado do atendimento] ${content.trim()}`, date, author });
  };
  if (lead.notas) add(`lead-note-legacy-${lead.id}`, lead.notas, new Date().toISOString());
  for (const a of activities) if (a.tipo === 'nota') add(`lead-note-${a.id}`, a.descricao, a.created_at);
  return out;
}
