import React from "react";

export interface LinkToken {
  type: "text" | "link";
  content: string;
  href?: string;
}

/**
 * Remove pontuação comum colada ao final de uma URL capturada no texto corrido
 * (como pontos finais, vírgulas, parênteses desbalanceados, etc.).
 */
export function cleanTrailingPunctuation(rawUrl: string): { url: string; trailing: string } {
  let url = rawUrl;
  let trailing = "";

  // Remove pontuações finais comuns (., ! ? : ; ' " >)
  const punctuationRegex = /[,.!?:;'">]+$/;
  const matchPunct = url.match(punctuationRegex);
  if (matchPunct) {
    trailing = matchPunct[0] + trailing;
    url = url.slice(0, -matchPunct[0].length);
  }

  // Remove parêntese de fechamento não balanceado
  while (url.endsWith(")")) {
    const openCount = (url.match(/\(/g) || []).length;
    const closeCount = (url.match(/\)/g) || []).length;
    if (closeCount > openCount) {
      url = url.slice(0, -1);
      trailing = ")" + trailing;
    } else {
      break;
    }
  }

  // Remove colchete de fechamento não balanceado
  while (url.endsWith("]")) {
    const openCount = (url.match(/\[/g) || []).length;
    const closeCount = (url.match(/\]/g) || []).length;
    if (closeCount > openCount) {
      url = url.slice(0, -1);
      trailing = "]" + trailing;
    } else {
      break;
    }
  }

  return { url, trailing };
}

/**
 * Normaliza um link para garantir protocolo HTTP/HTTPS válido.
 */
export function normalizeHref(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Analisa o texto e extrai tokens de texto puro e links clicáveis
 * (suporta URLs diretas http/https/www e formato markdown [texto](url)).
 */
export function parseLinks(text: string): LinkToken[] {
  if (!text) return [];

  // Regex para Markdown links [texto](url) OU URLs brutas (http://, https://, www.)
  const COMBINED_REGEX =
    /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s\)]+)\)|((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;

  const rawTokens: LinkToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = COMBINED_REGEX.exec(text)) !== null) {
    const matchStart = match.index;

    // Texto antes do link
    if (matchStart > lastIndex) {
      rawTokens.push({
        type: "text",
        content: text.slice(lastIndex, matchStart),
      });
    }

    if (match[1] && match[2]) {
      // Markdown link [texto](url)
      const label = match[1];
      const href = normalizeHref(match[2]);
      rawTokens.push({
        type: "link",
        content: label,
        href,
      });
      lastIndex = COMBINED_REGEX.lastIndex;
    } else if (match[3]) {
      // URL direta
      const raw = match[3];
      const { url, trailing } = cleanTrailingPunctuation(raw);
      if (url) {
        rawTokens.push({
          type: "link",
          content: url,
          href: normalizeHref(url),
        });
      }
      if (trailing) {
        rawTokens.push({
          type: "text",
          content: trailing,
        });
      }
      lastIndex = matchStart + raw.length;
    }
  }

  // Texto restante
  if (lastIndex < text.length) {
    rawTokens.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // Mescla tokens de texto adjacentes
  const tokens: LinkToken[] = [];
  for (const token of rawTokens) {
    if (token.type === "text") {
      if (!token.content) continue;
      const prev = tokens[tokens.length - 1];
      if (prev && prev.type === "text") {
        prev.content += token.content;
      } else {
        tokens.push({ ...token });
      }
    } else {
      tokens.push(token);
    }
  }

  return tokens;
}

export interface LinkifiedTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  linkStyle?: React.CSSProperties;
}

/**
 * Renderiza texto convertendo automaticamente URLs e links em tags <a> clicáveis
 * com abertura em nova aba e estilo elegante.
 */
export function LinkifiedText({
  text,
  className,
  style,
  linkStyle,
}: LinkifiedTextProps) {
  const tokens = parseLinks(text);

  return (
    <span className={className} style={style}>
      {tokens.map((token, index) => {
        if (token.type === "text") {
          return <React.Fragment key={index}>{token.content}</React.Fragment>;
        }
        return (
          <a
            key={index}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{
              color: "var(--accent)",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              fontWeight: 600,
              wordBreak: "break-all",
              overflowWrap: "anywhere",
              cursor: "pointer",
              ...linkStyle,
            }}
          >
            {token.content}
          </a>
        );
      })}
    </span>
  );
}

export function renderLinks(
  text: string,
  linkStyle?: React.CSSProperties
): React.ReactNode {
  return <LinkifiedText text={text} linkStyle={linkStyle} />;
}
