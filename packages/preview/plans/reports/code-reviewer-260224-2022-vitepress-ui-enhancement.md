# Code Review: VitePress-like UI Enhancement

**Date:** 2026-02-24
**Scope:** 15 files — hooks, components, styles, index.html
**Build:** Passes

## Overall Assessment

Clean, well-structured React codebase. Components are small and focused. Good use of CSS variables for theming. A few real issues found, mostly around React hook dependencies and one potential stale closure.

---

## Critical Issues

None.

---

## High Priority

### 1. Stale closure in `handleSave` keyboard shortcut (TiptapEditor.tsx:106-116)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/TiptapEditor.tsx`

The `handleSave` function is defined as a regular function (line 118) and captures `editor` and `dirty` from the render scope. The `useEffect` on line 106 depends on `[editor, dirty, readonly]` — but `handleSave` itself is not in the dependency array. This works **only because** `dirty` is listed as a dep, which forces re-registration. However, this is fragile:

- If someone removes `dirty` from the deps array, `handleSave` will see stale `dirty` value.
- The function also captures `path` and `onDirty` from props, which are not in the deps.

**Recommendation:** Either wrap `handleSave` in `useCallback` with proper deps, or use a ref-based pattern to avoid re-registering the keydown listener on every dirty change:

```tsx
const handleSaveRef = useRef(handleSave)
handleSaveRef.current = handleSave

useEffect(() => {
  if (!editor || readonly) return
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      handleSaveRef.current()
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [editor, readonly])
```

### 2. Missing `onEditorReady` in useEffect deps (TiptapEditor.tsx:100-104)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/TiptapEditor.tsx`

```tsx
useEffect(() => {
  if (editor && onEditorReady) {
    onEditorReady(editor, scrollRef.current)
  }
}, [editor])  // Missing: onEditorReady
```

`onEditorReady` is read inside the effect but not listed as a dependency. If the parent re-renders with a different `onEditorReady` callback, the effect won't fire again.

In practice this is safe here because `onEditorReady` is wrapped in `useCallback([])` in `App.tsx` (line 43), so it's stable. But the lint rule would flag this, and it's a correctness risk if the parent changes. Add `onEditorReady` to the deps array.

### 3. `useTheme` toggle has stale closure risk (use-theme.ts:22-24)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-theme.ts`

```tsx
const toggle = useCallback(() => {
  setTheme(theme === 'dark' ? 'light' : 'dark')
}, [theme, setTheme])
```

This works correctly because `theme` is in the deps array. However, since `toggle` is recreated on every theme change, any component receiving `toggle` as a prop will re-render on theme change. A more stable approach:

```tsx
const toggle = useCallback(() => {
  setThemeState(prev => {
    const next = prev === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.setAttribute('data-theme', next)
    return next
  })
}, [])
```

This is a **minor perf issue**, not a bug. The current code is correct.

---

## Medium Priority

### 4. `useTheme` initial effect missing `theme` dep (use-theme.ts:26-28)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-theme.ts`

```tsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
}, [])  // empty deps — runs once on mount only
```

This is intentional (set on mount), and the inline IIFE in `index.html` already handles initial theme flash. However, `theme` is captured from state but not in deps — this is technically a lint violation. The `setTheme` callback already does `setAttribute`, so the mount effect is redundant given the `index.html` inline script already sets it. Consider removing this effect entirely.

### 5. Mermaid module-level counter is not safe across hot reloads (code-block-view.tsx:12-13)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/code-block-view.tsx`

```tsx
let counter = 0
```

Module-level mutable state. During development with HMR, this counter resets on module re-evaluation, potentially causing mermaid ID collisions with orphaned SVG elements in the DOM. In production this is fine. Also, the counter is incremented in two places (line 48 and line 54), which means each MermaidDiagram component consumes 2+ counter values — not a bug, just wasteful.

### 6. Mermaid `securityLevel: 'loose'` (code-block-view.tsx:8)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/code-block-view.tsx`

```tsx
mermaid.initialize({
  securityLevel: 'loose',
  ...
})
```

`'loose'` allows arbitrary HTML in mermaid diagrams. Since this is a local preview tool (not public-facing), the risk is low. But if this ever becomes a shared service, this should be changed to `'strict'`. Document this decision.

### 7. `dangerouslySetInnerHTML` with mermaid SVG (code-block-view.tsx:80-81)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/code-block-view.tsx`

```tsx
dangerouslySetInnerHTML={{ __html: svg }}
```

The SVG comes from mermaid's `render()`. Combined with `securityLevel: 'loose'`, this means user-controlled mermaid code blocks could inject HTML. Again, acceptable for local-only preview tool, but worth noting.

### 8. `filterTree` runs on every render (TreeSidebar.tsx:28)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/TreeSidebar.tsx`

```tsx
const filtered = filterTree(tree, searchQuery)
```

Called directly in render body without `useMemo`. For small trees this is negligible. For large doc trees, consider:

```tsx
const filtered = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery])
```

### 9. TocSidebar uses array index as key (toc-sidebar.tsx:20)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/toc-sidebar.tsx`

```tsx
<li key={i}>
```

If headings reorder during editing, React may misapply DOM updates. Use `${item.level}-${item.text}-${i}` for a more stable key.

---

## Low Priority

### 10. `useFile` does not abort fetch on unmount/path change (use-file.ts:14-23)

The fetch can resolve after the component unmounts or after `path` changes, causing a state update on an unmounted component. Modern React doesn't warn about this anymore, but it can cause brief flickers. Consider `AbortController`:

```tsx
useEffect(() => {
  if (!path) { setFile(null); return }
  const ac = new AbortController()
  setLoading(true)
  fetch(`/api/files?path=${encodeURIComponent(path)}`, { signal: ac.signal })
    .then(...)
    .catch(e => { if (e.name !== 'AbortError') setError(...) })
    .finally(...)
  return () => ac.abort()
}, [path])
```

### 11. `handleSelect` recreated every render (App.tsx:33)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/App.tsx`

`handleSelect` is a regular function capturing `dirty` and `activePath`. It's passed to `TreeSidebar` and `TiptapEditor`. Each render creates a new reference. For this app's scale it doesn't matter, but wrapping in `useCallback` with proper deps would be cleaner.

---

## Positive Observations

- Good separation of concerns: hooks are small and focused
- CSS variable theming with `data-theme` attribute is the right pattern
- Flash-of-wrong-theme prevented by inline script in `index.html`
- `key={file.path}` on TiptapEditor forces remount on file change — correct approach
- `rewriteImagePaths` handles relative paths well
- EditorToolbar groups buttons logically with fragment-based dividers
- Scroll-spy in `useToc` uses `requestAnimationFrame` throttling with `{ passive: true }` — good perf practice
- All event listeners properly cleaned up in effects (except the minor items noted above)
- `useFlatTree` properly memoized with `useMemo`

---

## Summary of Recommended Actions

| Priority | Issue | Effort |
|----------|-------|--------|
| High | Fix stale closure in Cmd+S handler (use ref pattern) | 10 min |
| High | Add `onEditorReady` to useEffect deps | 1 min |
| Medium | Remove redundant mount effect in `useTheme` | 2 min |
| Medium | Memoize `filterTree` in TreeSidebar | 2 min |
| Medium | Use composite key in TocSidebar | 1 min |
| Low | Add AbortController to `useFile` | 5 min |
| Low | Wrap `handleSelect` in useCallback | 3 min |

---

## Unresolved Questions

- Is this preview tool intended to remain local-only? If it may become a shared service, the mermaid `securityLevel: 'loose'` + `dangerouslySetInnerHTML` combination needs revisiting.
- Does the team want to enforce `eslint-plugin-react-hooks` exhaustive-deps rule? Several effects have intentionally incomplete deps.
