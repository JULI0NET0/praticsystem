import { normalizePhone } from './leads';

export interface IncomingWhatsAppMessage {
  phone: string;
  name: string | null;
  body: string;
  externalId: string | null;
}

/**
 * Formato genérico aceito pelo webhook (qualquer provedor pode ser mapeado
 * para ele com um proxy leve): { phone, name?, message, id? }.
 * Também entende o formato { data: { key: { remoteJid, id }, pushName, message: { conversation } } }
 * usado pela Evolution API.
 */
export function parseIncomingMessage(payload: unknown): IncomingWhatsAppMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const evo = p.data as
    | { key?: { remoteJid?: string; id?: string; fromMe?: boolean }; pushName?: string; message?: { conversation?: string; extendedTextMessage?: { text?: string } } }
    | undefined;
  if (evo?.key) {
    if (evo.key.fromMe) return null;
    const phone = normalizePhone(evo.key.remoteJid?.split('@')[0]);
    const body = evo.message?.conversation ?? evo.message?.extendedTextMessage?.text;
    if (!phone || !body) return null;
    return { phone, name: evo.pushName ?? null, body, externalId: evo.key.id ?? null };
  }

  const phone = normalizePhone(typeof p.phone === 'string' ? p.phone : null);
  const body = typeof p.message === 'string' ? p.message.trim() : '';
  if (!phone || !body) return null;
  return {
    phone,
    name: typeof p.name === 'string' ? p.name : null,
    body,
    externalId: typeof p.id === 'string' ? p.id : null,
  };
}

export type MediaKind = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';

export type UazapiEvent =
  | {
      kind: 'message';
      phone: string;
      name: string | null;
      body: string;
      fromMe: boolean;
      messageType: MediaKind;
      /** id interno da UAZAPI, usado em /message/download */
      uazId: string | null;
      externalId: string | null;
      mimetype: string | null;
      fileName: string | null;
      seconds: number | null;
      timestamp: number | null;
    }
  | { kind: 'status'; state: string; messageIds: string[]; isFromMe: boolean };

export function mediaKindFromType(messageType: string | undefined): MediaKind {
  const t = (messageType ?? '').toLowerCase();
  if (t.includes('sticker')) return 'sticker';
  if (t.includes('image')) return 'image';
  if (t.includes('audio') || t.includes('ptt')) return 'audio';
  if (t.includes('video') || t.includes('ptv')) return 'video';
  if (t.includes('document')) return 'document';
  return 'text';
}

const STATE_MAP: Record<string, string> = {
  sent: 'sent', delivered: 'delivered', read: 'read', played: 'played',
  failed: 'failed', expired: 'failed', canceled: 'failed',
};

/**
 * Eventos da UAZAPI. `messages` (texto/mídia, dentro de `message`) e
 * `messages_update` (recibos: `state` + `event.MessageIDs`). Grupos são ignorados.
 */
export function parseUazapiEvent(payload: unknown): UazapiEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  if (p.EventType === 'messages_update') {
    const ev = p.event as { MessageIDs?: string[] | null; IsGroup?: boolean; IsFromMe?: boolean } | undefined;
    const state = typeof p.state === 'string' ? STATE_MAP[p.state.toLowerCase()] : undefined;
    if (!ev || ev.IsGroup || !state || !ev.MessageIDs?.length) return null;
    return { kind: 'status', state, messageIds: ev.MessageIDs, isFromMe: Boolean(ev.IsFromMe) };
  }

  if (p.EventType !== 'messages') return null;
  const m = p.message as
    | {
        chatid?: string; text?: string; fromMe?: boolean; isGroup?: boolean; wasSentByApi?: boolean;
        messageid?: string; id?: string; senderName?: string; messageType?: string; messageTimestamp?: number;
        content?: { mimetype?: string; mimeType?: string; fileName?: string; seconds?: number; caption?: string } | string;
      }
    | undefined;
  if (!m || typeof m !== 'object' || m.isGroup || m.wasSentByApi) return null;
  const phone = normalizePhone(m.chatid?.split('@')[0]);
  if (!phone) return null;

  const kind = mediaKindFromType(m.messageType);
  const content = m.content && typeof m.content === 'object' ? m.content : undefined;
  const body = m.text ?? content?.caption ?? '';
  if (kind === 'text' && !body) return null;

  return {
    kind: 'message',
    phone,
    name: m.senderName ?? null,
    body,
    fromMe: Boolean(m.fromMe),
    messageType: kind,
    uazId: m.id ?? null,
    externalId: m.messageid ?? m.id ?? null,
    mimetype: content?.mimetype ?? content?.mimeType ?? null,
    fileName: content?.fileName ?? null,
    seconds: typeof content?.seconds === 'number' ? content.seconds : null,
    timestamp: typeof m.messageTimestamp === 'number' ? m.messageTimestamp : null,
  };
}
