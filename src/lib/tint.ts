/**
 * Tinta uma cor com transparência.
 *
 * Substitui o padrão antigo de concatenar alpha em hex
 * (`${color}18`), que só funcionava quando `color` era um hex
 * literal de 6 dígitos. Assim que a cor passou a ser um token
 * (`var(--color-warning)`), a concatenação virava
 * `var(--color-warning)18` — CSS inválido, e o fundo sumia
 * silenciosamente.
 *
 * `color-mix` aceita as duas formas, então funciona tanto para os
 * tokens do tema quanto para os hex literais que sobraram na rampa
 * categórica (que precisam continuar literais por causa do kanban).
 *
 * @param color qualquer cor CSS — hex, rgb() ou var(--token). Aceita
 *   `undefined` porque vários call sites vêm de um `.find()?.color`:
 *   nesses casos a concatenação antiga gerava a string literal
 *   "undefined15", que o browser descartava em silêncio.
 * @param percent opacidade em % (o hex `18` ≈ 9%, `30` ≈ 19%)
 */
export function tint(color: string | undefined | null, percent: number): string {
  if (!color) return "transparent";
  return `color-mix(in oklab, ${color} ${percent}%, transparent)`;
}
