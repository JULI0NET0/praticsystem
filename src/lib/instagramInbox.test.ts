import { describe, expect, it } from 'vitest'
import {
  parseGraphMessage,
  parseWebhookMessage,
  previewText,
  replyWindow,
  summarizeConversations
} from './instagramInbox'

describe('replyWindow', () => {
  const now = new Date('2026-10-15T12:00:00Z').getTime()

  it('fica aberta até 24h depois da última mensagem da pessoa', () => {
    expect(replyWindow('2026-10-14T13:00:00Z', now)).toEqual({ open: true, closesAt: '2026-10-15T13:00:00.000Z' })
    expect(replyWindow('2026-10-14T11:00:00Z', now).open).toBe(false)
  })

  it('fecha quando a pessoa nunca escreveu', () => {
    expect(replyWindow(null, now)).toEqual({ open: false, closesAt: null })
  })
})

describe('parseWebhookMessage', () => {
  it('lê texto, anexo e resposta a story', () => {
    expect(parseWebhookMessage({ mid: 'm1', text: 'oi' })).toEqual({ mid: 'm1', kind: 'text', text: 'oi', attachments: null })
    expect(parseWebhookMessage({ mid: 'm2', attachments: [{ type: 'image', payload: { url: 'u' } }] })).toMatchObject({
      kind: 'image',
      attachments: [{ type: 'image', url: 'u' }]
    })
    expect(parseWebhookMessage({ mid: 'm3', text: 'amei', reply_to: { story: { id: 's' } } }).kind).toBe('story')
    expect(parseWebhookMessage({ mid: 'm4' }).kind).toBe('other')
  })
})

describe('parseGraphMessage', () => {
  const own = { id: 'ME', username: 'juli0net0' }

  it('identifica o contato e a direção', () => {
    const inbound = parseGraphMessage(
      { id: 'a', created_time: '2026-10-15T16:30:49+0000', from: { id: 'U1', username: 'ana' }, message: 'oi' },
      own
    )
    expect(inbound).toMatchObject({ igsid: 'U1', direction: 'in', kind: 'text', source: 'import' })
    expect(inbound?.read_at).toBe(inbound?.created_at)

    const outbound = parseGraphMessage(
      {
        id: 'b',
        created_time: '2026-10-15T16:31:00+0000',
        from: { id: 'ME', username: 'juli0net0' },
        to: { data: [{ id: 'U1', username: 'ana' }] },
        message: 'olá'
      },
      own
    )
    expect(outbound).toMatchObject({ igsid: 'U1', direction: 'out', read_at: null })
  })

  it('lê mensagem com botões (template) e guarda o link do post compartilhado', () => {
    const tpl = parseGraphMessage(
      {
        id: 't',
        created_time: '2026-10-15T10:00:00+0000',
        from: { id: 'ME' },
        to: { data: [{ id: 'U3' }] },
        message: '',
        attachments: { data: [{ generic_template: { title: 'Posso te mandar o link?', cta: [{ title: 'Claro!', type: 'postback' }] } }] }
      },
      own
    )
    expect(tpl).toMatchObject({ kind: 'template', text: 'Posso te mandar o link?', attachments: [{ type: 'button', title: 'Claro!' }] })

    const share = parseGraphMessage(
      { id: 's', created_time: '2026-10-15T10:00:00+0000', from: { id: 'U3' }, shares: { data: [{ link: 'https://x' }] } },
      own
    )
    expect(share).toMatchObject({ kind: 'share', attachments: [{ type: 'share', url: 'https://x' }] })
  })

  it('marca post compartilhado e ignora mensagem sem destinatário', () => {
    expect(
      parseGraphMessage({ id: 'c', created_time: '2026-10-15T10:00:00+0000', from: { id: 'U2' }, shares: { data: [{}] } }, own)?.kind
    ).toBe('share')
    expect(parseGraphMessage({ id: 'd', created_time: '2026-10-15T10:00:00+0000', from: { id: 'ME' } }, own)).toBeNull()
  })
})

describe('summarizeConversations', () => {
  it('agrupa por contato, conta não lidas e marca quem precisa de resposta', () => {
    const out = summarizeConversations([
      { igsid: 'A', direction: 'in', kind: 'text', text: 'oi', created_at: '2026-10-15T10:00:00Z', read_at: null },
      { igsid: 'A', direction: 'in', kind: 'text', text: 'tem link?', created_at: '2026-10-15T11:00:00Z', read_at: null },
      { igsid: 'B', direction: 'in', kind: 'text', text: 'valeu', created_at: '2026-10-15T09:00:00Z', read_at: '2026-10-15T09:05:00Z' },
      { igsid: 'B', direction: 'out', kind: 'text', text: 'de nada', created_at: '2026-10-15T12:00:00Z', read_at: null }
    ])
    expect(out.map((c) => c.igsid)).toEqual(['B', 'A'])
    expect(out[1]).toMatchObject({ unread: 2, needsReply: true, lastText: 'tem link?', lastInboundAt: '2026-10-15T11:00:00Z' })
    expect(out[0]).toMatchObject({ unread: 0, needsReply: false, lastDirection: 'out' })
  })

  it('previewText cai no rótulo do tipo quando não há texto', () => {
    expect(previewText('image', null)).toBe('Foto')
    expect(previewText('text', ' oi ')).toBe('oi')
  })
})
