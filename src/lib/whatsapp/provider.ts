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
  waName: string | null;
  avatarUrl: string | null;
  isBusiness: boolean;
  businessName: string | null;
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
};

export function getProvider(): WhatsAppProvider {
  switch (process.env.WA_PROVIDER) {
    case 'uazapi':
      return uazapiProvider;
    default:
      return mockProvider;
  }
}
