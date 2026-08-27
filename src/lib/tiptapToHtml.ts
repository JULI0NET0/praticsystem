/**
 * Converte documentos TipTap JSON (usados em notes.content e content_plans.description/results)
 * em HTML semântico e estilizado para impressão e exportação em PDF.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function convertTipTapToHtml(node: any): string {
  if (!node) return '';

  if (typeof node === 'string') {
    return `<p style="margin: 0 0 6pt 0; line-height: 1.6;">${escapeHtml(node)}</p>`;
  }

  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') {
          text = `<strong>${text}</strong>`;
        } else if (mark.type === 'italic') {
          text = `<em>${text}</em>`;
        } else if (mark.type === 'strike') {
          text = `<s style="color: #888;">${text}</s>`;
        } else if (mark.type === 'code') {
          text = `<code style="background: #f1f3f5; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 8.5pt;">${text}</code>`;
        } else if (mark.type === 'link') {
          const href = escapeHtml(mark.attrs?.href || '#');
          text = `<a href="${href}" style="color: #d9480f; text-decoration: underline;">${text}</a>`;
        } else if (mark.type === 'highlight') {
          const color = escapeHtml(mark.attrs?.color || '#fff3b0');
          text = `<mark style="background-color: ${color}; padding: 0 2px; border-radius: 2px;">${text}</mark>`;
        } else if (mark.type === 'textStyle' && mark.attrs?.color) {
          const color = escapeHtml(mark.attrs.color);
          text = `<span style="color: ${color};">${text}</span>`;
        }
      }
    }
    return text;
  }

  const childrenHtml = Array.isArray(node.content)
    ? node.content.map((child: any) => convertTipTapToHtml(child)).join('')
    : '';

  switch (node.type) {
    case 'doc':
      return childrenHtml;

    case 'paragraph':
      return `<p style="margin: 0 0 6pt 0; line-height: 1.6;">${childrenHtml || '<br/>'}</p>`;

    case 'heading': {
      const level = node.attrs?.level || 1;
      const sizes: Record<number, string> = { 1: '15pt', 2: '13pt', 3: '11pt' };
      const margins: Record<number, string> = { 1: '12pt 0 4pt 0', 2: '10pt 0 4pt 0', 3: '8pt 0 3pt 0' };
      const size = sizes[level] || '12pt';
      const margin = margins[level] || '8pt 0 4pt 0';
      return `<h${level} style="font-size: ${size}; font-weight: 700; margin: ${margin}; color: #111; line-height: 1.3;">${childrenHtml}</h${level}>`;
    }

    case 'blockquote':
      return `<blockquote style="border-left: 3px solid #d9480f; padding: 4pt 10pt; margin: 8pt 0; color: #444; background: #fff8f5; border-radius: 0 4px 4px 0; font-style: italic;">${childrenHtml}</blockquote>`;

    case 'codeBlock': {
      return `<pre style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 6pt 8pt; font-family: monospace; font-size: 8pt; overflow-x: auto; margin: 6pt 0; line-height: 1.4;"><code>${childrenHtml}</code></pre>`;
    }

    case 'horizontalRule':
      return `<hr style="border: none; border-top: 1px solid #eaeaea; margin: 10pt 0;" />`;

    case 'bulletList':
      return `<ul style="margin: 4pt 0 6pt 16pt; padding: 0; list-style-type: disc;">${childrenHtml}</ul>`;

    case 'orderedList':
      return `<ol style="margin: 4pt 0 6pt 16pt; padding: 0;">${childrenHtml}</ol>`;

    case 'listItem':
      return `<li style="margin-bottom: 3pt; line-height: 1.5;">${childrenHtml}</li>`;

    case 'taskList':
      return `<ul style="list-style: none; padding-left: 0; margin: 4pt 0;">${childrenHtml}</ul>`;

    case 'taskItem': {
      const checked = Boolean(node.attrs?.checked);
      const box = checked
        ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border-radius:2px;background:#d9480f;border:1.5px solid #d9480f;margin-right:6px;vertical-align:middle;"><svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
        : `<span style="display:inline-flex;width:11px;height:11px;border-radius:2px;background:#ffffff;border:1.5px solid #bbb;margin-right:6px;vertical-align:middle;"></span>`;
      const textDecor = checked ? 'text-decoration: line-through; color: #888;' : '';
      return `<li style="display: flex; align-items: flex-start; margin-bottom: 3pt; ${textDecor}"><span style="margin-top: 3px; flex-shrink: 0;">${box}</span><div style="flex:1;">${childrenHtml}</div></li>`;
    }

    case 'callout': {
      const icon = node.attrs?.icon || '💡';
      return `<div style="display:flex;align-items:flex-start;gap:6pt;background:#fff8f5;border:1px solid #ffd4be;border-radius:6px;padding:6pt 8pt;margin:6pt 0;"><span style="font-size:11pt;line-height:1;">${icon}</span><div style="flex:1;">${childrenHtml}</div></div>`;
    }

    case 'mention': {
      const label = escapeHtml(node.attrs?.label || '');
      return `<span style="background: #fff0eb; color: #d9480f; border-radius: 3px; padding: 1px 4px; font-weight: 600; font-size: 8.5pt;">@${label}</span>`;
    }

    case 'image': {
      const src = escapeHtml(node.attrs?.src || '');
      const alt = escapeHtml(node.attrs?.alt || '');
      return `<div style="margin: 6pt 0; text-align: center;"><img src="${src}" alt="${alt}" style="max-width: 100%; max-height: 250px; border-radius: 4px; border: 1px solid #eee;" /></div>`;
    }

    default:
      return childrenHtml;
  }
}
