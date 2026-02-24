import type { Editor } from '@tiptap/react'
import type { Range } from '@tiptap/core'

export interface SlashMenuItem {
  title: string
  description: string
  icon: string
  command: (editor: Editor, range: Range) => void
}

export const slashMenuItems: SlashMenuItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '\u2022',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: '\u2611',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: '\u2637',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    title: 'Code Block',
    description: 'Syntax-highlighted code',
    icon: '```',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: 'Mermaid Diagram',
    description: 'Mermaid code block',
    icon: '\u25C7',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'mermaid' }).run()
    },
  },
  {
    title: 'Image',
    description: 'Insert image from URL',
    icon: '\uD83D\uDDBC',
    command: (editor, range) => {
      const url = window.prompt('Image URL:')
      if (url && /^https?:\/\//.test(url)) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      } else {
        editor.chain().focus().deleteRange(range).run()
      }
    },
  },
  {
    title: 'Blockquote',
    description: 'Quote block',
    icon: '\u201C',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: 'Horizontal Rule',
    description: 'Divider line',
    icon: '\u2014',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
]
