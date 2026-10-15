import { describe, expect, it } from 'vitest'
import { buildDailySeries, describeLogEvent, statsByAutomation, toDayKey } from './instagramStats'
import { buildContactRow, needsProfile } from './instagramContacts'

describe('buildDailySeries', () => {
  const now = new Date('2026-10-15T15:00:00Z') // 12:00 em São Paulo

  it('gera um ponto por dia, terminando hoje', () => {
    const s = buildDailySeries({ contatos: [], dms: [], cliques: [] }, 7, now)
    expect(s).toHaveLength(7)
    expect(s[6].date).toBe('2026-10-15')
    expect(s[6].label).toBe('15/10')
    expect(s[0].date).toBe('2026-10-09')
  })

  it('conta eventos no dia de São Paulo e ignora os de fora da janela', () => {
    const s = buildDailySeries(
      {
        contatos: ['2026-10-15T02:00:00Z', '2026-10-15T14:00:00Z', '2026-09-01T12:00:00Z'],
        dms: ['2026-10-14T12:00:00Z'],
        cliques: []
      },
      7,
      now
    )
    // 02:00Z do dia 15 ainda é dia 14 em São Paulo
    expect(s.find((p) => p.date === '2026-10-14')).toMatchObject({ contatos: 1, dms: 1 })
    expect(s.find((p) => p.date === '2026-10-15')).toMatchObject({ contatos: 1 })
    expect(s.reduce((n, p) => n + p.contatos, 0)).toBe(2)
  })

  it('toDayKey usa o fuso de São Paulo', () => {
    expect(toDayKey('2026-10-15T02:59:00Z')).toBe('2026-10-14')
  })
})

describe('statsByAutomation', () => {
  it('soma comentários, envios e cliques por automação', () => {
    const out = statsByAutomation(
      [
        { automation_id: 'a', status: 'sent', comment_id: 'c1' },
        { automation_id: 'a', status: 'failed', comment_id: 'c2' },
        { automation_id: 'a', status: 'sent', comment_id: null },
        { automation_id: null, status: 'sent', comment_id: 'c3' }
      ],
      [{ automation_id: 'a' }, { automation_id: 'b' }]
    )
    expect(out.a).toEqual({ comments: 2, sent: 2, clicks: 1 })
    expect(out.b).toEqual({ comments: 0, sent: 0, clicks: 1 })
  })
})

describe('describeLogEvent', () => {
  it('traduz eventos conhecidos e ignora os outros', () => {
    expect(describeLogEvent('comment_matched')).toBe('Comentário acionou uma automação')
    expect(describeLogEvent('qualquer_coisa')).toBeNull()
  })
})

describe('contatos', () => {
  const now = '2026-10-15T12:00:00.000Z'

  it('needsProfile só pede perfil quando falta @ ou nome', () => {
    expect(needsProfile(null)).toBe(true)
    expect(needsProfile({ username: 'ana', name: null })).toBe(true)
    expect(needsProfile({ username: null, name: 'Ana' }, 'ana')).toBe(false)
    expect(needsProfile({ username: 'ana', name: 'Ana' })).toBe(false)
  })

  it('buildContactRow preserva dados antigos e soma a interação', () => {
    const row = buildContactRow(
      '1',
      { username: 'ana', name: 'Ana', source: 'comment', interactions: 3, profile_pic_url: 'x' },
      { source: 'dm' },
      null,
      now
    )
    expect(row).toMatchObject({ username: 'ana', name: 'Ana', source: 'comment', interactions: 4, profile_pic_url: 'x' })
    expect(row).not.toHaveProperty('profile_synced_at')
  })

  it('buildContactRow aplica o perfil novo e marca a sincronização', () => {
    const row = buildContactRow(
      '1',
      null,
      { source: 'dm' },
      { username: 'bia', name: 'Bia', profile_pic_url: 'p', is_follower: true },
      now
    )
    expect(row).toMatchObject({
      username: 'bia',
      name: 'Bia',
      source: 'dm',
      interactions: 1,
      is_follower: true,
      profile_synced_at: now
    })
  })
})
