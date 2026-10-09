import { describe, expect, it } from 'vitest';
import { filterLeadsForCampaign, interpolate, maskCnpj, maskPhone, nextMessageStatus, normalizePhone, parseInstagram, parseLeadsCsv, parseSegments, phoneKey, phoneVariants, pipelineStats, validateCnpj } from './leads';
import { parseIncomingMessage, parseUazapiEvent } from './webhook';
import type { Lead } from '@/types/database';

const lead = (over: Partial<Lead>): Lead => ({
  id: '1', nome: 'Ana Souza', origem: 'manual', estagio: 'novo', tags: [], unread_count: 0,
  segmentos: [], created_at: '', updated_at: '', telefone: '5511999998888', ...over,
});

describe('normalizePhone', () => {
  it('adiciona 55 e remove máscara', () => expect(normalizePhone('(11) 99999-8888')).toBe('5511999998888'));
  it('mantém números com 55', () => expect(normalizePhone('+55 11 99999-8888')).toBe('5511999998888'));
  it('rejeita inválidos', () => expect(normalizePhone('123')).toBeNull());
});

describe('interpolate', () => {
  it('usa primeiro nome e empresa', () =>
    expect(interpolate('Oi {{nome}}, da {{empresa}}?', lead({ empresa: 'Loja X' }))).toBe('Oi Ana, da Loja X?'));
});

describe('parseLeadsCsv', () => {
  it('lê ; e dedupe por telefone', () => {
    const csv = 'Nome;Telefone;Empresa\nAna;(11) 99999-8888;X\nAna 2;11999998888;Y\n;11988887777;Z';
    const { rows, skipped } = parseLeadsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].telefone).toBe('5511999998888');
    expect(skipped).toBe(2);
  });
});

describe('filterLeadsForCampaign', () => {
  it('filtra por estágio e exige telefone', () => {
    const leads = [lead({ id: 'a' }), lead({ id: 'b', estagio: 'ganho' }), lead({ id: 'c', telefone: null })];
    expect(filterLeadsForCampaign(leads, { estagios: ['novo'] }).map((l) => l.id)).toEqual(['a']);
  });
});

describe('pipelineStats', () => {
  it('calcula conversão e valor em aberto', () => {
    const s = pipelineStats([
      lead({ estagio: 'ganho' }), lead({ estagio: 'perdido' }), lead({ estagio: 'proposta', valor_estimado: 500 }),
    ]);
    expect(s.conversao).toBe(50);
    expect(s.emAberto).toBe(500);
  });
});

describe('parseIncomingMessage', () => {
  it('formato genérico', () =>
    expect(parseIncomingMessage({ phone: '11999998888', message: 'oi' })?.phone).toBe('5511999998888'));
  it('formato Evolution e ignora fromMe', () => {
    const base = { data: { key: { remoteJid: '5511999998888@s.whatsapp.net', id: 'X', fromMe: false }, pushName: 'Ana', message: { conversation: 'oi' } } };
    expect(parseIncomingMessage(base)?.name).toBe('Ana');
    base.data.key.fromMe = true;
    expect(parseIncomingMessage(base)).toBeNull();
  });
});

describe('máscaras e validações', () => {
  it('maskPhone', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
    expect(maskPhone('+55 11 99999-8888')).toBe('(11) 99999-8888');
    expect(maskPhone('1')).toBe('(1');
  });
  it('maskCnpj / validateCnpj', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(validateCnpj('11.222.333/0001-81')).toBe(true);
    expect(validateCnpj('11.222.333/0001-82')).toBe(false);
    expect(validateCnpj('11111111111111')).toBe(false);
  });
  it('parseInstagram', () => {
    expect(parseInstagram('@pratic.labs')).toBe('pratic.labs');
    expect(parseInstagram('https://www.instagram.com/pratic.labs/?hl=pt')).toBe('pratic.labs');
    expect(parseInstagram('')).toBeNull();
  });
  it('parseSegments', () => expect(parseSegments('Parlamentar, empresa,, parlamentar')).toEqual(['parlamentar', 'empresa']));
  it('nextMessageStatus só avança', () => {
    expect(nextMessageStatus('sent', 'delivered')).toBe('delivered');
    expect(nextMessageStatus('read', 'delivered')).toBe('read');
    expect(nextMessageStatus('delivered', 'failed')).toBe('delivered');
    expect(nextMessageStatus('sent', 'failed')).toBe('failed');
  });
  it('CSV com cnpj, segmentos e origem', () => {
    const { rows } = parseLeadsCsv('nome;telefone;cnpj;segmentos;origem\nAna;11999998888;11.222.333/0001-81;parlamentar|empresa;indicacao');
    expect(rows[0]).toMatchObject({ cnpj: '11222333000181', segmentos: ['parlamentar', 'empresa'], origem: 'indicacao' });
  });
});

describe('parseUazapiEvent', () => {
  const msg = { chatid: '5511999998888@s.whatsapp.net', text: 'oi', fromMe: false, isGroup: false, messageid: 'M1', id: 'owner:M1', senderName: 'Ana', messageType: 'Conversation' };
  it('texto recebido', () =>
    expect(parseUazapiEvent({ EventType: 'messages', message: msg })).toMatchObject({ kind: 'message', phone: '5511999998888', body: 'oi', fromMe: false, messageType: 'text' }));
  it('mídia sem texto', () =>
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, text: '', messageType: 'AudioMessage', content: { seconds: 7, mimetype: 'audio/ogg' } } }))
      .toMatchObject({ messageType: 'audio', seconds: 7, mimetype: 'audio/ogg', uazId: 'owner:M1' }));
  it('ignora grupo e enviadas pela API', () => {
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, isGroup: true } })).toBeNull();
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, wasSentByApi: true } })).toBeNull();
  });
  it('mensagem enviada pelo celular vira fromMe', () =>
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, fromMe: true } })).toMatchObject({ fromMe: true }));
  it('recibo de leitura', () =>
    expect(parseUazapiEvent({ EventType: 'messages_update', state: 'Read', event: { MessageIDs: ['M1'], IsGroup: false, IsFromMe: true } }))
      .toEqual({ kind: 'status', state: 'read', messageIds: ['M1'], isFromMe: true }));
  it('ignora recibo de grupo', () =>
    expect(parseUazapiEvent({ EventType: 'messages_update', type: 'GroupReceipts', event: { MessageIDs: ['M1'], IsGroup: true } })).toBeNull());
});

describe('phoneKey / phoneVariants (9º dígito)', () => {
  it('as duas formas do mesmo celular têm a mesma chave', () => {
    expect(phoneKey('5543999359959')).toBe(phoneKey('554399359959'));
    expect(phoneKey('(43) 99935-9959')).toBe('554399359959'.replace(/^/, ''));
  });
  it('números diferentes não colidem', () => {
    expect(phoneKey('5543999359959')).not.toBe(phoneKey('5543999359958'));
    expect(phoneKey('5511999998888')).not.toBe(phoneKey('5543999359959'));
  });
  it('fixo não é alterado', () => expect(phoneKey('554333334444')).toBe('554333334444'));
  it('variantes', () => {
    expect(phoneVariants('5543999359959')).toEqual(['5543999359959', '554399359959']);
    expect(phoneVariants('554399359959')).toEqual(['554399359959', '5543999359959']);
    expect(phoneVariants('554333334444')).toEqual(['554333334444']);
    expect(phoneVariants(null)).toEqual([]);
  });
});
