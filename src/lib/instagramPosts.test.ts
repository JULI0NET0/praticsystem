import { describe, expect, it } from 'vitest'
import { isStalePublishing, mediaKindFromMime, validatePostInput, type PostInput } from './instagramPosts'

const now = new Date('2026-10-17T12:00:00Z').getTime()
const future = '2026-10-18T12:00:00Z'
const img = { url: 'https://x.com/a.jpg', kind: 'image' as const }
const vid = { url: 'https://x.com/a.mp4', kind: 'video' as const }

const base = (over: Partial<PostInput>): PostInput => ({
  post_type: 'image',
  media: [img],
  scheduled_at: future,
  ...over
})

describe('validatePostInput', () => {
  it('aceita cada tipo no formato certo', () => {
    expect(validatePostInput(base({}), now)).toBeNull()
    expect(validatePostInput(base({ post_type: 'reel', media: [vid] }), now)).toBeNull()
    expect(validatePostInput(base({ post_type: 'story', media: [vid] }), now)).toBeNull()
    expect(validatePostInput(base({ post_type: 'carousel', media: [img, vid] }), now)).toBeNull()
  })

  it('rejeita formatos errados', () => {
    expect(validatePostInput(base({ post_type: 'reel', media: [img] }), now)).toMatch(/Reel/)
    expect(validatePostInput(base({ post_type: 'image', media: [vid] }), now)).toMatch(/Imagem/)
    expect(validatePostInput(base({ post_type: 'carousel', media: [img] }), now)).toMatch(/Carrossel/)
    expect(validatePostInput(base({ post_type: 'carousel', media: Array(11).fill(img) }), now)).toMatch(/Carrossel/)
    expect(validatePostInput(base({ media: [] }), now)).toMatch(/ao menos/)
  })

  it('exige URL https, legenda dentro do limite e data futura', () => {
    expect(validatePostInput(base({ media: [{ url: 'http://x.com/a.jpg', kind: 'image' }] }), now)).toMatch(/https/)
    expect(validatePostInput(base({ caption: 'a'.repeat(2201) }), now)).toMatch(/Legenda/)
    expect(validatePostInput(base({ scheduled_at: '2026-10-17T10:00:00Z' }), now)).toMatch(/passou/)
    expect(validatePostInput(base({ scheduled_at: 'abc' }), now)).toMatch(/inválida/)
  })

  it('tolera "agora" com até 1 min de atraso', () => {
    expect(validatePostInput(base({ scheduled_at: '2026-10-17T11:59:30Z' }), now)).toBeNull()
  })
})

describe('helpers', () => {
  it('classifica mime', () => {
    expect(mediaKindFromMime('image/png')).toBe('image')
    expect(mediaKindFromMime('video/mp4')).toBe('video')
    expect(mediaKindFromMime('application/pdf')).toBeNull()
  })

  it('detecta publicação travada', () => {
    expect(isStalePublishing('2026-10-17T11:00:00Z', now)).toBe(true)
    expect(isStalePublishing('2026-10-17T11:50:00Z', now)).toBe(false)
    expect(isStalePublishing(null, now)).toBe(true)
  })
})
