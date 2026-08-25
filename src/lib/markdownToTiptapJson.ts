import { Editor } from '@tiptap/core';
import { markdownToHtml } from './markdownToHtml';
import { NOTES_EDITOR_EXTENSIONS } from './notesEditorSchema';

/**
 * Converte Markdown (ex: saída da IA de organização) para o mesmo formato
 * TipTap JSON usado por notes.content, reaproveitando o parser Markdown→HTML
 * de BlockEditor.tsx e uma instância headless do editor pra fazer HTML→JSON.
 * Só pode rodar no browser (usa document).
 */
export function markdownToTiptapJson(markdown: string): any {
  const html = markdownToHtml(markdown);
  const el = document.createElement('div');
  const editor = new Editor({
    element: el,
    extensions: NOTES_EDITOR_EXTENSIONS,
    content: html,
  });
  const json = editor.getJSON();
  editor.destroy();
  return json;
}
