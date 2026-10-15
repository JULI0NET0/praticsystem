import { describe, expect, it } from 'vitest'
import { firstNameOf, renderMessageVars } from './instagramVars'

describe('renderMessageVars', () => {
  it('substitui nome e username', () => {
    expect(renderMessageVars('Oi {first_name}! ({username})', { first_name: 'Maria', username: 'maria.x' }))
      .toBe('Oi Maria! (@maria.x)')
  })
  it('usa reserva quando falta o valor', () => {
    expect(renderMessageVars('Oi {first_name|amigo}!', {})).toBe('Oi amigo!')
  })
  it('remove a tag e arruma a pontuação sem valor nem reserva', () => {
    expect(renderMessageVars('Oi {first_name}, tudo bem?', {})).toBe('Oi, tudo bem?')
  })
  it('não mexe em texto sem variáveis', () => {
    expect(renderMessageVars('Olá!  Tudo bem ?', {})).toBe('Olá!  Tudo bem ?')
  })
})

describe('firstNameOf', () => {
  it('pega o primeiro nome capitalizado', () => {
    expect(firstNameOf('maria souza')).toBe('Maria')
    expect(firstNameOf(null)).toBe('')
  })
})
