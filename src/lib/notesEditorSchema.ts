import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import LinkExtension from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

/**
 * Subconjunto das extensions de BlockEditor.tsx que Markdown gerado por IA
 * realmente produz (via markdownToHtml). Fora os nós que só existem através
 * do menu "/" ou paste manual (Callout, LinkCard, FileBlock, menções,
 * imagens) — não têm representação em Markdown puro.
 */
export const NOTES_EDITOR_EXTENSIONS = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
  LinkExtension.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: 'https',
    HTMLAttributes: {
      class: 'editor-link',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),
];
