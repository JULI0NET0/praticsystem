'use client';

import {
  useEditor,
  EditorContent,
  Extension,
  ReactRenderer,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { DOMParser } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import ImageExtension from '@tiptap/extension-image';
import MentionExtension from '@tiptap/extension-mention';
import Suggestion from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, User, Building2,
  ImageIcon, Paperclip, FileDown, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Module-level upload callback registry (one editor active at a time) ──

const _uploadTrigger = {
  image: null as null | ((editor: any, range: any) => void),
  file:  null as null | ((editor: any, range: any) => void),
};

// ─── File size helper ──────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Slash command items ───────────────────────────────────────────────────

const SLASH_ITEMS = [
  { title: 'Texto',            description: 'Parágrafo simples',    icon: Type,         command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { title: 'Título 1',         description: 'Cabeçalho grande',     icon: Heading1,     command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run() },
  { title: 'Título 2',         description: 'Cabeçalho médio',      icon: Heading2,     command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run() },
  { title: 'Título 3',         description: 'Cabeçalho pequeno',    icon: Heading3,     command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run() },
  { title: 'Lista',            description: 'Lista com marcadores', icon: List,         command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: 'Lista numerada',   description: 'Lista com números',    icon: ListOrdered,  command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: 'Lista de tarefas', description: 'Checkboxes',           icon: CheckSquare,  command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
  { title: 'Citação',          description: 'Bloco de citação',     icon: Quote,        command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: 'Código',           description: 'Bloco de código',      icon: Code,         command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: 'Divisor',          description: 'Linha horizontal',     icon: Minus,        command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { title: 'Imagem',           description: 'Inserir imagem',       icon: ImageIcon,    command: ({ editor, range }: any) => _uploadTrigger.image?.(editor, range) },
  { title: 'Arquivo',          description: 'Anexar arquivo',       icon: Paperclip,    command: ({ editor, range }: any) => _uploadTrigger.file?.(editor, range) },
];

// ─── Slash menu component ──────────────────────────────────────────────────

const SlashMenuList = forwardRef<any, any>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp')   { setSelectedIndex(i => (i - 1 + props.items.length) % props.items.length); return true; }
      if (event.key === 'ArrowDown') { setSelectedIndex(i => (i + 1) % props.items.length); return true; }
      if (event.key === 'Enter')     { props.command(props.items[selectedIndex]); return true; }
      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);
  if (!props.items.length) return null;

  return (
    <div style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '220px', maxHeight: '360px', overflowY: 'auto' }}>
      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: '2px 8px 6px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Blocos</p>
      {props.items.map((item: any, index: number) => {
        const Icon = item.icon;
        return (
          <button key={item.title} onClick={() => props.command(item)} onMouseEnter={() => setSelectedIndex(index)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: index === selectedIndex ? 'rgba(217,72,15,0.15)' : 'transparent', color: index === selectedIndex ? '#d9480f' : 'rgba(255,255,255,0.85)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}>
            <Icon size={15} style={{ flexShrink: 0, opacity: 0.85 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5 }}>{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});
SlashMenuList.displayName = 'SlashMenuList';

// ─── Mention dropdown component ────────────────────────────────────────────

interface MentionItem { id: string; label: string; type: 'client' | 'user'; avatar?: string }

const MentionList = forwardRef<any, any>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp')   { setSelectedIndex(i => (i - 1 + props.items.length) % props.items.length); return true; }
      if (event.key === 'ArrowDown') { setSelectedIndex(i => (i + 1) % props.items.length); return true; }
      if (event.key === 'Enter')     { props.command(props.items[selectedIndex]); return true; }
      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);
  if (!props.items.length) return null;

  const clients = (props.items as MentionItem[]).filter(i => i.type === 'client');
  const users   = (props.items as MentionItem[]).filter(i => i.type === 'user');

  const renderItem = (item: MentionItem, globalIdx: number) => (
    <button
      key={item.id}
      onClick={() => props.command(item)}
      onMouseEnter={() => setSelectedIndex(globalIdx)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 10px', borderRadius: '8px', border: 'none', background: globalIdx === selectedIndex ? 'rgba(217,72,15,0.15)' : 'transparent', color: 'white', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
    >
      {item.avatar ? (
        <img src={item.avatar} alt={item.label} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.type === 'client' ? 'rgba(217,72,15,0.2)' : 'rgba(100,100,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {item.type === 'client' ? <Building2 size={12} color="#d9480f" /> : <User size={12} color="#8888ff" />}
        </div>
      )}
      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</span>
    </button>
  );

  return (
    <div style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '220px', maxHeight: '300px', overflowY: 'auto' }}>
      {clients.length > 0 && (
        <>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: '2px 8px 4px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Clientes</p>
          {clients.map(item => renderItem(item, props.items.indexOf(item)))}
        </>
      )}
      {users.length > 0 && (
        <>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: clients.length ? '8px 8px 4px' : '2px 8px 4px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Equipe</p>
          {users.map(item => renderItem(item, props.items.indexOf(item)))}
        </>
      )}
    </div>
  );
});
MentionList.displayName = 'MentionList';

// ─── File block node ───────────────────────────────────────────────────────

const FileNodeView = ({ node }: { node: any }) => {
  const { url, name, size } = node.attrs as { url: string; name: string; size: number };
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';

  return (
    <NodeViewWrapper>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={name}
        contentEditable={false}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', padding: '10px 16px', margin: '6px 0',
          textDecoration: 'none', color: 'white', cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          maxWidth: '420px', userSelect: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(217,72,15,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(217,72,15,0.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(217,72,15,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileDown size={17} color="#d9480f" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>{name}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{ext} · {fmtSize(size)}</div>
        </div>
      </a>
    </NodeViewWrapper>
  );
};

const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      url:  { default: null },
      name: { default: 'arquivo' },
      size: { default: 0 },
    };
  },
  parseHTML()  { return [{ tag: 'div[data-type="file-block"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', { ...HTMLAttributes, 'data-type': 'file-block' }]; },
  addNodeView() { return ReactNodeViewRenderer(FileNodeView); },
});

// ─── Utility: mount a ReactRenderer into a floating div ───────────────────

function mountFloating(Component: any, props: any): { el: HTMLDivElement; renderer: ReactRenderer; update: (p: any) => void; destroy: () => void } {
  const renderer = new ReactRenderer(Component, { props, editor: props.editor });
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;z-index:9999;';
  document.body.appendChild(el);
  el.appendChild(renderer.element);

  const position = (clientRect: (() => DOMRect | null) | null) => {
    const rect = clientRect?.();
    if (rect) {
      el.style.top  = `${Math.min(rect.bottom + 6, window.innerHeight - 360)}px`;
      el.style.left = `${Math.max(rect.left, 8)}px`;
    }
  };

  return {
    el,
    renderer,
    update: (p: any) => { renderer.updateProps(p); position(p.clientRect); },
    destroy: () => { el.remove(); renderer.destroy(); },
  };
}

// ─── Slash extension ───────────────────────────────────────────────────────

const SlashExtension = Extension.create({
  name: 'slash',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }: any) => props.command({ editor, range }),
        items: ({ query }: { query: string }) =>
          SLASH_ITEMS.filter(i => i.title.toLowerCase().includes(query.toLowerCase()) || i.description.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let popup: ReturnType<typeof mountFloating>;
          return {
            onStart:   (p: any) => { popup = mountFloating(SlashMenuList, p); popup.update(p); },
            onUpdate:  (p: any) => popup.update(p),
            onKeyDown: (p: any) => { if (p.event.key === 'Escape') { popup.destroy(); return true; } return (popup.renderer.ref as any)?.onKeyDown(p) ?? false; },
            onExit:    ()       => popup.destroy(),
          };
        },
      }),
    ];
  },
});

// ─── Mention extension config ──────────────────────────────────────────────

const MentionConfig = MentionExtension.configure({
  HTMLAttributes: { class: 'editor-mention' },
  renderLabel: ({ node }) => `@${node.attrs.label}`,
  suggestion: {
    items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
      const q = query.toLowerCase();
      const [clientsRes, usersRes] = await Promise.all([
        supabase.from('clients').select('id, name, nome_fantasia').order('name').limit(20),
        supabase.from('users').select('id, name, avatar_url').order('name').limit(20),
      ]);
      const clients: MentionItem[] = (clientsRes.data ?? [])
        .map((c: any) => ({ id: c.id, label: c.nome_fantasia || c.name, type: 'client' as const }))
        .filter(c => c.label.toLowerCase().includes(q));
      const users: MentionItem[] = (usersRes.data ?? [])
        .map((u: any) => ({ id: u.id, label: u.name, type: 'user' as const, avatar: u.avatar_url }))
        .filter(u => u.label.toLowerCase().includes(q));
      return [...clients, ...users].slice(0, 10);
    },
    render: () => {
      let popup: ReturnType<typeof mountFloating>;
      return {
        onStart:   (p: any) => { popup = mountFloating(MentionList, p); popup.update(p); },
        onUpdate:  (p: any) => popup.update(p),
        onKeyDown: (p: any) => { if (p.event.key === 'Escape') { popup.destroy(); return true; } return (popup.renderer.ref as any)?.onKeyDown(p) ?? false; },
        onExit:    ()       => popup.destroy(),
      };
    },
  },
});

// ─── BlockEditor component ─────────────────────────────────────────────────

interface BlockEditorProps {
  content?: any;
  onChange?: (content: any) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function BlockEditor({
  content,
  onChange,
  placeholder = "Escreva, pressione '/' para blocos ou '@' para mencionar...",
  editable = true,
}: BlockEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const pendingEditor = useRef<any>(null);
  const pendingRange  = useRef<any>(null);
  const [uploading, setUploading] = useState(false);

  // Register upload triggers for slash commands
  useEffect(() => {
    _uploadTrigger.image = (editor, range) => {
      pendingEditor.current = editor;
      pendingRange.current  = range;
      imageInputRef.current?.click();
    };
    _uploadTrigger.file = (editor, range) => {
      pendingEditor.current = editor;
      pendingRange.current  = range;
      fileInputRef.current?.click();
    };
    return () => {
      _uploadTrigger.image = null;
      _uploadTrigger.file  = null;
    };
  }, []);

  const readAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingEditor.current) return;
    setUploading(true);
    try {
      // Try Supabase Storage first; fall back to base64 if unavailable
      let src: string;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${authData.user.id}/images/${Date.now()}-${safe}`;
          const { error: upErr } = await supabase.storage.from('notes-attachments').upload(path, file, { upsert: false });
          if (!upErr) {
            src = supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;
          } else {
            src = await readAsBase64(file);
          }
        } else {
          src = await readAsBase64(file);
        }
      } catch {
        src = await readAsBase64(file);
      }
      pendingEditor.current
        ?.chain()
        .focus()
        .deleteRange(pendingRange.current)
        .setImage({ src, alt: file.name })
        .run();
    } catch (err) {
      console.error('Image insert error:', err);
    } finally {
      setUploading(false);
      pendingEditor.current = null;
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingEditor.current) return;
    setUploading(true);
    try {
      let url: string;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${authData.user.id}/files/${Date.now()}-${safe}`;
          const { error: upErr } = await supabase.storage.from('notes-attachments').upload(path, file, { upsert: false });
          if (!upErr) {
            url = supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;
          } else {
            url = await readAsBase64(file);
          }
        } else {
          url = await readAsBase64(file);
        }
      } catch {
        url = await readAsBase64(file);
      }
      pendingEditor.current
        ?.chain()
        .focus()
        .deleteRange(pendingRange.current)
        .insertContent({ type: 'fileBlock', attrs: { url, name: file.name, size: file.size } })
        .run();
    } catch (err) {
      console.error('File insert error:', err);
    } finally {
      setUploading(false);
      pendingEditor.current = null;
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExtension.configure({
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
        resize: {
          enabled: true,
          minWidth: 80,
          minHeight: 60,
          alwaysPreserveAspectRatio: false,
        },
      }),
      FileBlock,
      SlashExtension,
      MentionConfig,
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    editorProps: {
      attributes: { class: 'block-editor-content' },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // Detect dynamic markdown formatting markers
        const hasMarkdown =
          /^#+\s/m.test(text) ||
          /^[-*]\s/m.test(text) ||
          /^\d+\.\s/m.test(text) ||
          /^>\s/m.test(text) ||
          /^```/m.test(text) ||
          /\*\*([^*]+)\*\*/.test(text) ||
          /~~([^~]+)~~/.test(text) ||
          /`([^`]+)`/.test(text) ||
          /\[([^\]]+)\]\(([^)]+)\)/.test(text);

        if (hasMarkdown) {
          const html = parseMarkdownToHTML(text);
          if (html) {
            const { schema } = view.state;
            const parser = DOMParser.fromSchema(schema);
            const dom = document.createElement('div');
            dom.innerHTML = html;
            const slice = parser.parseSlice(dom);
            const transaction = view.state.tr.replaceSelection(slice);
            view.dispatch(transaction);
            return true;
          }
        }
        return false;
      }
    },
  });

  useEffect(() => { if (editor) editor.setEditable(editable); }, [editor, editable]);

  return (
    <div style={{ position: 'relative' }}>
      {uploading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', gap: '10px', color: 'white', fontSize: '0.9rem' }}>
          <Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          Enviando...
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelected} />
      <input ref={fileInputRef}  type="file" accept="*/*"     style={{ display: 'none' }} onChange={handleFileSelected} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .block-editor-content { outline: none; min-height: 260px; color: white; font-size: 1rem; line-height: 1.8; }
        .block-editor-content > * + * { margin-top: 4px; }
        .block-editor-content p { margin: 0; }
        .block-editor-content h1 { font-size: 1.9rem; font-weight: 700; margin: 20px 0 6px; }
        .block-editor-content h2 { font-size: 1.4rem; font-weight: 600; margin: 16px 0 4px; }
        .block-editor-content h3 { font-size: 1.15rem; font-weight: 600; margin: 12px 0 4px; }
        .block-editor-content ul, .block-editor-content ol { padding-left: 22px; margin: 6px 0; }
        .block-editor-content li { margin: 3px 0; }
        .block-editor-content blockquote { border-left: 3px solid #d9480f; margin: 10px 0; padding: 8px 16px; background: rgba(217,72,15,0.06); border-radius: 0 8px 8px 0; color: rgba(255,255,255,0.65); }
        .block-editor-content pre { background: rgba(0,0,0,0.45); border-radius: 8px; padding: 14px 16px; margin: 10px 0; overflow-x: auto; }
        .block-editor-content pre code { color: #e2e8f0; font-family: monospace; font-size: 0.875rem; background: none; padding: 0; }
        .block-editor-content :not(pre) > code { background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 0.875em; font-family: monospace; }
        .block-editor-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 18px 0; }
        .block-editor-content ul[data-type="taskList"] { list-style: none; padding: 0; }
        .block-editor-content ul[data-type="taskList"] > li { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0; }
        .block-editor-content ul[data-type="taskList"] > li > label { margin-top: 3px; }
        .block-editor-content ul[data-type="taskList"] > li > label input[type="checkbox"] { accent-color: #d9480f; width: 15px; height: 15px; cursor: pointer; }
        .block-editor-content ul[data-type="taskList"] > li > div { flex: 1; }
        .block-editor-content ul[data-type="taskList"] > li[data-checked="true"] > div { opacity: 0.5; text-decoration: line-through; }
        .block-editor-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: rgba(255,255,255,0.28); pointer-events: none; height: 0; }
        .block-editor-content strong { font-weight: 700; }
        .block-editor-content em { font-style: italic; }
        .block-editor-content s { text-decoration: line-through; opacity: 0.6; }
        .editor-mention { background: rgba(217,72,15,0.18); color: #d9480f; border-radius: 5px; padding: 1px 6px; font-weight: 600; cursor: default; display: inline-block; }
        .editor-image { max-width: 100%; border-radius: 10px; display: block; cursor: default; }

        /* Resize container */
        [data-resize-container] { margin: 10px 0; max-width: 100%; }
        [data-resize-wrapper] { display: inline-block !important; position: relative; }

        /* Resize handles — shown on hover */
        [data-resize-handle] {
          width: 10px; height: 10px;
          background: white; border: 2px solid #d9480f; border-radius: 50%;
          z-index: 20; opacity: 0; transition: opacity 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
        }
        [data-resize-container]:hover [data-resize-handle] { opacity: 1; }
        [data-resize-handle="top-left"]     { cursor: nw-resize; transform: translate(-50%, -50%); }
        [data-resize-handle="top-right"]    { cursor: ne-resize; transform: translate(50%, -50%);  }
        [data-resize-handle="bottom-left"]  { cursor: sw-resize; transform: translate(-50%, 50%);  }
        [data-resize-handle="bottom-right"] { cursor: se-resize; transform: translate(50%, 50%);   }

        /* Selected image */
        [data-resize-container]:has(img.ProseMirror-selectednode) [data-resize-handle] { opacity: 1; }
        [data-resize-container]:has(img.ProseMirror-selectednode) [data-resize-wrapper] { outline: 2px solid rgba(217,72,15,0.6); outline-offset: 2px; border-radius: 10px; }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );
}

function parseMarkdownToHTML(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const htmlLines: string[] = [];
  
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];
  
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  
  let listType: 'ul' | 'ol' | 'taskList' | null = null;
  
  const closeList = () => {
    if (listType === 'ul') {
      htmlLines.push('</ul>');
    } else if (listType === 'ol') {
      htmlLines.push('</ol>');
    } else if (listType === 'taskList') {
      htmlLines.push('</ul>');
    }
    listType = null;
  };
  
  const closeBlockquote = () => {
    if (inBlockquote) {
      htmlLines.push(`<blockquote>${blockquoteLines.map(line => parseInline(line)).join('<br />')}</blockquote>`);
      inBlockquote = false;
      blockquoteLines = [];
    }
  };
  
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
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return escaped;
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
      closeList();
      closeBlockquote();
      inCodeBlock = true;
      codeBlockLang = line.trim().slice(3).trim();
      continue;
    }
    
    if (line.startsWith('>')) {
      closeList();
      inBlockquote = true;
      const content = line.slice(1).trim();
      blockquoteLines.push(content);
      continue;
    } else {
      closeBlockquote();
    }
    
    if (/^(?:---|===|\*\*\*|___)$/.test(line.trim())) {
      closeList();
      htmlLines.push('<hr />');
      continue;
    }
    
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      htmlLines.push(`<h${level}>${parseInline(content)}</h${level}>`);
      continue;
    }
    
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (listType !== 'taskList') {
        closeList();
        listType = 'taskList';
        htmlLines.push('<ul data-type="taskList">');
      }
      const checked = taskMatch[1].toLowerCase() === 'x';
      const content = taskMatch[2];
      htmlLines.push(`<li data-checked="${checked}"><label><input type="checkbox" ${checked ? 'checked' : ''} /></label><div>${parseInline(content)}</div></li>`);
      continue;
    }
    
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        htmlLines.push('<ul>');
      }
      const content = ulMatch[1];
      htmlLines.push(`<li>${parseInline(content)}</li>`);
      continue;
    }
    
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        htmlLines.push('<ol>');
      }
      const content = olMatch[2];
      htmlLines.push(`<li>${parseInline(content)}</li>`);
      continue;
    }
    
    if (line.trim() === '') {
      closeList();
      continue;
    }
    
    closeList();
    htmlLines.push(`<p>${parseInline(line)}</p>`);
  }
  
  closeList();
  closeBlockquote();
  
  return htmlLines.join('\n');
}
