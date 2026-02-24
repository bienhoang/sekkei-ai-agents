import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
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
import { CodeBlockView } from './code-block-view.js'
import { useSaveFile } from '../hooks/use-save-file.js'

const lowlight = createLowlight(common)

interface Props {
  path: string
  content: string
  readonly?: boolean
  onDirty?: (dirty: boolean) => void
  fullscreen?: boolean
  onToggleFullscreen?: () => void
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

export function TiptapEditor({ path, content, readonly = false, onDirty, fullscreen, onToggleFullscreen }: Props) {
  const initialRef = useRef(content)
  const [dirty, setDirty] = useState(false)
  const { save, saving } = useSaveFile()

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
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Subscript,
      Superscript,
      Typography,
      CharacterCount,
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

  useEffect(() => {
    if (!editor || readonly) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor, dirty, readonly])

  async function handleSave() {
    if (!editor || !dirty) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markdown = (editor.storage as any).markdown.getMarkdown() as string
    const ok = await save(path, markdown)
    if (ok) {
      initialRef.current = markdown
      setDirty(false)
      onDirty?.(false)
    }
  }

  if (!editor) return null

  const charCount = editor.storage.characterCount
  const chars = charCount?.characters?.() ?? 0
  const words = charCount?.words?.() ?? 0

  return (
    <div className="flex flex-col h-full">
      {!readonly && (
        <EditorToolbar
          editor={editor}
          dirty={dirty}
          saving={saving}
          onSave={handleSave}
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
          chars={chars}
          words={words}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-zinc max-w-4xl mx-auto px-8 py-10 min-h-full focus:outline-none"
        />
      </div>
    </div>
  )
}
