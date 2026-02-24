import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import type { EditorState } from '@tiptap/pm/state'

interface Props {
  editor: Editor
}

interface BubbleBtn {
  label: string
  title: string
  action: () => void
  active?: boolean
}

export function BubbleToolbar({ editor }: Props) {
  const handleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = window.prompt('URL:')
      if (url && /^https?:\/\//.test(url)) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    }
  }

  const buttons: BubbleBtn[] = [
    { label: 'B', title: 'Bold', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { label: 'I', title: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { label: 'U', title: 'Underline', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
    { label: 'S\u0336', title: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { label: 'H', title: 'Highlight', action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight') },
    { label: '`', title: 'Inline code', action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
    { label: '\uD83D\uDD17', title: 'Link', action: handleLink, active: editor.isActive('link') },
    { label: '\u2718', title: 'Clear formatting', action: () => editor.chain().focus().unsetAllMarks().run() },
  ]

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state }: { editor: Editor; state: EditorState }) => {
        const { from, to } = state.selection
        if (from === to) return false
        if (e.isActive('codeBlock')) return false
        if (e.isActive('image')) return false
        return true
      }}
      className="bubble-toolbar"
    >
      {buttons.map((b) => (
        <button
          key={b.title}
          title={b.title}
          onClick={b.action}
          className={`px-1.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
            b.active
              ? 'bg-[var(--c-brand-soft)] text-indigo-400'
              : 'text-[var(--c-text-2)] hover:text-[var(--c-text-1)] hover:bg-[var(--c-bg-alt)]'
          }`}
        >
          {b.label}
        </button>
      ))}
    </BubbleMenu>
  )
}
