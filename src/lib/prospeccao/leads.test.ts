import { describe, expect, it } from 'vitest';
import { displayName, filterLeadsForCampaign, interpolate, nameSuggestions, maskCnpj, maskPhone, nextMessageStatus, normalizePhone, parseInstagram, parseLeadsCsv, parseSegments, phoneKey, phoneVariants, pipelineStats, validateCnpj } from './leads';
import { eventFromFindRecord, parseIncomingMessage, parseUazapiEvent } from './webhook';
import { classifyPhone, countsForBadge } from './classify';
import { expandOccurrences, isOutsideBusinessHours, nextOccurrence } from './schedule';
import { applyMerge, buildMerge, defaultChoices, notesToImport } from './clientMerge';
import type { Client } from '@/types/database';
import type { Lead } from '@/types/database';

const lead = (over: Partial<Lead>): Lead => ({
  id: '1', nome: 'Ana Souza', origem: 'manual', estagio: 'novo', tags: [], unread_count: 0,
  segmentos: [], tipo: 'lead', created_at: '', updated_at: '', telefone: '5511999998888', ...over,
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
  it('ignora grupo, mas aceita enviadas pela API (agendadas chegam assim)', () => {
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, isGroup: true } })).toBeNull();
    expect(parseUazapiEvent({ EventType: 'messages', message: { ...msg, fromMe: true, wasSentByApi: true } })).toMatchObject({ kind: 'message', fromMe: true });
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

describe('classifyPhone', () => {
  const users = [{ id: 'u1', phone: '(43) 98888-1111' }];
  const clients = [{ id: 'c1', phone: '5511999998888', whatsapp_financeiro: '(21) 97777-0000' }];
  it('equipe pelo telefone do usuário (aceita máscara)', () =>
    expect(classifyPhone({ phone: '5543988881111', users, clients })).toEqual({ tipo: 'equipe', user_id: 'u1' }));
  it('equipe com o 9º dígito ausente', () =>
    expect(classifyPhone({ phone: '554388881111', users, clients })).toEqual({ tipo: 'equipe', user_id: 'u1' }));
  it('cliente pelo telefone ou pelo whatsapp financeiro', () => {
    expect(classifyPhone({ phone: '5511999998888', users, clients })).toEqual({ tipo: 'cliente', client_id: 'c1' });
    expect(classifyPhone({ phone: '5521977770000', users, clients })).toEqual({ tipo: 'cliente', client_id: 'c1' });
  });
  it('desconhecido vai para a triagem', () =>
    expect(classifyPhone({ phone: '5541900000000', users, clients })).toEqual({ tipo: 'triagem' }));
  it('equipe vence cliente', () =>
    expect(classifyPhone({ phone: '5511999998888', users: [{ id: 'u2', phone: '11999998888' }], clients }).tipo).toBe('equipe'));
  it('badge só conta lead e triagem', () => {
    expect(countsForBadge('lead')).toBe(true);
    expect(countsForBadge('triagem')).toBe(true);
    expect(countsForBadge('equipe')).toBe(false);
    expect(countsForBadge('cliente')).toBe(false);
  });
});

describe('recorrência de agendamentos', () => {
  const start = new Date('2026-10-12T12:00:00Z');
  it('sem regra: só a data', () => expect(expandOccurrences(start, null)).toEqual([start]));
  it('semanal a cada 1, respeita o máximo', () => {
    const out = expandOccurrences(start, { freq: 'weekly', interval: 1 }, { max: 3 });
    expect(out.map((d) => d.toISOString().slice(0, 10))).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
  });
  it('diário a cada 2 dias', () =>
    expect(nextOccurrence(start, { freq: 'daily', interval: 2 }).toISOString().slice(0, 10)).toBe('2026-10-14'));
  it('mensal preserva o dia e ajusta fim de mês', () => {
    const jan31 = new Date('2026-01-31T12:00:00Z');
    expect(nextOccurrence(jan31, { freq: 'monthly', interval: 1 }).toISOString().slice(0, 10)).toBe('2026-02-28');
  });
  it('termina em until', () => {
    const out = expandOccurrences(start, { freq: 'weekly', interval: 1, until: '2026-10-20T00:00:00Z' });
    expect(out).toHaveLength(2);
  });
  it('count é o total da série, descontando as já criadas', () => {
    expect(expandOccurrences(start, { freq: 'daily', interval: 1, count: 5 })).toHaveLength(5);
    expect(expandOccurrences(start, { freq: 'daily', interval: 1, count: 5 }, { alreadyCreated: 3 })).toHaveLength(2);
  });
  it('horário comercial em São Paulo', () => {
    expect(isOutsideBusinessHours(new Date('2026-10-12T15:00:00Z'))).toBe(false); // 12h BRT
    expect(isOutsideBusinessHours(new Date('2026-10-12T02:00:00Z'))).toBe(true); // 23h BRT
  });
});

describe('nome na nossa base', () => {
  it('nosso nome vence o da agenda do celular', () =>
    expect(displayName({ nome: 'Julio Mendonça', telefone: '5543999359959', wa_name: 'Julio Neto', wa_contact_name: 'Marido' })).toBe('Julio Mendonça'));
  it('sem nome ou só telefone cai para o WhatsApp', () => {
    expect(displayName({ nome: '5543999359959', telefone: '5543999359959', wa_name: 'Julio Neto' })).toBe('Julio Neto');
    expect(displayName({ nome: '', telefone: '5543999359959', wa_contact_name: 'Marido' })).toBe('Marido');
    expect(displayName({ nome: '5543999359959', telefone: '5543999359959' })).toBe('(43) 99935-9959');
  });
  it('sugestões só trazem nomes diferentes do atual, sem repetir', () => {
    const l = { nome: 'Julio Mendonça', telefone: '5543999359959', wa_name: 'Julio Neto', wa_contact_name: 'Marido' };
    expect(nameSuggestions(l).map((s) => s.name)).toEqual(['Julio Neto', 'Marido']);
    expect(nameSuggestions({ ...l, wa_name: 'julio mendonça' }).map((s) => s.name)).toEqual(['Marido']);
    expect(nameSuggestions({ ...l, wa_contact_name: 'Julio Neto' }).map((s) => s.name)).toEqual(['Julio Neto']);
  });
});

describe('eventFromFindRecord (sincronização)', () => {
  const rec = { id: 'owner:M1', messageid: 'M1', chatid: '554399359959@s.whatsapp.net', fromMe: true, wasSentByApi: true, messageType: 'ExtendedTextMessage', text: 'Podemos agendar?', status: 'Read', messageTimestamp: Date.parse('2026-10-09T19:35:00Z'), senderName: '' };
  it('texto enviado pela API vira evento com status', () =>
    expect(eventFromFindRecord(rec)).toMatchObject({ kind: 'message', phone: '554399359959', fromMe: true, externalId: 'M1', status: 'read', body: 'Podemos agendar?' }));
  it('mídia recebida usa a fileURL', () =>
    expect(eventFromFindRecord({ ...rec, fromMe: false, messageType: 'ImageMessage', text: '', fileURL: 'https://x/y.jpg', senderName: 'Ana' }))
      .toMatchObject({ messageType: 'image', fileUrl: 'https://x/y.jpg', name: 'Ana' }));
  it('ignora grupo, agendada ainda não enviada e anterior ao piso', () => {
    expect(eventFromFindRecord({ ...rec, chatid: '120363@g.us' })).toBeNull();
    expect(eventFromFindRecord({ ...rec, status: 'scheduled' })).toBeNull();
    expect(eventFromFindRecord({ ...rec, status: 'Deleted' })).toBeNull();
    expect(eventFromFindRecord(rec, new Date('2026-10-10T00:00:00Z'))).toBeNull();
    expect(eventFromFindRecord(rec, new Date('2026-10-09T00:00:00Z'))).not.toBeNull();
  });
  it('mensagem sem texto nem mídia é ignorada', () =>
    expect(eventFromFindRecord({ ...rec, text: '', messageType: 'ProtocolMessage' })).toBeNull());
});

describe('importar dados lead + cliente', () => {
  const client = (over: Partial<Client> = {}): Client => ({
    id: 'c1', name: 'COLD JOIAS LTDA', nome_fantasia: '', cnpj: '', tipo_pessoa: 'PJ', contact_name: '', email: '', phone: '(43) 99935-9959', status: 'active', created_at: '', ...over,
  });
  const lead1 = lead({ nome: 'Julio Mendonça', empresa: 'cold joias', email: 'j@cold.com', telefone: '554399359959', cnpj: '11222333000181', instagram: 'julioneto', segmentos: ['empresa'], cidade: 'Londrina', uf: 'pr' });

  it('classifica vazio, igual e conflito', () => {
    const f = buildMerge(lead1, client({ contact_name: 'Julio N.', email: 'j@cold.com' }));
    const state = Object.fromEntries(f.map((x) => [x.key, x.state]));
    expect(state.contato).toBe('conflict');
    expect(state.email).toBe('same');
    expect(state.empresa).toBe('fill_client');
    expect(state.razao).toBe('fill_lead');
    expect(state.telefone).toBe('same'); // com e sem 9º dígito / máscara
  });

  it('padrão: preenche os vazios e mantém o cliente nos conflitos', () => {
    const c = client({ contact_name: 'Julio N.' });
    const fields = buildMerge(lead1, c);
    const { clientPatch, leadPatch } = applyMerge(c, fields, defaultChoices(fields));
    expect(clientPatch.nome_fantasia).toBe('cold joias');
    expect(clientPatch.cnpj).toBe('11.222.333/0001-81');
    expect(clientPatch.social_access?.instagram?.usuario).toBe('julioneto');
    expect(clientPatch.address).toMatchObject({ cidade: 'Londrina', uf: 'PR' });
    expect(clientPatch.contact_name).toBeUndefined(); // conflito: o do cliente fica
    expect(leadPatch.nome).toBe('Julio N.'); // e o lead passa a ter o mesmo nome
    expect(leadPatch.razao_social).toBe('COLD JOIAS LTDA');
  });

  it('escolher o lead no conflito leva o valor ao cliente', () => {
    const c = client({ contact_name: 'Julio N.' });
    const fields = buildMerge(lead1, c);
    const { clientPatch, leadPatch } = applyMerge(c, fields, { ...defaultChoices(fields), contato: 'lead' });
    expect(clientPatch.contact_name).toBe('Julio Mendonça');
    expect(leadPatch.nome).toBeUndefined();
  });

  it('mescla address e social_access existentes sem perder o resto', () => {
    const c = client({ address: { cep: '86000', logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: '', uf: '' }, social_access: { instagram: { usuario: '', senha: 'x' } } });
    const fields = buildMerge(lead1, c);
    const { clientPatch } = applyMerge(c, fields, defaultChoices(fields));
    expect(clientPatch.address).toMatchObject({ cep: '86000', logradouro: 'Rua A', cidade: 'Londrina' });
    expect(clientPatch.social_access?.instagram).toMatchObject({ usuario: 'julioneto', senha: 'x' });
  });

  it('skip não altera nada', () => {
    const c = client();
    const fields = buildMerge(lead1, c);
    const none = Object.fromEntries(fields.map((f) => [f.key, 'skip' as const]));
    expect(applyMerge(c, fields, none)).toMatchObject({ clientPatch: {}, leadPatch: {}, changed: 0 });
  });

  it('notas do atendimento viram notas do cliente sem duplicar', () => {
    const acts = [{ id: 'a1', tipo: 'nota' as const, descricao: 'Quer proposta', created_at: '2026-10-09T10:00:00Z' }, { id: 'a2', tipo: 'estagio' as const, descricao: 'x', created_at: '' }];
    const first = notesToImport({ id: 'L1', notas: 'Antiga' }, acts, [], 'Julio');
    expect(first.map((n) => n.id)).toEqual(['lead-note-legacy-L1', 'lead-note-a1']);
    expect(first[1].content).toContain('Importado do atendimento');
    expect(notesToImport({ id: 'L1', notas: 'Antiga' }, acts, first, 'Julio')).toEqual([]);
  });
});
