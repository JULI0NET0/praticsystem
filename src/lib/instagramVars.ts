// Variáveis dinâmicas das mensagens do Instagram ({first_name}, {username}).
// Módulo puro (sem next/headers) para poder ser usado no cliente e no servidor.

export interface IgMessageVars {
  first_name?: string | null
  username?: string | null
}

export const IG_MESSAGE_VARS = [
  { tag: '{first_name}', label: 'Primeiro nome' },
  { tag: '{username}', label: '@ do Instagram' }
] as const

// "Maria Souza" -> "Maria"; "maria_souza" não vira nome (só nomes reais do perfil).
export function firstNameOf(fullName?: string | null): string {
  const first = (fullName || '').trim().split(/\s+/)[0] || ''
  if (!first) return ''
  return first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1)
}

// Substitui {first_name}, {username} e a forma com reserva {first_name|amigo}.
// Sem valor e sem reserva, a tag some e a pontuação/espaços ao redor são arrumados
// ("Oi {first_name}, tudo bem?" -> "Oi, tudo bem?").
export function renderMessageVars(text: string, vars: IgMessageVars): string {
  const values: Record<string, string> = {
    first_name: (vars.first_name || '').trim(),
    username: (vars.username || '').trim().replace(/^@/, '')
  }

  const replaced = text.replace(/\{(first_name|username)(?:\|([^}]*))?\}/g, (_m, key: string, fallback?: string) => {
    const value = values[key]
    if (value) return key === 'username' ? `@${value}` : value
    return fallback ?? ''
  })

  if (replaced === text) return text
  return replaced
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]*[,;:]\s*/gm, '')
    .trim()
}
