import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { SafeTable } from './table-markdown-serializer.js'
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

/** Resolve a relative src path against the current file's directory */
function resolveAssetPath(src: string, filePath: string): string {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src
  const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : ''
  const resolved = dir ? `${dir}/${src}` : src
  return `/docs-assets/${resolved}`
}

/** Rewrite relative image paths to /docs-assets/ route (markdown + HTML img tags) */
function rewriteImagePaths(md: string, filePath: string): string {
  // Rewrite markdown images: ![alt](src)
  let result = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    return `![${alt}](${resolveAssetPath(src, filePath)})`
  })
  // Convert HTML <img> tags to markdown images (handles <p align="center"><img ...></p> patterns)
  result = result.replace(/<p[^>]*>\s*<img\s+([^>]*)\/?\s*>\s*<\/p>/gi, (_match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/)
    const altMatch = attrs.match(/alt=["']([^"']+)["']/)
    if (!srcMatch) return _match
    return `![${altMatch?.[1] ?? ''}](${resolveAssetPath(srcMatch[1], filePath)})`
  })
  // Also handle standalone <img> tags not wrapped in <p>
  result = result.replace(/<img\s+([^>]*)\/?\s*>/gi, (_match, attrs) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/)
    const altMatch = attrs.match(/alt=["']([^"']+)["']/)
    if (!srcMatch) return _match
    return `![${altMatch?.[1] ?? ''}](${resolveAssetPath(srcMatch[1], filePath)})`
  })
  return result
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
  const initialRef = useRef<string>('')
  const readyRef = useRef(false)
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
      SafeTable.configure({ resizable: false, HTMLAttributes: { class: 'tiptap-table' } }),
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
      if (!readyRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (e.storage as any).markdown.getMarkdown() as string
      const isDirty = current !== initialRef.current
      setDirty(isDirty)
      onDirty?.(isDirty)
    },
  })

  // Capture canonical baseline markdown after editor mounts (accounts for
  // image-path rewriting + Tiptap's markdown round-trip normalization)
  useEffect(() => {
    if (editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRef.current = (editor.storage as any).markdown.getMarkdown() as string
      readyRef.current = true
    }
    return () => { readyRef.current = false }
  }, [editor])

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

  // Handle link clicks: readonly → single click; editing → Cmd/Ctrl+Click
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // In edit mode, require Cmd/Ctrl to follow links
      if (!readonly && !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      // Internal .md link → navigate within app
      if (href.endsWith('.md') || href.includes('.md#')) {
        const mdPath = href.replace(/^\.\//, '')
        const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
        const resolved = dir ? `${dir}/${mdPath}` : mdPath
        onSelect?.(resolved.split('#')[0])
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        window.open(href, '_blank', 'noopener')
      } else if (href.startsWith('#')) {
        // Anchor link — scroll to heading
        const id = href.slice(1)
        const heading = container.querySelector(`[id="${id}"], [data-id="${id}"]`)
        heading?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    container.addEventListener('click', handler)
    return () => container.removeEventListener('click', handler)
  }, [readonly, path, onSelect])

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
