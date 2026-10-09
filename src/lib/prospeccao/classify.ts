import { phoneKey } from './leads';
import type { ContactType } from '@/types/database';

export interface ClassifyInput {
  phone: string;
  users: { id: string; phone?: string | null }[];
  clients: { id: string; phone?: string | null; whatsapp_financeiro?: string | null }[];
}

export interface Classification {
  tipo: ContactType;
  user_id?: string;
  client_id?: string;
}

/**
 * Decide quem é o dono de um número que acabou de falar com a gente.
 * Equipe vence cliente (um sócio pode ser os dois); sem correspondência vai para a Triagem.
 */
export function classifyPhone({ phone, users, clients }: ClassifyInput): Classification {
  const key = phoneKey(phone);
  if (!key) return { tipo: 'triagem' };

  const user = users.find((u) => phoneKey(u.phone) === key);
  if (user) return { tipo: 'equipe', user_id: user.id };

  const client = clients.find((c) => phoneKey(c.phone) === key || phoneKey(c.whatsapp_financeiro) === key);
  if (client) return { tipo: 'cliente', client_id: client.id };

  return { tipo: 'triagem' };
}

/** Tipos que não geram contador de não lidas nem notificação. */
export const SILENT_TYPES: ContactType[] = ['equipe', 'ignorado'];

export const TYPE_LABEL: Record<ContactType, string> = {
  lead: 'Lead',
  cliente: 'Cliente',
  equipe: 'Equipe',
  fornecedor: 'Fornecedor',
  pessoal: 'Pessoal',
  triagem: 'Triagem',
  ignorado: 'Ignorado',
};

/** Contatos que contam como "precisa de atenção" no menu. */
export function countsForBadge(tipo: ContactType): boolean {
  return tipo === 'lead' || tipo === 'triagem';
}
