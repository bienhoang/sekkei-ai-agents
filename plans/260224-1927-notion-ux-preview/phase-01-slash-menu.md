# Phase 1: Slash Menu (/ Command)

## Context Links

- [TiptapEditor.tsx](../../packages/preview/src/client/components/TiptapEditor.tsx) -- current editor setup
- [EditorToolbar.tsx](../../packages/preview/src/client/components/EditorToolbar.tsx) -- existing commands to replicate
- [@tiptap/suggestion docs](https://tiptap.dev/docs/editor/extensions/functionality/suggestion)
- [plan.md](./plan.md)

## Overview

- **Priority:** High (foundational, highest UX impact)
- **Status:** pending
- **Effort:** 3h
- **Description:** Implement `/` command palette allowing users to insert blocks (headings, lists, tables, code blocks, mermaid, etc.) without toolbar.

## Key Insights

- `@tiptap/suggestion` provides the core trigger/filter/keyboard logic; we supply the React popup
- Must implement `render()` with 4 lifecycle: `onStart`, `onUpdate`, `onKeyDown`, `onExit`
- `onKeyDown` must return `true` for ArrowUp/ArrowDown/Enter/Escape to prevent ProseMirror from handling
- tippy.js used for popup positioning (anchored to cursor via `clientRect`)
- Slash char is consumed by suggestion; on item select, delete the query text then run the command

## Requirements

### Functional
- Type `/` at start of empty paragraph or after space to open menu
- 12 items: H1, H2, H3, bullet list, numbered list, task list, table 3x3, code block, mermaid block, image URL, blockquote, horizontal rule
- Fuzzy filter: typing after `/` narrows visible items
- Keyboard nav: ArrowUp/Down to move, Enter to select, Escape to close
- Mouse click on item to select
- Menu closes on Escape, click outside, or cursor leaves trigger range

### Non-Functional
- Popup renders < 16ms (no heavy computation)
- Max 200 lines per file

## Architecture

```
slash-menu-items.ts          slash-menu.tsx
  |                            |
  | items[] with               | SlashMenuExtension (Extension.create)
  | label, icon, command       |   - uses @tiptap/suggestion
  |                            |   - char: '/'
  |                            |
  | SlashMenuItem type         | SlashMenuPopup (React component)
  |                            |   - rendered by tippy.js
  |                            |   - keyboard nav state (selectedIndex)
  |                            |   - filter by query string
  |                            |
  +----------------------------+
```

### Data Flow
1. User types `/` --> suggestion triggers `onStart` --> tippy shows popup
2. User types query --> `onUpdate` --> filter items, re-render
3. User presses ArrowDown --> `onKeyDown` returns true, updates selectedIndex
4. User presses Enter --> execute `items[selectedIndex].command(editor, range)` --> tippy hides

## Related Code Files

### Create
- `packages/preview/src/client/components/slash-menu-items.ts` (~60 lines)
- `packages/preview/src/client/components/slash-menu.tsx` (~180 lines)

### Modify
- `packages/preview/src/client/components/TiptapEditor.tsx` -- add SlashMenuExtension to extensions array
- `packages/preview/package.json` -- add `@tiptap/suggestion`, `tippy.js`

## Implementation Steps

### Step 1: Install dependencies
```bash
cd packages/preview
npm install --save-dev @tiptap/suggestion tippy.js
```

### Step 2: Create `slash-menu-items.ts`

Define `SlashMenuItem` type:
```ts
export interface SlashMenuItem {
  title: string
  description: string
  icon: string  // emoji/unicode char
  command: (editor: Editor, range: Range) => void
}
```

Export `slashMenuItems: SlashMenuItem[]` with 12 items. Each command:
```ts
// Example for H1:
command: (editor, range) => {
  editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
}
// Example for table:
command: (editor, range) => {
  editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}
// Example for mermaid:
command: (editor, range) => {
  editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'mermaid' }).run()
}
```

### Step 3: Create `slash-menu.tsx`

**Part A: React popup component `SlashMenuPopup`**
- Props: `items: SlashMenuItem[]`, `command: (item) => void`, `query: string`
- State: `selectedIndex` (reset to 0 on items change)
- Expose `onKeyDown` via `forwardRef` + `useImperativeHandle`
- Render: vertical list, each item shows icon + title + description
- Styling: `bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl` (match TableMenu pattern)
- Highlight selected: `bg-zinc-700/50`

**Part B: TipTap extension `SlashMenuExtension`**
```ts
export const SlashMenuExtension = Extension.create({
  name: 'slashMenu',
  addOptions() {
    return { suggestion: { ... } }
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})
```

Suggestion config:
- `char: '/'`
- `items: ({ query }) => slashMenuItems.filter(...)` -- case-insensitive match on title
- `render: ()` -- return `{ onStart, onUpdate, onKeyDown, onExit }`
- `onStart`: create tippy instance with `getReferenceClientRect` from props, mount React popup
- `onUpdate`: update tippy + re-render popup with new query/items
- `onKeyDown`: delegate to popup's `onKeyDown` (ArrowUp/Down/Enter/Escape)
- `onExit`: destroy tippy instance, unmount React

### Step 4: Register in TiptapEditor.tsx

Add to imports:
```ts
import { SlashMenuExtension } from './slash-menu.js'
```

Add to extensions array (after Typography, before CharacterCount):
```ts
SlashMenuExtension,
```

### Step 5: Add CSS for slash menu popup

In `notion-blocks.css` (or inline via Tailwind classes):
```css
.slash-menu { max-height: 320px; overflow-y: auto; min-width: 240px; }
.slash-menu-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; cursor: pointer; }
.slash-menu-item.is-selected { background: theme(colors.zinc.700/50); }
```

## Todo List

- [ ] Install `@tiptap/suggestion` and `tippy.js`
- [ ] Create `slash-menu-items.ts` with 12 menu items
- [ ] Create `slash-menu.tsx` with popup component + extension
- [ ] Implement tippy lifecycle (onStart/onUpdate/onKeyDown/onExit)
- [ ] Register SlashMenuExtension in TiptapEditor.tsx
- [ ] Add slash menu CSS
- [ ] Test: type `/` opens menu, filter works, keyboard nav works, Enter inserts block
- [ ] Test: Escape closes, click outside closes
- [ ] Test: each of 12 items correctly inserts its block type

## Success Criteria

- `/` opens command palette at cursor position
- Typing filters items in real-time
- All 12 block types insert correctly
- Keyboard navigation (arrows + enter + escape) fully functional
- No interference with existing Mermaid/table/code block behavior
- Popup z-index above all editor content

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@tiptap/suggestion` v3 API differs from docs | Med | Check actual installed version; fallback to raw ProseMirror plugin |
| tippy.js positioning off in fullscreen mode | Low | Test fullscreen; use `appendTo: document.body` |
| `/` in code blocks triggers menu | Med | suggestion `allow()` config: return false if inside codeBlock |

## Security Considerations

- Image URL prompt: validate URL format (no `javascript:` protocol)
- No user-generated HTML -- all commands go through TipTap's safe API

## Next Steps

- Phase 2 (Bubble Menu) can start independently / in parallel
- Phase 3 (Toolbar Refactor) depends on Phase 1+2 completion
