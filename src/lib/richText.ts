/**
 * Extrai texto puro de um documento TipTap/ProseMirror (o formato de
 * `notes.content` e `demands.description`).
 *
 * Serve para prévias e buscas — onde renderizar o documento inteiro é caro
 * ou impossível (portal do cliente, cards, listas). Sem isto, um `{...}`
 * jogado direto no JSX vira "[object Object]".
 *
 * Também aceita string, porque linhas antigas gravaram texto puro na coluna.
 */
export function richTextToPlain(doc: unknown, maxLength = 0): string {
  const text = collect(doc).replace(/\s+/g, " ").trim();
  if (maxLength > 0 && text.length > maxLength) {
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }
  return text;
}

function collect(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collect).join(" ");
  if (typeof node !== "object") return "";

  const record = node as Record<string, unknown>;

  if (typeof record.text === "string") return record.text;

  // Nós sem texto próprio, mas com rótulo útil (menções, blocos de arquivo)
  const attrs = record.attrs as Record<string, unknown> | undefined;
  if (attrs) {
    if (typeof attrs.label === "string") return `@${attrs.label}`;
    if (typeof attrs.name === "string") return attrs.name;
  }

  return collect(record.content);
}

/** True quando o documento não tem nenhum texto — útil para placeholders. */
export function isRichTextEmpty(doc: unknown): boolean {
  return richTextToPlain(doc) === "";
}
