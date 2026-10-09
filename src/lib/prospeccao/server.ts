import type { SupabaseClient } from '@supabase/supabase-js';
import { getProvider } from '@/lib/whatsapp/provider';
import type { MediaKind } from './webhook';

export const MEDIA_BUCKET = 'prospeccao-media';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/aac': 'aac',
  'video/mp4': 'mp4', 'application/pdf': 'pdf',
};

export function extensionFor(mimetype: string | null | undefined, fallbackName?: string | null): string {
  const clean = (mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (EXT_BY_MIME[clean]) return EXT_BY_MIME[clean];
  const fromName = fallbackName?.split('.').pop();
  return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'bin';
}

/** Baixa o arquivo (URL temporária da UAZAPI) e guarda no bucket para o histórico não expirar. */
export async function copyToBucket(
  supabase: SupabaseClient,
  sourceUrl: string,
  leadId: string,
  mimetype: string | null,
  fileName?: string | null
): Promise<{ url: string; mimetype: string } | null> {
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const type = (mimetype || res.headers.get('content-type') || 'application/octet-stream').split(';')[0];
    const path = `${leadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(type, fileName)}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, await res.arrayBuffer(), { contentType: type });
    if (error) return null;
    return { url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl, mimetype: type };
  } catch (err) {
    console.error('[prospeccao] copyToBucket:', err);
    return null;
  }
}

/** Legenda amigável para a lista de conversas quando a mensagem é só mídia. */
export function previewFor(kind: MediaKind, body: string): string {
  if (body) return body;
  return { text: '', image: '📷 Foto', audio: '🎤 Áudio', video: '🎬 Vídeo', document: '📄 Documento', sticker: 'Figurinha' }[kind];
}

/**
 * Busca nome, foto e dados do contato no WhatsApp e grava no lead.
 * A foto é copiada para o bucket (a URL do WhatsApp expira). Retorna o que foi gravado.
 */
export async function enrichLeadFromWhatsApp(supabase: SupabaseClient, leadId: string, phone: string, currentName: string) {
  const info = await getProvider().getContact(phone);
  if (!info) return null;
  const best = info.name || info.waName;

  let avatar: string | null = null;
  if (info.avatarUrl) avatar = (await copyToBucket(supabase, info.avatarUrl, `${leadId}/avatar`, 'image/jpeg', 'avatar.jpg'))?.url ?? info.avatarUrl;

  const patch: Record<string, unknown> = {
    wa_name: info.waName,
    wa_contact_name: info.contactName,
    wa_business_name: info.businessName,
    wa_about: info.about,
    wa_avatar_url: avatar,
    wa_is_business: info.isBusiness,
    wa_synced_at: new Date().toISOString(),
  };
  if (best && (currentName === phone || !currentName)) patch.nome = best;
  if (info.isBusiness && info.businessName) patch.empresa = info.businessName;
  const { data } = await supabase.from('leads').update(patch).eq('id', leadId).select().single();
  return data;
}
