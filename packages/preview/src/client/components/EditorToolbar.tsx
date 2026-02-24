import { Fragment } from 'react'
import type { Editor } from '@tiptap/react'

interface Props {
  editor: Editor
  dirty: boolean
  saving: boolean
  onSave: () => void
}

interface ToolBtn {
  label: string
  title: string
  action: () => void
  active?: boolean
}

export function EditorToolbar({ editor, dirty, saving, onSave }: Props) {
  const btn = (label: string, title: string, action: () => void, active = false): ToolBtn =>
    ({ label, title, action, active })

  const buttons: ToolBtn[] = [
    btn('B', 'Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')),
    btn('I', 'Italic', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')),
    btn('S\u0336', 'Strikethrough', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike')),
  ]

  const headingBtns: ToolBtn[] = [1, 2, 3].map(level =>
    btn(`H${level}`, `Heading ${level}`,
      () => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run(),
      editor.isActive('heading', { level }))
  )

  const listBtns: ToolBtn[] = [
    btn('\u2022 \u2014', 'Bullet list', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')),
    btn('1. \u2014', 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')),
  ]

  const miscBtns: ToolBtn[] = [
    btn('\u201C', 'Blockquote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')),
    btn('`', 'Inline code', () => editor.chain().focus().toggleCode().run(), editor.isActive('code')),
    btn('```', 'Code block', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock')),
    btn('\uD83D\uDD17', 'Link', () => {
      const url = window.prompt('URL:')
      if (url) editor.chain().focus().setLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    }, editor.isActive('link')),
    btn('\u2014', 'Horizontal rule', () => editor.chain().focus().setHorizontalRule().run()),
  ]

  const allGroups = [buttons, headingBtns, listBtns, miscBtns]

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800 bg-zinc-900 flex-wrap">
      {allGroups.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <div className="w-px h-4 bg-zinc-700 mx-1" />}
          {group.map(({ label, title, action, active }) => (
            <button
              key={title}
              title={title}
              onClick={action}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                active
                  ? 'bg-zinc-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </Fragment>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Dirty indicator + Save */}
      {dirty && (
        <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" title="Unsaved changes" />
      )}
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className="px-3 py-0.5 rounded text-xs bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Save (Cmd+S)"
      >
        {saving ? 'Saving\u2026' : 'Save'}
      </button>
    </div>
  )
}
