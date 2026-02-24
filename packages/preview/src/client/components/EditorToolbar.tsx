import { Fragment, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface Props {
  editor: Editor
  dirty: boolean
  saving: boolean
  onSave: () => void
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  chars?: number
  words?: number
}

interface ToolBtn {
  label: string
  title: string
  action: () => void
  active?: boolean
}

export function EditorToolbar({ editor, dirty, saving, onSave, fullscreen, onToggleFullscreen, chars = 0, words = 0 }: Props) {
  const [showTableMenu, setShowTableMenu] = useState(false)
  const inTable = editor.isActive('table')

  const btn = (label: string, title: string, action: () => void, active = false): ToolBtn =>
    ({ label, title, action, active })

  /* ── History ── */
  const historyBtns: ToolBtn[] = [
    btn('\u21A9', 'Undo (Cmd+Z)', () => editor.chain().focus().undo().run()),
    btn('\u21AA', 'Redo (Cmd+Shift+Z)', () => editor.chain().focus().redo().run()),
  ]

  /* ── Format ── */
  const formatBtns: ToolBtn[] = [
    btn('B', 'Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')),
    btn('I', 'Italic', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')),
    btn('U', 'Underline', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline')),
    btn('S\u0336', 'Strikethrough', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike')),
    btn('H', 'Highlight', () => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight')),
    btn('x\u2082', 'Subscript', () => editor.chain().focus().toggleSubscript().run(), editor.isActive('subscript')),
    btn('x\u00B2', 'Superscript', () => editor.chain().focus().toggleSuperscript().run(), editor.isActive('superscript')),
  ]

  /* ── Headings ── */
  const headingBtns: ToolBtn[] = [1, 2, 3].map(level =>
    btn(`H${level}`, `Heading ${level}`,
      () => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run(),
      editor.isActive('heading', { level }))
  )

  /* ── Alignment ── */
  const alignBtns: ToolBtn[] = [
    btn('\u2261', 'Align left', () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' })),
    btn('\u2263', 'Align center', () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' })),
    btn('\u2262', 'Align right', () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' })),
  ]

  /* ── Lists ── */
  const listBtns: ToolBtn[] = [
    btn('\u2022', 'Bullet list', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')),
    btn('1.', 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')),
    btn('\u2611', 'Task list', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList')),
  ]

  /* ── Insert ── */
  const insertBtns: ToolBtn[] = [
    btn('\u201C', 'Blockquote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')),
    btn('`', 'Inline code', () => editor.chain().focus().toggleCode().run(), editor.isActive('code')),
    btn('```', 'Code block', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock')),
    btn('\uD83D\uDD17', 'Link', () => {
      const url = window.prompt('URL:')
      if (url) editor.chain().focus().setLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    }, editor.isActive('link')),
    btn('\uD83D\uDDBC', 'Insert image', () => {
      const url = window.prompt('Image URL:')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    }),
    btn('\u2014', 'Horizontal rule', () => editor.chain().focus().setHorizontalRule().run()),
  ]

  /* ── Table ── */
  const tableBtn: ToolBtn = btn('\u2637', 'Table', () => setShowTableMenu(v => !v), inTable)

  /* ── Clear + Fullscreen ── */
  const utilBtns: ToolBtn[] = [
    btn('\u2718', 'Clear formatting', () => editor.chain().focus().clearNodes().unsetAllMarks().run()),
  ]

  const allGroups = [historyBtns, formatBtns, headingBtns, alignBtns, listBtns, insertBtns]

  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap">
        {allGroups.map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <Divider />}
            {group.map(b => <Btn key={b.title} {...b} />)}
          </Fragment>
        ))}

        <Divider />

        {/* Table with dropdown */}
        <div className="relative">
          <Btn {...tableBtn} />
          {showTableMenu && (
            <TableMenu editor={editor} inTable={inTable} onClose={() => setShowTableMenu(false)} />
          )}
        </div>

        <Divider />
        {utilBtns.map(b => <Btn key={b.title} {...b} />)}

        {onToggleFullscreen && (
          <Btn
            label={fullscreen ? '\u2716' : '\u26F6'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            action={onToggleFullscreen}
            active={fullscreen}
          />
        )}

        <div className="flex-1" />

        {/* Char count */}
        <span className="text-[10px] text-zinc-600 mr-3 hidden sm:inline tabular-nums">
          {words}w / {chars}c
        </span>

        {dirty && (
          <span className="w-2 h-2 rounded-full bg-amber-400 mr-2 animate-pulse" title="Unsaved changes" />
        )}
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Save (Cmd+S)"
        >
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ── Reusable button ── */
function Btn({ label, title, action, active }: ToolBtn) {
  return (
    <button
      title={title}
      onClick={action}
      className={`px-1.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
        active
          ? 'bg-indigo-600/30 text-indigo-300'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50'
      }`}
    >
      {label}
    </button>
  )
}

/* ── Divider ── */
function Divider() {
  return <div className="w-px h-4 bg-zinc-700/50 mx-1" />
}

/* ── Table operations dropdown ── */
function TableMenu({ editor, inTable, onClose }: { editor: Editor; inTable: boolean; onClose: () => void }) {
  const run = (fn: () => void) => { fn(); onClose() }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]">
        {!inTable && (
          <MenuItem label="Insert 3\u00D73 table" onClick={() => run(() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          )} />
        )}
        {inTable && (
          <>
            <MenuItem label="Add row below" onClick={() => run(() => editor.chain().focus().addRowAfter().run())} />
            <MenuItem label="Add row above" onClick={() => run(() => editor.chain().focus().addRowBefore().run())} />
            <MenuItem label="Add column right" onClick={() => run(() => editor.chain().focus().addColumnAfter().run())} />
            <MenuItem label="Add column left" onClick={() => run(() => editor.chain().focus().addColumnBefore().run())} />
            <div className="h-px bg-zinc-700 my-1" />
            <MenuItem label="Delete row" onClick={() => run(() => editor.chain().focus().deleteRow().run())} danger />
            <MenuItem label="Delete column" onClick={() => run(() => editor.chain().focus().deleteColumn().run())} danger />
            <MenuItem label="Delete table" onClick={() => run(() => editor.chain().focus().deleteTable().run())} danger />
            <div className="h-px bg-zinc-700 my-1" />
            <MenuItem label="Toggle header row" onClick={() => run(() => editor.chain().focus().toggleHeaderRow().run())} />
            <MenuItem label="Merge/split cells" onClick={() => run(() => editor.chain().focus().mergeOrSplit().run())} />
          </>
        )}
      </div>
    </>
  )
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-zinc-300 hover:bg-zinc-700/50'
      }`}
    >
      {label}
    </button>
  )
}
