# TipTap Extensions Research: Notion-style UX
Date: 2026-02-24 | For: packages/preview WYSIWYG editor

---

## 1. @tiptap/suggestion — Slash Menu

**Package:** `@tiptap/suggestion` (peer dep since v2.0.0-beta.193, install separately)
**Note:** Official slash-commands extension is experimental/unpublished — must implement via `Suggestion` utility.

### Key API Surface

```ts
Suggestion({
  char: '/',                     // trigger character
  startOfLine: false,            // trigger anywhere (set true for line-start only)
  allowSpaces: false,
  items: ({ query }) => [...],   // sync or async; filter here
  command: ({ editor, range, props }) => {
    editor.chain().focus().deleteRange(range).run()
    // then insert node/mark
  },
  allow: ({ editor, range }) => true,   // gate activation
  render: () => ({                       // lifecycle hooks for popup
    onStart(props) {},
    onUpdate(props) {},
    onKeyDown({ event }) { return false }, // return true to consume key
    onExit() {}
  })
})
```

### Filter Pattern

```ts
items: ({ query }) =>
  COMMANDS.filter(item =>
    item.title.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 10),
```

### React Popup (tippy.js, still works in v2; v3 uses floating-ui)

```tsx
import tippy from 'tippy.js'
import { createRoot } from 'react-dom/client'

render: () => {
  let component: Root, popup: ReturnType<typeof tippy>
  return {
    onStart(props) {
      const el = document.createElement('div')
      component = createRoot(el)
      component.render(<SlashMenu {...props} />)
      popup = tippy('body', { getReferenceClientRect: props.clientRect,
        appendTo: document.body, content: el,
        showOnCreate: true, interactive: true, trigger: 'manual', placement: 'bottom-start' })
    },
    onUpdate(props) { component.render(<SlashMenu {...props} />) },
    onKeyDown({ event }) {
      if (event.key === 'Escape') { popup[0].hide(); return true }
      return slashMenuRef.current?.onKeyDown(event) ?? false
    },
    onExit() { popup[0].destroy(); component.unmount() }
  }
}
```

### Execute Command from Item

```ts
// Inside menu item onClick:
props.command({ id: item.id })
// Mapped in Suggestion.command:
command: ({ editor, range, props }) => {
  editor.chain().focus().deleteRange(range)
    .insertContent({ type: props.id }).run()
}
```

### Gotchas
- `render()` must return all 4 lifecycle methods or TipTap throws
- `onKeyDown` must return `true` to prevent editor from handling arrow/enter keys
- `clientRect` can be `null` — guard before passing to tippy
- In v3, `@tiptap/ui-components` provides `SlashDropdownMenu` as a higher-level abstraction

---

## 2. @tiptap/extension-drag-handle-react — Drag Handle

**Package:** `@tiptap/extension-drag-handle-react` (Pro extension, requires license)
**Version:** 3.15.3 | Also see community alt: `tiptap-extension-global-drag-handle` (free)

### Key API Surface

```tsx
import { DragHandle } from '@tiptap/extension-drag-handle-react'
// Also register the extension in editor:
// extensions: [DragHandleReact.configure({ render: () => null })]

<DragHandle editor={editor}>
  <GripVerticalIcon />
</DragHandle>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editor` | Editor | required | TipTap editor instance |
| `children` | ReactNode | — | Handle icon/content |
| `computePositionConfig` | FloatingUIConfig | `{ placement: 'left-start', strategy: 'absolute' }` | Floating-UI positioning |
| `onNodeChange` | `({ node, editor, pos }) => void` | — | Called on hover; `node` is null when leaving |
| `locked` | boolean | false | Freeze handle visibility |
| `pluginKey` | PluginKey | — | Multi-handle support |
| `onElementDragStart` | `(event) => void` | — | Drag start callback |
| `onElementDragEnd` | `(event) => void` | — | Drag end callback |
| `nested` | boolean | false | Enable for list-items/blockquotes |

### Show/Hide on Hover

Auto-managed by the extension. Use `onNodeChange` to track current node:

```tsx
const [currentNode, setCurrentNode] = useState(null)

<DragHandle
  editor={editor}
  onNodeChange={({ node }) => setCurrentNode(node)}
>
  <GripIcon />
</DragHandle>
```

### Disable for Specific Node Types

```tsx
onNodeChange: ({ node }) => {
  // hide or lock if node is a table cell
  if (node?.type.name === 'tableCell') setLocked(true)
  else setLocked(false)
}
// Pass locked={locked} to <DragHandle>
```

### Context Menu Integration

```tsx
<DragHandle editor={editor} onNodeChange={({ node, pos }) => setNodeInfo({ node, pos })}>
  <DropdownMenu>
    <DropdownMenuTrigger><GripIcon /></DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => editor.chain().focus().deleteNode().run()}>
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</DragHandle>
```

TipTap UI Components also provides `DragContextMenu` as a pre-built pattern.

### Gotchas
- Pro license required — falls back to `tiptap-extension-global-drag-handle` (community) for OSS use
- Must register `DragHandleReact` extension in editor extensions array AND render the React component
- `nested: true` required for drag inside lists/blockquotes to work
- Floating-UI `computePositionConfig` replaces old CSS-based positioning in v3

---

## 3. @tiptap/extension-bubble-menu — Floating Toolbar

**Package:** `@tiptap/extension-bubble-menu` (free, included in `@tiptap/react`)
**v3 breaking change:** `tippyOptions` → `options` (Floating UI); import from `@tiptap/react/menus`

### Key API Surface

```tsx
import { BubbleMenu } from '@tiptap/react/menus'  // v3
// v2: import { BubbleMenu } from '@tiptap/react'

<BubbleMenu
  editor={editor}
  shouldShow={({ editor, from, to }) => from !== to && !editor.isActive('image')}
  options={{ placement: 'top', offset: 8 }}       // v3 Floating UI
  // tippyOptions={{ duration: 100 }}              // v2 tippy.js
  updateDelay={100}
>
  <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
</BubbleMenu>
```

### shouldShow — Controlling Visibility

```ts
// Text selection only, hide for images and tables
shouldShow: ({ editor, from, to, view, state }) => {
  const hasSelection = from !== to
  const isImage = editor.isActive('image')
  const isTable = editor.isActive('table')
  return hasSelection && !isImage && !isTable
}
```

Default: shows whenever text is selected.

### Positioning (v3 Floating UI)

```tsx
options={{
  placement: 'top',          // top|bottom|left|right + -start|-end
  strategy: 'absolute',
  offset: 8,
  flip: true,
  shift: { padding: 8 }
}}
```

### Multiple Instances

```tsx
<BubbleMenu editor={editor} pluginKey="textMenu"
  shouldShow={({ editor }) => editor.isActive('paragraph')}>
  {/* text formatting */}
</BubbleMenu>

<BubbleMenu editor={editor} pluginKey="imageMenu"
  shouldShow={({ editor }) => editor.isActive('image')}>
  {/* image controls */}
</BubbleMenu>
```

### Force Position Update

```ts
editor.commands.setMeta('bubbleMenu', 'updatePosition')
// Needed after dynamic content changes resize the menu
```

### Gotchas
- v2→v3: `tippyOptions` removed, use `options` with Floating UI syntax; install `@floating-ui/dom ^1.6.0`
- v3 import path changed to `@tiptap/react/menus` (not `@tiptap/react`)
- `shouldShow` receives stale `state` — use `editor.isActive()` instead of direct state checks
- `updateDelay` default is `undefined` (no debounce) — set to ~100ms to avoid flicker on fast selection changes
- `appendTo` defaults to editor parent; set to `document.body` to escape overflow:hidden containers

---

## Summary Matrix

| Feature | Package | Cost | v3 Status |
|---------|---------|------|-----------|
| Slash menu | `@tiptap/suggestion` | Free | Stable, use `Suggestion` utility |
| Drag handle | `@tiptap/extension-drag-handle-react` | Pro | Floating-UI based |
| Bubble menu | `@tiptap/extension-bubble-menu` | Free | tippy → floating-ui |

---

## Unresolved Questions

1. Exact v3 `@tiptap/suggestion` integration with `@tiptap/ui-components` `SlashDropdownMenu` — unclear if it abstracts `render()` or still requires manual popup management.
2. `extension-drag-handle-react` Pro license cost/tier for open-source preview package — may need to use `tiptap-extension-global-drag-handle` community alternative.
3. Whether `BubbleMenu` v3 `options` fully replaces all tippy.js features (e.g., `onShow`/`onHide` callbacks are preserved in Floating UI `options` lifecycle callbacks).

---

## Sources
- [Suggestion utility | Tiptap Editor Docs](https://tiptap.dev/docs/editor/api/utilities/suggestion)
- [Slash Commands Extension | Tiptap Editor Docs](https://tiptap.dev/docs/examples/experiments/slash-commands)
- [Slash Dropdown Menu | Tiptap UI Components](https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu)
- [Drag Handle React | Tiptap Editor Docs](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react)
- [Drag Context Menu | Tiptap UI Components](https://tiptap.dev/docs/ui-components/components/drag-context-menu)
- [BubbleMenu extension | Tiptap Editor Docs](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)
- [Upgrade v2 to v3 | Tiptap Collaboration Docs](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)
