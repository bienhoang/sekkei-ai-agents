import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import { EditorToolbar } from './EditorToolbar.js'
import { useSaveFile } from '../hooks/use-save-file.js'

interface Props {
  path: string
  content: string
  readonly?: boolean
  onDirty?: (dirty: boolean) => void
}

export function TiptapEditor({ path, content, readonly = false, onDirty }: Props) {
  const initialRef = useRef(content)
  const [dirty, setDirty] = useState(false)
  const { save, saving } = useSaveFile()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content,
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

  return (
    <div className="flex flex-col h-full">
      {!readonly && (
        <EditorToolbar
          editor={editor}
          dirty={dirty}
          saving={saving}
          onSave={handleSave}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-zinc max-w-3xl mx-auto px-8 py-10 min-h-full focus:outline-none"
        />
      </div>
    </div>
  )
}
