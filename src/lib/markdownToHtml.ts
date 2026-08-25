interface RawListItem {
  type: 'ul' | 'ol' | 'taskList';
  indent: number;
  text: string;
  checked?: boolean;
}

interface ListItemNode {
  type: 'ul' | 'ol' | 'taskList';
  indent: number;
  text: string;
  checked?: boolean;
  children: ListGroupNode[];
}

interface ListGroupNode {
  type: 'list';
  listType: 'ul' | 'ol' | 'taskList';
  indent: number;
  items: ListItemNode[];
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const htmlLines: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];

  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  let pendingListItems: RawListItem[] = [];

  const parseInline = (text: string): string => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
    escaped = escaped.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // 1. Temporarily placeholder markdown links to prevent double parsing of their URLs
    const markdownLinks: string[] = [];
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
      const placeholder = `___MDLINK_${markdownLinks.length}___`;
      markdownLinks.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="editor-link">${linkText}</a>`);
      return placeholder;
    });

    // 2. Identify raw http/https links and wrap them in <a> tags
    escaped = escaped.replace(/\b(https?:\/\/[^\s<>]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="editor-link">${url}</a>`;
    });

    // 3. Restore the placeholder markdown links
    markdownLinks.forEach((html, index) => {
      escaped = escaped.replace(`___MDLINK_${index}___`, html);
    });

    return escaped;
  };

  const buildListTree = (rawItems: RawListItem[]): ListGroupNode[] => {
    const rootGroups: ListGroupNode[] = [];

    interface StackEntry {
      group: ListGroupNode;
      lastItem: ListItemNode;
    }

    const stack: StackEntry[] = [];

    for (const raw of rawItems) {
      const itemNode: ListItemNode = {
        type: raw.type,
        indent: raw.indent,
        text: raw.text,
        checked: raw.checked,
        children: [],
      };

      while (stack.length > 0) {
        const top = stack[stack.length - 1];

        if (raw.indent < top.group.indent) {
          stack.pop();
          continue;
        }

        if (raw.indent === top.group.indent) {
          if (raw.type === top.group.listType) {
            stack.pop();
            continue;
          } else {
            const matchingAncestorIndex = stack.findIndex(
              s => s.group.listType === raw.type && s.group.indent === raw.indent
            );
            if (matchingAncestorIndex !== -1) {
              while (stack.length > matchingAncestorIndex) {
                stack.pop();
              }
              continue;
            } else {
              break;
            }
          }
        }

        break;
      }

      if (stack.length === 0) {
        let lastRootGroup = rootGroups[rootGroups.length - 1];
        if (!lastRootGroup || lastRootGroup.listType !== raw.type) {
          lastRootGroup = {
            type: 'list',
            listType: raw.type,
            indent: raw.indent,
            items: [],
          };
          rootGroups.push(lastRootGroup);
        }
        lastRootGroup.items.push(itemNode);
        stack.push({ group: lastRootGroup, lastItem: itemNode });
      } else {
        const parentEntry = stack[stack.length - 1];
        const childrenGroups = parentEntry.lastItem.children;
        let lastChildGroup = childrenGroups[childrenGroups.length - 1];

        if (!lastChildGroup || lastChildGroup.listType !== raw.type || lastChildGroup.indent !== raw.indent) {
          lastChildGroup = {
            type: 'list',
            listType: raw.type,
            indent: raw.indent,
            items: [],
          };
          childrenGroups.push(lastChildGroup);
        }
        lastChildGroup.items.push(itemNode);
        stack.push({ group: lastChildGroup, lastItem: itemNode });
      }
    }

    return rootGroups;
  };

  const renderListGroupToHTML = (group: ListGroupNode): string => {
    const tag = group.listType === 'ol' ? 'ol' : 'ul';
    const attr = group.listType === 'taskList' ? ' data-type="taskList"' : '';

    const itemsHTML = group.items.map(item => {
      let itemContent = parseInline(item.text);
      const subHTML = renderChildrenHTML(item.children);

      if (group.listType === 'taskList') {
        const checkedAttr = item.checked ? ' checked' : '';
        const checkedData = item.checked ? 'true' : 'false';
        itemContent = `<label><input type="checkbox"${checkedAttr} /></label><div>${itemContent}</div>`;
        return `<li data-checked="${checkedData}">${itemContent}${subHTML}</li>`;
      }

      return `<li><p>${itemContent}</p>${subHTML}</li>`;
    }).join('');

    return `<${tag}${attr}>${itemsHTML}</${tag}>`;
  };

  const renderChildrenHTML = (children: ListGroupNode[]): string => {
    if (!children || children.length === 0) return '';
    return children.map(childGroup => renderListGroupToHTML(childGroup)).join('');
  };

  const flushList = () => {
    if (pendingListItems.length === 0) return;
    const tree = buildListTree(pendingListItems);
    for (const group of tree) {
      htmlLines.push(renderListGroupToHTML(group));
    }
    pendingListItems = [];
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      htmlLines.push(`<blockquote>${blockquoteLines.map(line => parseInline(line)).join('<br />')}</blockquote>`);
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  const matchListItem = (line: string): RawListItem | null => {
    const rawIndent = line.match(/^[\t ]*/)?.[0] || '';
    const indent = rawIndent.replace(/\t/g, '    ').length;
    const trimmed = line.trim();
    if (!trimmed) return null;

    const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      return { type: 'taskList', indent, text: taskMatch[2], checked: taskMatch[1].toLowerCase() === 'x' };
    }

    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      return { type: 'ul', indent, text: ulMatch[1] };
    }

    const olMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (olMatch) {
      return { type: 'ol', indent, text: olMatch[2] };
    }

    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.trim().startsWith('```')) {
        const escapedCode = codeLines.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const langClass = codeBlockLang ? ` class="language-${codeBlockLang}"` : '';
        htmlLines.push(`<pre><code${langClass}>${escapedCode}</code></pre>`);
        inCodeBlock = false;
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (line.trim().startsWith('```')) {
      flushList();
      closeBlockquote();
      inCodeBlock = true;
      codeBlockLang = line.trim().slice(3).trim();
      continue;
    }

    if (line.startsWith('>')) {
      flushList();
      inBlockquote = true;
      const content = line.slice(1).trim();
      blockquoteLines.push(content);
      continue;
    } else {
      closeBlockquote();
    }

    if (/^(?:---|===|\*\*\*|___)$/.test(line.trim())) {
      flushList();
      htmlLines.push('<hr />');
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      htmlLines.push(`<h${level}>${parseInline(content)}</h${level}>`);
      continue;
    }

    const listItem = matchListItem(line);
    if (listItem) {
      pendingListItems.push(listItem);
      continue;
    }

    if (line.trim() === '') {
      flushList();
      continue;
    }

    flushList();
    htmlLines.push(`<p>${parseInline(line)}</p>`);
  }

  flushList();
  closeBlockquote();

  return htmlLines.join('\n');
}
