# Phase 4: Tiptap Editor + Toolbar

## Context Links
- Plan: [plan.md](./plan.md)
- Phase 3: [phase-03-react-frontend-tree.md](./phase-03-react-frontend-tree.md)
- Phase 2 API: `PUT /api/files?path=` + `use-save-file` hook
- Research: [researcher-01-tiptap-tailwind.md](./research/researcher-01-tiptap-tailwind.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Depends on:** Phase 3 (TiptapEditor placeholder exists, App.tsx wired)

Replace the `TiptapEditor` and `EditorToolbar` placeholders with full Tiptap v3 implementation. Editor loads markdown via `tiptap-markdown`, saves via `PUT /api/files`, supports Cmd+S, shows dirty indicator.

## Key Insights
- `tiptap-markdown` (npm) is the community package — NOT `@tiptap/extension-markdown` (pro/cloud only)
- `tiptap-markdown` exports a `Markdown` extension; set `html: false` to stay markdown-native
- `key={filePath}` on `<TiptapEditor>` (already set in App.tsx) ensures full remount on file switch — avoids stale editor state
- Readonly: pass `editable: false` to `useEditor`; Tiptap disables all input
- Dirty detection: compare editor markdown output to initial `content` prop on each `onUpdate`
- Save: call `editor.storage.markdown.getMarkdown()` to serialize back to markdown
- Confirm-on-switch: handled in `App.tsx` via `onSelect` guard when `dirty === true`
- Toolbar buttons use `editor.chain().focus()` commands — standard Tiptap pattern
- Link: prompt for URL via `window.prompt` (KISS — no modal library)
- `StarterKit` includes: bold, italic, strike, headings, bullet/ordered lists, blockquote, code, codeBlock, hardBreak, horizontalRule, paragraph, history

## Requirements

### Functional
- Load markdown content into editor on mount
- Edit produces WYSIWYG markdown rendering (Tiptap + prose classes)
- Toolbar: Bold, Italic, Strike, H1, H2, H3, Bullet list, Ordered list, Blockquote, Code (inline), Code block, Link, HR, Save
- Save via Cmd+S (Mac) / Ctrl+S (Win/Linux)
- Save button in toolbar triggers PUT + shows saving state
- Dirty dot indicator (unsaved changes) next to filename or in toolbar
- Confirm dialog when switching files with unsaved changes
- Readonly mode: no toolbar, no editing, cursor text

### Non-functional
- Editor area styled with `prose prose-invert` — typography matches Tailwind prose
- No external modal/dialog library — use `window.confirm`
- Tiptap v3 stable (3.20.0 at research time) — verify latest at install time

## Architecture

```
src/client/
├── components/
│   ├── TiptapEditor.tsx     ← useEditor + Markdown ext + onUpdate dirty detection
│   └── EditorToolbar.tsx    ← toolbar buttons using editor.chain() commands
└── App.tsx                  ← guard onSelect with dirty confirm + pass onDirty callback
```

Only these two components are replaced/extended. `use-save-file` hook already created in Phase 3.

## Files to Modify / Replace

### Replace (full rewrite of placeholders)
- `src/client/components/TiptapEditor.tsx`
- `src/client/components/EditorToolbar.tsx`

### Modify
- `src/client/App.tsx` — add dirty state, confirm-on-switch guard

## Implementation Steps

### 1. Install Tiptap packages
```bash
cd packages/preview
npm install @tiptap/react@^3.0.0 @tiptap/pm@^3.0.0 @tiptap/starter-kit@^3.0.0 @tiptap/extension-link@^3.0.0 tiptap-markdown@^0.8.10
```

> Verify actual latest: `npm info @tiptap/react version` before pinning.
> `tiptap-markdown` may need `--legacy-peer-deps` if Tiptap v3 peer deps are strict — check at install time.

### 2. Create src/client/components/TiptapEditor.tsx
```tsx
import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import { EditorToolbar } from './EditorToolbar.js'
import { useSaveFile } from '../hooks/use-save-file.js'

interface Props {
  path: string
  content: string             // markdown body (frontmatter already stripped)
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
      const current = e.storage.markdown.getMarkdown() as string
      const isDirty = current !== initialRef.current
      setDirty(isDirty)
      onDirty?.(isDirty)
    },
  })

  // Keyboard shortcut: Cmd+S / Ctrl+S
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, dirty])

  async function handleSave() {
    if (!editor || !dirty) return
    const markdown = editor.storage.markdown.getMarkdown() as string
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
```

### 3. Create src/client/components/EditorToolbar.tsx
```tsx
import React from 'react'
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
    btn('S̶', 'Strikethrough', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike')),
  ]

  const headingBtns: ToolBtn[] = [1, 2, 3].map(level =>
    btn(`H${level}`, `Heading ${level}`,
      () => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run(),
      editor.isActive('heading', { level }))
  )

  const listBtns: ToolBtn[] = [
    btn('• —', 'Bullet list', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList')),
    btn('1. —', 'Ordered list', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList')),
  ]

  const miscBtns: ToolBtn[] = [
    btn('"', 'Blockquote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')),
    btn('`', 'Inline code', () => editor.chain().focus().toggleCode().run(), editor.isActive('code')),
    btn('```', 'Code block', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock')),
    btn('🔗', 'Link', () => {
      const url = window.prompt('URL:')
      if (url) editor.chain().focus().setLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    }, editor.isActive('link')),
    btn('—', 'Horizontal rule', () => editor.chain().focus().setHorizontalRule().run()),
  ]

  const allGroups = [buttons, headingBtns, listBtns, miscBtns]

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800 bg-zinc-900 flex-wrap">
      {allGroups.map((group, gi) => (
        <React.Fragment key={gi}>
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
        </React.Fragment>
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
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
```

### 4. Update src/client/App.tsx — dirty confirm guard
Add dirty state tracking and confirm-on-switch:

```tsx
// In App.tsx — extend existing state:
const [dirty, setDirty] = useState(false)

// Replace onSelect handler:
function handleSelect(path: string) {
  if (dirty && path !== activePath) {
    if (!window.confirm('You have unsaved changes. Switch files anyway?')) return
  }
  setDirty(false)
  setActivePath(path)
}

// Pass onDirty to TiptapEditor:
<TiptapEditor
  key={file.path}
  path={file.path}
  content={file.content}
  readonly={readonly}
  onDirty={setDirty}
/>
```

### 5. Add prose CSS overrides for editor focus ring removal
In `globals.css`, add:
```css
/* Remove Tiptap default focus outline — handled by container */
.ProseMirror { outline: none; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: theme(colors.zinc.600);
  pointer-events: none;
  float: left;
  height: 0;
}
```

### 6. Compile + smoke test
```bash
npm run build
node dist/server.js --docs <test-docs-dir> --no-open
# Open http://localhost:4983
# - Click a file → editor renders markdown as rich text
# - Edit text → dirty dot appears
# - Cmd+S → file saved, dot disappears
# - Click another file with unsaved → confirm dialog appears
```

## Todo List
- [ ] `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link tiptap-markdown`
- [ ] Verify no peer dep errors (check `npm ls @tiptap/react`)
- [ ] Replace src/client/components/TiptapEditor.tsx with full implementation
- [ ] Replace src/client/components/EditorToolbar.tsx with full implementation
- [ ] Update src/client/App.tsx with dirty state + handleSelect guard
- [ ] Add ProseMirror CSS overrides to globals.css
- [ ] `npm run build` — zero errors
- [ ] Manual: edit → dirty dot → Cmd+S → saves → dot gone
- [ ] Manual: unsaved → click other file → confirm dialog blocks navigation

## Success Criteria
- Markdown content renders as rich text (bold, headings, lists, blockquote visible)
- All toolbar buttons functional — formatting applied + active state reflects editor state
- Dirty indicator (amber dot) appears on edit, disappears after save
- Cmd+S triggers save; Save button disabled when not dirty
- Switching files with unsaved changes shows `window.confirm`
- Readonly mode: no toolbar, editor non-editable (no cursor, no input)
- `tiptap-markdown` round-trips markdown correctly (load → edit → save → reload = same content)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `tiptap-markdown` peer dep conflict with Tiptap v3 | Medium | High | Check `npm ls` after install; `--legacy-peer-deps` if needed; pin compatible versions |
| Markdown round-trip loses frontmatter | Low | High | Frontmatter stripped server-side on GET, reattached server-side on PUT — editor never sees it |
| `editor.storage.markdown` undefined on first render | Low | Medium | Guard with `if (!editor)` before accessing; null check in handleSave |
| Link prompt (window.prompt) blocked in some browsers | Very Low | Low | KISS choice; document; upgrade to modal in future if needed |
| Tiptap v3 API changes from research snapshot | Low | Medium | Verify against `node_modules/@tiptap/react/README.md` at impl time |

## Security Considerations
- No `dangerouslySetInnerHTML` — Tiptap renders via ProseMirror DOM, not raw HTML injection
- Link `href` values set via Tiptap's `setLink` — sanitized by Tiptap's link extension
- `html: false` in `tiptap-markdown` prevents raw HTML blocks in markdown from rendering as DOM
- Content saved via `PUT /api/files` which is guarded by `safePath()` + guide-mode 403

## Next Steps
- Phase 5: Guide mode sets `readonly=true` based on `system.mode`; already wired in App.tsx
- Phase 6: E2E test covers save + round-trip + readonly guard
