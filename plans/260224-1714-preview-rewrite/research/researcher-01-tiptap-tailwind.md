# Research: Tiptap v3 + Tailwind Typography + Readonly Mode

Date: 2026-02-24

---

## 1. Tiptap v3 — Current Stable Packages

**Status:** v3 is stable (released after ~2 months beta). Latest as of 2026-02-24:

| Package | Version |
|---|---|
| `@tiptap/react` | 3.20.0 |
| `@tiptap/pm` | 3.20.0 |
| `@tiptap/starter-kit` | 3.20.0 |
| `@tiptap/extension-link` | 3.20.0 |
| `@tiptap/extension-markdown` | not published on npm (see below) |

**`@tiptap/extension-markdown`:** Not found on npm registry. Tiptap's markdown support ships as `@tiptap/extension-markdown` only via their pro/cloud offering. Community alternative: [`tiptap-markdown`](https://www.npmjs.com/package/tiptap-markdown).

**React 19 compatibility:**
- Core `@tiptap/react` supports React 18+. React 19 is being actively worked on.
- v3 dropped `tippy.js` in favor of Floating UI — eliminates one source of React 19 compat issues.
- **Tiptap UI Components** (their paid component library) only guarantees React 18 currently.
- For basic editor use (`useEditor` + extensions), React 19 works in practice; no hard peer dep block.

**v3 breaking changes from v2:**
- Extensions grouped into kits (e.g., `TableKit` instead of individual table extensions)
- Floating UI replaces tippy.js

**Install:**
```bash
npm i @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

---

## 2. @tailwindcss/typography — v4 Setup

**Version:** `@tailwindcss/typography@0.5.19` (latest stable; v4-compatible)

**CSS-first config (Tailwind v4):** Add via `@plugin` in CSS file — no `tailwind.config.js` needed.

```css
/* globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

**Usage:**
```html
<article class="prose lg:prose-xl dark:prose-invert">
  <!-- rendered HTML/markdown content -->
</article>
```

**Custom class prefix:**
```css
@plugin "@tailwindcss/typography" {
  className: wysiwyg;
}
```
Then use `class="wysiwyg wysiwyg-xl"` instead of `prose`.

**Gotchas:**
- Must use `@tailwindcss/typography@0.5.15+` for Tailwind v4 compatibility (older versions expect JS config).
- `prose-invert` for dark mode works unchanged.
- If using Vite + Tailwind v4 via `@tailwindcss/vite`, the `@plugin` directive is picked up automatically.
- No `tailwind.config.js` `plugins: [require('@tailwindcss/typography')]` needed in v4.

---

## 3. Tiptap Readonly Mode

**Static readonly (init-time):**
```ts
const editor = useEditor({
  extensions: [StarterKit],
  content: '...',
  editable: false,
})
```

**Dynamic toggle at runtime:**
```ts
// toggle to readonly
editor.setEditable(false)

// toggle back to editable
editor.setEditable(true)

// setEditable(value, emitUpdate?)
// second arg false = don't fire onUpdate (avoid unnecessary re-renders)
editor.setEditable(false, false)
```

**React pattern (controlled):**
```tsx
const [isEditing, setIsEditing] = useState(false)

useEffect(() => {
  if (!editor) return
  editor.setEditable(isEditing, false)
}, [editor, isEditing])
```

**CSS consideration:** When `editable: false`, Tiptap sets `contenteditable="false"` on the ProseMirror div. Add visual cue:
```css
.ProseMirror[contenteditable="false"] {
  cursor: default;
  caret-color: transparent;
}
```

**No editor recreation needed** — `setEditable()` is a runtime method, does not destroy/recreate the editor instance.

---

## Unresolved Questions

1. `@tiptap/extension-markdown` — confirm if open-source or pro-only; may need `tiptap-markdown` (community package, last checked v0.x).
2. React 19 strict mode compatibility — no hard confirmation from Tiptap team; needs integration test.
3. Tailwind v4 `@plugin` — confirm it works with Next.js App Router (`globals.css` → layout import pattern).

---

## Sources

- [Tiptap 3.0 stable release notes](https://tiptap.dev/blog/release-notes/tiptap-3-0-is-stable)
- [Tiptap Editor API — editable](https://tiptap.dev/docs/editor/api/editor)
- [Tiptap readonly discussion](https://github.com/ueberdosis/tiptap/discussions/784)
- [React 19 Tiptap compat discussion](https://github.com/ueberdosis/tiptap/discussions/5816)
- [tailwindcss-typography GitHub](https://github.com/tailwindlabs/tailwindcss-typography)
- [tw-prose CSS-only alternative for v4](https://dev.to/gridou/announcing-tw-prose-a-css-only-typography-plugin-for-tailwind-css-v4-o8j)
