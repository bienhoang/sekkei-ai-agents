# Current Editor Architecture — Sekkei Preview

**Date:** 2026-02-24
**Scope:** `packages/preview/src/client/components/`

---

## 1. TiptapEditor.tsx — Main Editor Component

### Extensions Configured (useEditor)

| Extension | Config |
|---|---|
| `StarterKit` | `codeBlock: false` (replaced by lowlight) |
| `Link` | `openOnClick: false, autolink: true` |
| `Image` | `inline: true, allowBase64: true` |
| `Markdown` (tiptap-markdown) | `html: false, transformPastedText: true` |
| `Table` | `resizable: false`, class `tiptap-table` |
| `TableRow/Cell/Header` | default |
| `CodeBlockLowlight` | custom `NodeViewRenderer(CodeBlockView)`, lowlight common |
| `TaskList` / `TaskItem` | `nested: true` |
| `Underline` / `Highlight` | `multicolor: false` |
| `TextAlign` | types: `heading`, `paragraph` |
| `Placeholder` | `'Start writing…'` |
| `Subscript` / `Superscript` | default |
| `Typography` | default (smart quotes, dashes) |
| `CharacterCount` | default |

### Initialization Pattern

```tsx
const editor = useEditor({
  extensions: [...],
  content: processedContent,  // markdown string after image path rewrite
  editable: !readonly,
  onUpdate({ editor: e }) {
    const current = (e.storage as any).markdown.getMarkdown()
    setDirty(current !== initialRef.current)
  },
})
```

- Content is markdown; `tiptap-markdown` handles parse/serialize
- `initialRef` stores original content for dirty-tracking
- Cmd+S saves via `useSaveFile` hook → `PUT /api/files/:path`
- Image paths rewritten: relative `./img.png` → `/docs-assets/{dir}/img.png`

### Component Layout

```
<div className="flex flex-col h-full">
  {!readonly && <EditorToolbar ... />}   // sticky top bar
  <div className="flex-1 overflow-y-auto">
    <EditorContent                        // prose content area
      className="prose prose-invert prose-zinc max-w-4xl mx-auto px-8 py-10"
    />
  </div>
</div>
```

- Dark prose theme: `prose-invert prose-zinc`
- Content area: `max-w-4xl mx-auto` centered, `overflow-y-auto` scrollable
- `EditorContent` accepts `editor` instance directly

### Toolbar <-> Editor Connection

`TiptapEditor` passes `editor` instance as prop to `EditorToolbar`. All commands call `editor.chain().focus().someCommand().run()` directly — no callback indirection, no context/store.

---

## 2. EditorToolbar.tsx — Current Toolbar

### Button Groups

| Group | Buttons |
|---|---|
| History | Undo (↩), Redo (↪) |
| Format | Bold (B), Italic (I), Underline (U), Strikethrough (S̶), Highlight (H), Subscript (x₂), Superscript (x²) |
| Headings | H1, H2, H3 |
| Alignment | Left (≡), Center (≣), Right (≢) |
| Lists | Bullet (•), Ordered (1.), Task (☑) |
| Insert | Blockquote ("), Inline code (`), Code block (```), Link (🔗), Image (🖼), HR (—) |
| Table | Dropdown toggle (⚷) |
| Util | Clear formatting (✘), Fullscreen toggle (⛶/✖) |

### Command Invocation Pattern

All buttons use a `ToolBtn` interface `{ label, title, action, active }`.

```tsx
const btn = (label, title, action, active = false): ToolBtn => ({ label, title, action, active })
// Example:
btn('B', 'Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))
```

- `active` drives CSS: `bg-indigo-600/30 text-indigo-300` vs `text-zinc-400 hover:bg-zinc-700/50`
- Groups rendered via `allGroups.map()` with `<Divider />` between groups
- Table dropdown: local `showTableMenu` state, renders `<TableMenu>` positioned `absolute top-full`
- Link/Image insert: uses `window.prompt()` — no modal component

### Styling Approach

- **All Tailwind 4** — dark theme only (`zinc-900/80` bg, `backdrop-blur-sm`)
- `Btn` component: `px-1.5 py-1 rounded-md text-xs font-mono`
- Active state: indigo highlight (`bg-indigo-600/30 text-indigo-300`)
- Save button: `bg-indigo-600` with `disabled:opacity-30`
- Dirty indicator: `w-2 h-2 rounded-full bg-amber-400 animate-pulse`
- Char/word count: `text-[10px] text-zinc-600 tabular-nums hidden sm:inline`
- No Japanese strings — all labels are Unicode symbols or English

---

## 3. package.json — Dependencies

### Tiptap Packages (all v3.x, in devDependencies)

```
@tiptap/react ^3.0.0
@tiptap/starter-kit ^3.0.0
@tiptap/pm ^3.0.0
@tiptap/extension-character-count ^3.20.0
@tiptap/extension-code-block-lowlight ^3.20.0
@tiptap/extension-highlight ^3.20.0
@tiptap/extension-image ^3.20.0
@tiptap/extension-link ^3.0.0
@tiptap/extension-placeholder ^3.20.0
@tiptap/extension-subscript ^3.20.0
@tiptap/extension-superscript ^3.20.0
@tiptap/extension-table ^3.20.0
@tiptap/extension-table-cell/header/row ^3.20.0
@tiptap/extension-task-item/list ^3.20.0
@tiptap/extension-text-align ^3.20.0
@tiptap/extension-typography ^3.20.0
@tiptap/extension-underline ^3.20.0
```

**Missing for Notion-UX additions:**
- `@tiptap/extension-drag-handle-react` — not installed
- `@tiptap/extension-slash-commands` — not installed (may need custom)
- `@tiptap/extension-color` — not installed
- `@tiptap/extension-font-family` — not installed

### Other Key Deps

- React 18.3, ReactDOM 18.3
- Tailwind CSS 4.0 + `@tailwindcss/typography` 0.5 + `@tailwindcss/vite`
- `tiptap-markdown` 0.8.10 (markdown serialization)
- `lowlight` 3.3.0 + `mermaid` 11.12.3
- Vite 6, tsup 8, tsx 4, TypeScript 5.7
- **No floating-ui, radix, shadcn** — all UI is bespoke Tailwind

---

## 4. code-block-view.tsx — Custom NodeView Pattern

### How Mermaid Rendering Works

1. `CodeBlockLowlight` is extended with `addNodeView() { return ReactNodeViewRenderer(CodeBlockView) }`
2. `CodeBlockView` receives `node` prop (ProseMirror node)
3. If `node.attrs.language === 'mermaid'`: renders `<MermaidDiagram code={node.textContent} />`
4. Hides actual `<NodeViewContent />` in `<pre className="sr-only">` — keeps ProseMirror DOM in sync without display
5. `MermaidDiagram`: calls `mermaid.render(uniqueId, code)` in `useEffect([code])`, stores SVG string in state
6. Error state shows red panel; loading state shows `animate-pulse` placeholder
7. `mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })` called once at module level

### NodeView Pattern Observations (for drag handle exclusion)

```tsx
// NodeViewWrapper = outermost container — gets data attrs, drag handle would attach here
<NodeViewWrapper className="mermaid-wrapper not-prose my-4">
  <MermaidDiagram ... />
  <pre className="sr-only"><NodeViewContent /></pre>  // hidden contentDOM
</NodeViewWrapper>

// Regular code block:
<NodeViewWrapper as="pre" data-language={language} spellCheck={false} ...>
  <span className="code-lang-badge">{language}</span>
  <NodeViewContent />   // visible editable content
</NodeViewWrapper>
```

- `not-prose` on mermaid wrapper suppresses Tailwind typography styles
- Counter `let counter = 0` at module level ensures unique mermaid render IDs
- Pattern reusable: any extension using `ReactNodeViewRenderer(Component)` gets same lifecycle

---

## Summary: Key Facts for Notion-UX Implementation

1. **Tiptap v3** throughout — API uses `editor.chain().focus()...run()` pattern
2. **No missing core extensions** — all block/inline types covered; missing: drag-handle, color, font-family
3. **Toolbar is flat imperative** — no slash-command or floating bubble bar currently
4. **Markdown-first** — content stored/serialized as markdown via `tiptap-markdown`; this constrains what formatting can survive save/reload
5. **Dark-only Tailwind 4** — zinc/indigo palette, no light mode
6. **No dialog/modal** — link and image insertion use `window.prompt()` — needs upgrade for Notion-UX
7. **No Japanese strings** in editor UI — all English/symbols

---

## Unresolved Questions

- Does `tiptap-markdown` v0.8 support drag-handle node reordering without corrupting markdown output?
- `@tiptap/extension-drag-handle-react` (v3) — is it stable/published? Needs verification.
- Slash command: use `@tiptap/suggestion` (already pulled in via starter-kit) or third-party?
- Will adding `Color`/`FontFamily` extensions break existing markdown serialization (they have no markdown representation)?
