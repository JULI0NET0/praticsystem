import { uazapiProvider } from './uazapi';

export interface SendResult {
  status: 'sent' | 'queued' | 'failed';
  externalId?: string;
  error?: string;
}

export type OutboundMediaType = 'image' | 'video' | 'audio' | 'ptt' | 'document';

export interface OutboundMedia {
  type: OutboundMediaType;
  /** URL pública ou base64 */
  file: string;
  caption?: string;
  docName?: string;
}

export interface ContactInfo {
  name: string | null;
  /** Nome salvo na agenda de quem está conectado */
  contactName: string | null;
  /** Recado/"sobre" do perfil, quando o provedor fornece (a UAZAPI não documenta) */
  about: string | null;
  waName: string | null;
  avatarUrl: string | null;
  isBusiness: boolean;
  businessName: string | null;
}

export interface ScheduleItem {
  phone: string;
  text?: string;
  media?: OutboundMedia;
}

export interface ScheduleOptions {
  delayMin?: number;
  delayMax?: number;
  info?: string;
}

export interface ScheduleResult {
  folderId: string;
  /** messageid de cada envio por telefone (chave: dígitos do número como enviado). */
  messageIds: Record<string, string>;
}

export interface DownloadedMedia {
  url: string;
  mimetype: string | null;
}

/**
 * Camada trocável de envio. "mock" não chama nenhum provedor; "uazapi"
 * usa a instância configurada em UAZAPI_BASE_URL / UAZAPI_TOKEN.
 */
export interface WhatsAppProvider {
  name: string;
  send(phone: string, body: string): Promise<SendResult>;
  sendMedia(phone: string, media: OutboundMedia): Promise<SendResult>;
  getContact(phone: string): Promise<ContactInfo | null>;
  downloadMedia(messageId: string): Promise<DownloadedMedia | null>;
  /** Agenda envios para `runAt`; a execução fica por conta do provedor. */
  schedule(items: ScheduleItem[], runAt: Date, opts?: ScheduleOptions): Promise<ScheduleResult | null>;
  cancelSchedule(folderId: string): Promise<boolean>;
}

const mockProvider: WhatsAppProvider = {
  name: 'mock',
  async send() {
    return { status: 'sent' };
  },
  async sendMedia() {
    return { status: 'sent' };
  },
  async getContact() {
    return null;
  },
  async downloadMedia() {
    return null;
  },
  async schedule(items, _runAt) {
    return { folderId: `mock-${Date.now()}`, messageIds: Object.fromEntries(items.map((i) => [i.phone, `mock-${i.phone}-${Date.now()}`])) };
  },
  async cancelSchedule() {
    return true;
  },
};

export function getProvider(): WhatsAppProvider {
  switch (process.env.WA_PROVIDER) {
    case 'uazapi':
      return uazapiProvider;
    default:
      return mockProvider;
  }
}
