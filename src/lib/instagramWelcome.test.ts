import { describe, expect, it } from 'vitest'
import { shouldWelcome } from './instagramWelcome'
import { mergeDailySeries } from './instagramInsights'

const settings = { welcome_enabled: true, welcome_text: 'Oi!', welcome_button_text: null, welcome_button_url: null }

describe('shouldWelcome', () => {
  it('manda só para contato novo, com boas-vindas ativa e texto preenchido', () => {
    expect(shouldWelcome(settings, { isNew: true })).toBe(true)
    expect(shouldWelcome(settings, { isNew: false })).toBe(false)
    expect(shouldWelcome({ ...settings, welcome_enabled: false }, { isNew: true })).toBe(false)
    expect(shouldWelcome({ ...settings, welcome_text: '  ' }, { isNew: true })).toBe(false)
    expect(shouldWelcome(null, { isNew: true })).toBe(false)
  })
})

describe('mergeDailySeries', () => {
  it('junta seguidores e alcance no dia anterior ao end_time da Meta', () => {
    const days = mergeDailySeries({
      seguidores: [
        { value: 3, end_time: '2026-10-14T07:00:00+0000' },
        { value: 1, end_time: '2026-10-15T07:00:00+0000' }
      ],
      alcance: [{ value: 320, end_time: '2026-10-15T07:00:00+0000' }]
    })
    expect(days).toEqual([
      { date: '2026-10-13', label: '13/10', seguidores: 3, alcance: 0 },
      { date: '2026-10-14', label: '14/10', seguidores: 1, alcance: 320 }
    ])
  })
})
