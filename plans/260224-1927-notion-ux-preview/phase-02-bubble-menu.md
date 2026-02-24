# Phase 2: Bubble Menu (Floating Toolbar)

## Context Links

- [TiptapEditor.tsx](../../packages/preview/src/client/components/TiptapEditor.tsx)
- [EditorToolbar.tsx](../../packages/preview/src/client/components/EditorToolbar.tsx) -- format buttons to replicate
- [globals.css](../../packages/preview/src/client/styles/globals.css)
- [plan.md](./plan.md)

## Overview

- **Priority:** High
- **Status:** pending
- **Effort:** 2.5h
- **Description:** Add floating toolbar that appears on text selection with inline formatting options. Replaces fixed toolbar as primary formatting mechanism.

## Key Insights

- `BubbleMenu` ships with `@tiptap/react` v3 (already installed). Import: `import { BubbleMenu } from '@tiptap/react'`
- TipTap v3 uses Floating UI internally (not tippy). `tippyOptions` renamed to `options`
- `shouldShow` callback controls visibility: hide for images, code blocks, tables
- Must keep fixed toolbar accessible via toggle (Phase 4) for operations BubbleMenu can't do (headings, lists, alignment, table ops)
- BubbleMenu only for inline marks: bold, italic, underline, strike, highlight, code, link

## Requirements

### Functional
- Show floating toolbar when text is selected (non-empty selection)
- 8 buttons: Bold, Italic, Underline, Strikethrough, Highlight, Inline Code, Link (toggle/set), Clear formatting
- Active state indicator matching existing style (indigo highlight)
- Link button: if no link, prompt URL; if link active, unset
- Hide when selection is inside: code block, image, table cell header
- Position: above selection, centered

### Non-Functional
- Appears within 100ms of selection
- No layout shift in document
- Follows scroll position
- Under 120 lines

## Architecture

```
bubble-toolbar.tsx
  |
  | BubbleToolbar component
  |   - wraps <BubbleMenu> from @tiptap/react
  |   - shouldShow logic
  |   - 8 inline format buttons
  |   - reuses Btn-like pattern from EditorToolbar
  |
  +-- receives `editor` prop from TiptapEditor.tsx
```

### shouldShow Logic
```ts
shouldShow: ({ editor, state }) => {
  const { from, to } = state.selection
  if (from === to) return false                    // no selection
  if (editor.isActive('codeBlock')) return false    // inside code
  if (editor.isActive('image')) return false        // image selected
  return true
}
```

## Related Code Files

### Create
- `packages/preview/src/client/components/bubble-toolbar.tsx` (~110 lines)

### Modify
- `packages/preview/src/client/components/TiptapEditor.tsx` -- add BubbleToolbar below EditorContent
- `packages/preview/src/client/styles/notion-blocks.css` -- bubble menu styles

## Implementation Steps

### Step 1: Create `bubble-toolbar.tsx`

```tsx
import { BubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

interface Props { editor: Editor }

export function BubbleToolbar({ editor }: Props) {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state }) => {
        const { from, to } = state.selection
        if (from === to) return false
        if (e.isActive('codeBlock')) return false
        if (e.isActive('image')) return false
        return true
      }}
      className="bubble-toolbar"
    >
      {/* buttons */}
    </BubbleMenu>
  )
}
```

Buttons array pattern (same `btn()` approach as EditorToolbar):
```ts
const buttons = [
  { label: 'B', title: 'Bold', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
  { label: 'I', title: 'Italic', ... },
  { label: 'U', title: 'Underline', ... },
  { label: 'S̶', title: 'Strikethrough', ... },
  { label: 'H', title: 'Highlight', ... },
  { label: '`', title: 'Inline code', ... },
  { label: '🔗', title: 'Link', action: handleLink, active: editor.isActive('link') },
  { label: '✘', title: 'Clear', action: () => editor.chain().focus().unsetAllMarks().run() },
]
```

Link handler:
```ts
function handleLink() {
  if (editor.isActive('link')) {
    editor.chain().focus().unsetLink().run()
  } else {
    const url = window.prompt('URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }
}
```

### Step 2: Style the bubble menu

In `notion-blocks.css`:
```css
.bubble-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: theme(colors.zinc.800);
  border: 1px solid theme(colors.zinc.700);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
```

Button styles reuse existing patterns: `px-1.5 py-1 rounded-md text-xs font-mono` with active `bg-indigo-600/30 text-indigo-300`.

### Step 3: Integrate in TiptapEditor.tsx

Add import:
```ts
import { BubbleToolbar } from './bubble-toolbar.js'
```

Place inside the editor container, after `<EditorContent>`:
```tsx
<div className="flex-1 overflow-y-auto">
  <EditorContent ... />
  {!readonly && <BubbleToolbar editor={editor} />}
</div>
```

Note: BubbleMenu uses a portal, so DOM placement doesn't matter much, but keeping it near EditorContent is conventional.

## Todo List

- [ ] Create `bubble-toolbar.tsx` with BubbleMenu wrapper
- [ ] Implement 8 inline formatting buttons
- [ ] Implement shouldShow logic (hide for code blocks, images)
- [ ] Add link toggle handler
- [ ] Add CSS styles in notion-blocks.css
- [ ] Register in TiptapEditor.tsx
- [ ] Test: select text, bubble menu appears above selection
- [ ] Test: each button toggles correctly, active states shown
- [ ] Test: hidden inside code blocks and on images
- [ ] Test: works in fullscreen mode

## Success Criteria

- Floating toolbar appears on text selection within 100ms
- All 8 buttons work correctly with active state indicators
- Hidden for code blocks, images
- Follows selection position on scroll
- Matches existing dark theme (zinc-800/indigo)
- No flicker or layout shift

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| TipTap v3 BubbleMenu API change (tippyOptions -> options) | Med | Check actual props; fallback to `options` if `tippyOptions` errors |
| BubbleMenu flickers on rapid selection changes | Low | Use `updateDelay` option (default 250ms is fine) |
| BubbleMenu overlaps slash menu popup | Low | z-index layering: slash menu z-50, bubble z-40 |

## Security Considerations

- Link URL validation: no `javascript:` protocol (TipTap's Link extension handles this via `validate` option, already configured with `autolink: true`)

## Next Steps

- Phase 3 (Toolbar Refactor) depends on Phase 1+2 completion
- Phase 3 integrates this with toolbar toggle + block highlight CSS
