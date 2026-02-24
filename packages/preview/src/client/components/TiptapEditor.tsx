import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { EditorToolbar } from './EditorToolbar.js'
import { BubbleToolbar } from './bubble-toolbar.js'
import { SlashMenuExtension } from './slash-menu.js'
import { CodeBlockView } from './code-block-view.js'
import { NextPrevNav } from './next-prev-nav.js'
import { useSaveFile } from '../hooks/use-save-file.js'
import type { FlatFile } from '../hooks/use-flat-tree.js'

const lowlight = createLowlight(common)

const TOOLBAR_KEY = 'sekkei-toolbar-visible'

interface Props {
  path: string
  content: string
  readonly?: boolean
  onDirty?: (dirty: boolean) => void
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  flatTree?: FlatFile[]
  onSelect?: (path: string) => void
  onEditorReady?: (editor: Editor, scrollContainer: HTMLElement | null) => void
}

/** Rewrite relative image paths to /docs-assets/ route */
function rewriteImagePaths(md: string, filePath: string): string {
  const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : ''
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return _match
    const resolved = dir ? `${dir}/${src}` : src
    return `![${alt}](/docs-assets/${resolved})`
  })
}

function useMediaQuery(maxWidth: number) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < maxWidth : false,
  )
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [maxWidth])
  return matches
}

/* ── MiniBar (shown when toolbar hidden) ── */
function MiniBar({ dirty, saving, onSave, onToggle, chars, words }: {
  dirty: boolean; saving: boolean; onSave: () => void; onToggle: () => void
  chars: number; words: number
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--c-divider)] bg-[var(--c-bg-soft)]">
      <button
        onClick={onToggle}
        title="Show toolbar (Cmd+Shift+T)"
        className="text-[var(--c-text-3)] hover:text-[var(--c-text-1)] text-xs px-1.5 py-1 rounded-md hover:bg-[var(--c-bg-alt)] transition-all"
      >
        {'\u2630'}
      </button>
      <div className="flex-1" />
      <span className="text-[10px] text-[var(--c-text-4)] hidden sm:inline tabular-nums">{words}w / {chars}c</span>
      {dirty && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />}
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Save (Cmd+S)"
      >
        {saving ? 'Saving\u2026' : 'Save'}
      </button>
    </div>
  )
}

export function TiptapEditor({ path, content, readonly = false, onDirty, fullscreen, onToggleFullscreen, flatTree, onSelect, onEditorReady }: Props) {
  const initialRef = useRef(content)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dirty, setDirty] = useState(false)
  const { save, saving } = useSaveFile()
  const isMobile = useMediaQuery(768)

  const [toolbarVisible, setToolbarVisible] = useState(() => {
    try { return localStorage.getItem(TOOLBAR_KEY) !== 'false' }
    catch { return true }
  })

  const toggleToolbar = useCallback(() => {
    setToolbarVisible((v) => {
      const next = !v
      try { localStorage.setItem(TOOLBAR_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const showToolbar = isMobile || toolbarVisible

  const processedContent = rewriteImagePaths(content, path)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: true, allowBase64: true }),
      Markdown.configure({ html: false, transformPastedText: true }),
      Table.configure({ resizable: false, HTMLAttributes: { class: 'tiptap-table' } }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView)
        },
      }).configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing\u2026' }),
      Subscript,
      Superscript,
      Typography,
      CharacterCount,
      SlashMenuExtension,
    ],
    content: processedContent,
    editable: !readonly,
    onUpdate({ editor: e }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (e.storage as any).markdown.getMarkdown() as string
      const isDirty = current !== initialRef.current
      setDirty(isDirty)
      onDirty?.(isDirty)
    },
  })

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor, scrollRef.current)
    }
  }, [editor, onEditorReady])

  const handleSave = useCallback(async () => {
    if (!editor || !dirty) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdown = (editor.storage as any).markdown.getMarkdown() as string
    const ok = await save(path, markdown)
    if (ok) {
      initialRef.current = markdown
      setDirty(false)
      onDirty?.(false)
    }
  }, [editor, dirty, path, onDirty, save])

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Keyboard shortcuts: Cmd+S (save) and Cmd+Shift+T (toggle toolbar)
  useEffect(() => {
    if (!editor || readonly) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        toggleToolbar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, readonly, toggleToolbar])

  if (!editor) return null

  const charCount = editor.storage.characterCount
  const chars = charCount?.characters?.() ?? 0
  const words = charCount?.words?.() ?? 0

  return (
    <div className="flex flex-col h-full">
      {!readonly && showToolbar && (
        <div className="toolbar-enter">
          <EditorToolbar
            editor={editor}
            dirty={dirty}
            saving={saving}
            onSave={handleSave}
            fullscreen={fullscreen}
            onToggleFullscreen={onToggleFullscreen}
            onToggleToolbar={toggleToolbar}
            chars={chars}
            words={words}
          />
        </div>
      )}
      {!readonly && !showToolbar && (
        <MiniBar
          dirty={dirty}
          saving={saving}
          onSave={handleSave}
          onToggle={toggleToolbar}
          chars={chars}
          words={words}
        />
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose max-w-4xl mx-auto px-8 py-10 min-h-full focus:outline-none"
        />
        {!readonly && <BubbleToolbar editor={editor} />}
        {flatTree && flatTree.length > 1 && onSelect && (
          <div className="max-w-4xl mx-auto">
            <NextPrevNav flatTree={flatTree} currentPath={path} onSelect={onSelect} />
          </div>
        )}
      </div>
    </div>
  )
}
