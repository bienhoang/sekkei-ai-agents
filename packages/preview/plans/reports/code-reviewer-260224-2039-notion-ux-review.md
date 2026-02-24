# Code Review: Notion-style UX for Sekkei Preview

**Date:** 2026-02-24 20:39
**Scope:** 4 new files, 3 modified files (~600 LOC)
**Focus:** Slash menu, bubble toolbar, notion-blocks CSS, editor integration
**Build status:** Clean (tsc --noEmit + vite build)

---

## Overall Assessment

Solid implementation. Clean component boundaries, proper TypeScript interfaces, good use of CSS variables for theme consistency. The slash menu extension is well-structured with proper TipTap Suggestion API integration. A few functional issues found below.

---

## Critical Issues

None.

---

## High Priority

### H1. EditorToolbar: setLink without URL validation (XSS vector)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/EditorToolbar.tsx:74-76`

```ts
const url = window.prompt('URL:')
if (url) editor.chain().focus().setLink({ href: url }).run()
else editor.chain().focus().unsetLink().run()
```

When user cancels the prompt (returns `null`), this calls `unsetLink()` which removes any existing link -- potentially surprising. More importantly, no protocol validation here, unlike bubble-toolbar and slash-menu-items which check `^https?://`. A `javascript:` URL could be inserted.

**Fix:** Add the same regex guard used elsewhere:
```ts
if (url && /^https?:\/\//.test(url)) {
  editor.chain().focus().setLink({ href: url }).run()
}
```

### H2. EditorToolbar: Image URL has no protocol validation

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/EditorToolbar.tsx:79-80`

```ts
const url = window.prompt('Image URL:')
if (url) editor.chain().focus().setImage({ src: url }).run()
```

Same issue. The slash-menu-items Image command correctly validates `^https?://`, but the toolbar does not. A `javascript:` or data URI could be injected.

**Fix:** Mirror the slash-menu-items guard: `if (url && /^https?:\/\//.test(url))`.

### H3. Slash menu Image: silently drops invalid URLs

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/slash-menu-items.ts:89-94`

```ts
const url = window.prompt('Image URL:')
if (url && /^https?:\/\//.test(url)) {
  editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
} else {
  editor.chain().focus().deleteRange(range).run()
}
```

When user enters an invalid URL, the `/` trigger text is deleted with no feedback. User loses their typed text and sees nothing. Consider showing an alert or simply not deleting the range on invalid input.

---

## Medium Priority

### M1. Bubble toolbar link handler: inconsistent cancel behavior

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/bubble-toolbar.tsx:17-25`

```ts
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
```

This is properly guarded -- good. However there's behavioral inconsistency: the bubble-toolbar validates URLs, but the EditorToolbar (H1) does not. Users will experience different behavior depending on which toolbar they use to insert a link. Unify the validation.

### M2. `useImperativeHandle` missing dependency array concern

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/slash-menu.tsx:41-58`

The `useImperativeHandle` callback captures `selectedIndex` and `selectItem` but has no dependency array. In React 18 strict mode, this recreates the handle on every render. Not a bug, but adding `[items, selectItem, selectedIndex]` as deps would be more explicit.

### M3. TableMenu: no keyboard trap / Escape handling

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/EditorToolbar.tsx:177-207`

The table dropdown has a click-to-close overlay but no keyboard Escape handler. Users who open via keyboard have no way to dismiss without clicking. A simple `onKeyDown` with Escape detection on the dropdown container would fix this.

### M4. `tippy` return type from `tippy()` is actually `TippyInstance[]`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/slash-menu.tsx:134`

```ts
popup = tippy(el, { ... })
```

`tippy()` when called with a single Element returns `Instance` but the TypeScript signature may return `Instance | Instance[]` depending on the overload. The variable is typed as `TippyInstance | null`. If the types shift in a tippy.js update this could break silently. Since build passes now, this is low risk but worth noting.

---

## Low Priority

### L1. `window.prompt` as UX pattern

Four places use `window.prompt()` for URL input. This works but is jarring in a polished Notion-like UI. A future iteration could use inline popover inputs instead. Not blocking.

### L2. notion-blocks.css `.ProseMirror > *:hover` breadth

```css
.ProseMirror > *:hover {
  background: rgba(255, 255, 255, 0.02);
}
```

This applies to every direct child on hover -- including tables, images, code blocks that already have their own background. The `0.02` alpha is subtle enough to be harmless, but could cause visual artifacts on elements with transparent backgrounds in edge cases.

---

## Positive Observations

1. **Clean separation**: `slash-menu-items.ts` (data) vs `slash-menu.tsx` (behavior/UI) follows single-responsibility well
2. **Theme consistency**: All new components use CSS variables (`--c-bg-mute`, `--c-text-2`, etc.) matching the existing zinc/indigo theme system
3. **Light mode support**: Both notion-blocks.css and bubble-toolbar properly handle `[data-theme="light"]` variants
4. **Keyboard navigation**: Slash menu implements full ArrowUp/ArrowDown/Enter/Escape with proper wrapping index math
5. **Memory cleanup**: `onExit` in slash-menu properly destroys both tippy instance and ReactRenderer
6. **Code block guard**: `allow` callback in suggestion config prevents slash menu from triggering inside code blocks
7. **`displayName`** set on forwardRef component -- good for DevTools debugging
8. **Toolbar persistence**: `localStorage` toggle for toolbar visibility with try/catch guards -- solid DX touch

---

## Recommended Actions

1. **[HIGH]** Add `^https?://` validation to EditorToolbar link handler (line 74) and image handler (line 79) -- straightforward 2-line fix each
2. **[MEDIUM]** Add Escape key handler to TableMenu dropdown
3. **[LOW]** Consider user feedback (alert or no-op) when slash menu image URL is invalid instead of silently deleting

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | Full (build passes --noEmit) |
| Test Coverage | N/A (preview package has no unit tests) |
| Linting Issues | 0 (clean build) |
| Security Issues | 2 (URL validation gaps in EditorToolbar) |

---

## Unresolved Questions

1. Is `@tiptap/react/menus` the correct import path for BubbleMenu in tiptap v3? The diff shows it was moved from `@tiptap/react` to `@tiptap/react/menus`. Build passes, but this may be a v3 beta path that could change.
2. Should `Image.configure({ allowBase64: true })` remain enabled given the URL validation elsewhere? This allows data URIs via paste, which bypasses the `https?` check on the prompt-based insertion path.
