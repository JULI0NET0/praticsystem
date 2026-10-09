import type { ContactInfo, DownloadedMedia, OutboundMedia, ScheduleItem, ScheduleOptions, ScheduleResult, SendResult, WhatsAppProvider } from './provider';
import { phoneKey } from '@/lib/prospeccao/leads';

export function uazapiConfig() {
  const baseUrl = (process.env.UAZAPI_BASE_URL || '').replace(/\/+$/, '');
  const token = process.env.UAZAPI_TOKEN || '';
  return { baseUrl, token, ready: Boolean(baseUrl && token) };
}

type Json = Record<string, unknown>;

async function uazapiFetch(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<Json> {
  const { baseUrl, token, ready } = uazapiConfig();
  if (!ready) throw new Error('UAZAPI_BASE_URL e UAZAPI_TOKEN não configurados.');
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', token },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error(String(json.error || json.message || `UAZAPI respondeu ${res.status}`));
  return json;
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

function messageId(json: Json): string | undefined {
  const nested = json.response as Json | undefined;
  const id = json.messageid ?? json.id ?? nested?.messageid ?? nested?.id;
  return id ? String(id) : undefined;
}

export const uazapiProvider: WhatsAppProvider = {
  name: 'uazapi',

  async send(phone, body): Promise<SendResult> {
    try {
      const json = await uazapiFetch('/send/text', { number: phone, text: body });
      return { status: 'sent', externalId: messageId(json) };
    } catch (err) {
      console.error('[uazapi] falha no envio:', err);
      return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
    }
  },

  async sendMedia(phone, media: OutboundMedia): Promise<SendResult> {
    try {
      const json = await uazapiFetch('/send/media', {
        number: phone,
        type: media.type,
        file: media.file,
        ...(media.caption ? { text: media.caption } : {}),
        ...(media.docName ? { docName: media.docName } : {}),
      });
      return { status: 'sent', externalId: messageId(json) };
    } catch (err) {
      console.error('[uazapi] falha no envio de mídia:', err);
      return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
    }
  },

  async getContact(phone): Promise<ContactInfo | null> {
    try {
      const json = await uazapiFetch('/chat/details', { number: phone, preview: false });
      return {
        name: str(json.wa_contactName) ?? str(json.name),
        contactName: str(json.wa_contactName),
        about: str(json.about) ?? str(json.wa_about) ?? str(json.status),
        waName: str(json.wa_name),
        avatarUrl: str(json.image) ?? str(json.imagePreview),
        isBusiness: Boolean(json.is_business),
        businessName: str(json.business_name),
      };
    } catch (err) {
      console.error('[uazapi] falha em /chat/details:', err);
      return null;
    }
  },

  async schedule(items: ScheduleItem[], runAt: Date, opts: ScheduleOptions = {}): Promise<ScheduleResult | null> {
    try {
      const messages = items.map((i) =>
        i.media
          ? { number: i.phone, type: i.media.type, file: i.media.file, ...(i.text ? { text: i.text } : {}), ...(i.media.docName ? { docName: i.media.docName } : {}) }
          : { number: i.phone, type: 'text', text: i.text ?? '' }
      );
      const created = await uazapiFetch('/sender/advanced', {
        delayMin: opts.delayMin ?? 3,
        delayMax: opts.delayMax ?? 6,
        info: opts.info ?? 'Pratic',
        scheduled_for: runAt.getTime(),
        messages,
      });
      const folderId = str(created.folder_id);
      if (!folderId) return null;
      // A UAZAPI já atribui o messageid de cada envio: guardamos para casar com o webhook depois.
      const listed = await uazapiFetch('/sender/listmessages', { folder_id: folderId, limit: 500 }).catch(() => ({}) as Json);
      const rows = (Array.isArray(listed.messages) ? listed.messages : []) as Json[];
      const messageIds: Record<string, string> = {};
      for (const item of items) {
        const key = phoneKey(item.phone);
        const row = rows.find((r) => phoneKey(String(r.chatid ?? '').split('@')[0]) === key);
        const id = str(row?.messageid);
        if (id) messageIds[item.phone] = id;
      }
      return { folderId, messageIds };
    } catch (err) {
      console.error('[uazapi] falha ao agendar:', err);
      return null;
    }
  },

  async cancelSchedule(folderId: string): Promise<boolean> {
    try {
      await uazapiFetch('/sender/edit', { folder_id: folderId, action: 'delete' });
      return true;
    } catch (err) {
      console.error('[uazapi] falha ao cancelar agendamento:', err);
      return false;
    }
  },

  async downloadMedia(id): Promise<DownloadedMedia | null> {
    try {
      const json = await uazapiFetch('/message/download', { id, return_base64: false });
      const url = str(json.fileURL);
      return url ? { url, mimetype: str(json.mimetype) } : null;
    } catch (err) {
      console.error('[uazapi] falha em /message/download:', err);
      return null;
    }
  },
};

/** Registra a URL do nosso webhook (mensagens + recibos; sem grupos). Inclui as enviadas pela API: os envios agendados chegam por aqui. */
export function configureUazapiWebhook(url: string) {
  return uazapiFetch('/webhook', {
    enabled: true,
    url,
    events: ['messages', 'messages_update'],
    excludeMessages: ['isGroupYes'],
  });
}

export function getUazapiWebhook() {
  return uazapiFetch('/webhook', undefined, 'GET');
}

export async function getUazapiStatus() {
  const json = await uazapiFetch('/instance/status', undefined, 'GET');
  const inst = (json.instance ?? {}) as Json;
  return {
    status: str(inst.status) ?? 'unknown',
    name: str(inst.name),
    profileName: str(inst.profileName),
    profilePicUrl: str(inst.profilePicUrl),
    owner: str(inst.owner),
  };
}
