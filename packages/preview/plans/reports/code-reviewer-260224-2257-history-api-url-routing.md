# Code Review: History API URL Routing

## Scope
- Files: 3 (1 new util, 1 new hook, 1 modified component)
- LOC: ~120 net new
- Focus: `default-page-resolver.ts`, `use-url-sync.ts`, `App.tsx`
- Scout: Checked server SPA catch-all, tree-scanner paths, TiptapEditor link handler, NextPrevNav, encoding flows

## Overall Assessment

Clean, well-structured implementation. Zero-dependency History API approach is appropriate for this SPA. The three-effect pattern in `useUrlSync` has clear separation of concerns. However, there are several correctness and edge-case issues that need attention.

---

## Critical Issues

### 1. `encodeURI` vs `decodeURIComponent` Encoding Mismatch

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`

Lines 14, 68, 76 use `encodeURI()` for writing but `decodeURIComponent()` for reading:

```ts
// Writing (lines 68, 76):
history.replaceState({}, '', '/' + encodeURI(resolved))
// Reading (line 14):
return decodeURIComponent(pathname.replace(/^\//, ''))
```

`encodeURI` does NOT encode `#`, `?`, `&`, `;` -- but `decodeURIComponent` will decode `%23`, `%3F`, etc. if they appear. More critically, if a filename contains `#` (e.g., `notes/C#-guide.md`), `encodeURI` will leave it as-is, causing the browser to interpret everything after `#` as a fragment identifier. The URL would become `/notes/C#-guide.md` and `location.pathname` would return `/notes/C` -- data loss.

**Fix:** Use `encodeURIComponent` on each path segment:

```ts
function filePathToUrl(filePath: string): string {
  return '/' + filePath.split('/').map(encodeURIComponent).join('/')
}
```

**Severity:** Critical -- file paths with `#`, `?`, or `&` will silently resolve to wrong files or break navigation.

---

## High Priority

### 2. Missing `activePath` in Effect 1 Dependency Array

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`, line 71

```ts
useEffect(() => {
  // ... uses onInitialResolve
}, [tree, treeLoading, onInitialResolve])
```

`onInitialResolve` is `setActivePath` which is a stable React dispatch -- fine. But the `initialResolved.current = true` guard means this only fires once, so the missing dep is not a runtime bug, just a lint violation. Acceptable as-is but add an eslint-disable comment to be explicit.

### 3. `handleNavigate` Stale Closure in `useCallback` Dependencies

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/App.tsx`, lines 34-42

```ts
const handleNavigate = useCallback((path: string) => {
  if (dirty && path !== activePath) {
    if (!window.confirm('You have unsaved changes. Switch files anyway?')) return
  }
  setDirty(false)
  setActivePath(path)
  setEditorInstance(null)
  setScrollContainer(null)
}, [dirty, activePath])
```

This callback is passed to `useUrlSync` as `onNavigate`, which is a dependency of Effect 3 (popstate listener). Every time `dirty` or `activePath` changes, `handleNavigate` gets a new identity, causing the popstate listener to be torn down and re-attached. This is functionally correct but slightly wasteful.

More importantly, when `handleNavigate` is used as `onNavigate` in the popstate effect, the effect's dep array `[onNavigate]` means the listener re-binds on every path change. This is safe but consider using a ref to avoid churn:

```ts
const handleNavigateRef = useRef(handleNavigate)
handleNavigateRef.current = handleNavigate
```

Then inside `useUrlSync`, use a stable ref wrapper for the popstate listener.

**Severity:** High (correctness risk under rapid navigation) -- no current bug, but the callback identity churn under rapid back/forward could theoretically cause a popstate event to be handled by a stale listener during teardown/setup race.

### 4. Popstate Handler Does Not Validate File Exists in Tree

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`, lines 83-85

```ts
function handlePopstate() {
  const filePath = urlPathToFilePath(location.pathname)
  if (filePath) onNavigate(filePath)
}
```

If a user manually edits the URL in the address bar to a non-existent path and then hits back/forward, `onNavigate` will be called with a path that does not exist in the tree. The `useFile` hook will then attempt to fetch it and get a 404.

**Fix:** Validate against tree before navigating:

```ts
function handlePopstate() {
  const filePath = urlPathToFilePath(location.pathname)
  if (filePath && fileExistsInTree(tree, filePath)) {
    onNavigate(filePath)
  }
}
```

Note: This requires `tree` in the effect's dependency array, which is acceptable since tree only changes once (on load).

### 5. `findChildFiles` and `resolveDefaultPage` Case Sensitivity Inconsistency

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/utils/default-page-resolver.ts`

Line 23 does case-insensitive matching for index patterns:
```ts
const match = files.find(f => f.name.toLowerCase() === pattern)
```

But `findChildFiles` line 11 does case-sensitive matching for directory segments:
```ts
const dir = nodes.find(n => n.type === 'directory' && n.name === seg)
```

On macOS (case-insensitive FS), the tree-scanner returns actual casing from disk, but a URL might have different casing. A user navigating to `/Docs/index.md` when the tree has `docs/index.md` would fail silently and fall through to root default.

**Severity:** High on macOS/Windows, low on Linux.

---

## Medium Priority

### 6. No URL Update When Resolution Falls Back to Root Default

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`, lines 63-64

```ts
} else {
  resolved = resolveDefaultPage(tree) // fallback to root
}
```

When the URL path does not match any file or directory, it falls back to the root default page. The URL is then replaced with the resolved page path via `replaceState`. This is correct behavior, but there is no user feedback that the requested path was not found. Consider logging a warning or showing a brief toast.

### 7. `isDirectoryInTree` Returns `true` for Empty String

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`, lines 35-44

```ts
function isDirectoryInTree(tree: TreeNode[], path: string): boolean {
  const segments = path.split('/').filter(Boolean)
  let nodes = tree
  for (const seg of segments) { ... }
  return true  // always true for empty segments
}
```

If `path` is `""` or `"/"`, `segments` is empty, the loop body never executes, and it returns `true`. In `useUrlSync` Effect 1, the empty-path case is caught earlier by the `if (!filePath)` check on line 57, so this is unreachable in practice. Still, the function's semantics are misleading.

### 8. `fileExistsInTree` Does Not Filter Empty Segments

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/hooks/use-url-sync.ts`, line 18

```ts
const segments = path.split('/')
```

Unlike `isDirectoryInTree` which uses `.filter(Boolean)`, `fileExistsInTree` does not filter empty segments. A path like `docs//file.md` (double slash) would produce `["docs", "", "file.md"]` and fail to find the empty-string segment. This is minor since URLs are normalized, but for defensive coding:

```ts
const segments = path.split('/').filter(Boolean)
```

### 9. TiptapEditor Internal Link Navigation Skips Dirty Check Indirectly

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/components/TiptapEditor.tsx`, line 239

```ts
onSelect?.(resolved.split('#')[0])
```

This calls `handleNavigate` which does include the dirty check. So this is actually fine. No issue here -- noted for completeness.

---

## Low Priority

### 10. `resolveDefaultPage` Could Match Directories Named Like Index Files

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/client/utils/default-page-resolver.ts`

`findChildFiles` already filters to `type === 'file'` (line 15), so this is not actually a problem. The filtering is correct.

### 11. History State Object Is Empty

Lines 68, 78:
```ts
history.replaceState({}, '', ...)
history.pushState({}, '', ...)
```

Consider storing metadata in the state object (e.g., `{ filePath: resolved }`) for more robust popstate handling. Currently the handler re-parses from `location.pathname`, which works but is slightly fragile.

---

## Positive Observations

1. **Clean separation**: Three effects in `useUrlSync` each handle one concern (init, push, popstate). Easy to reason about.
2. **Guard against double-fire**: `initialResolved.current` ref prevents re-resolution on tree reference changes.
3. **Correct `replaceState` vs `pushState`**: Initial load uses `replaceState` (no spurious history entry), subsequent navigation uses `pushState`.
4. **Proper cleanup**: Popstate listener is correctly removed in effect cleanup.
5. **Dirty check integration**: `handleNavigate` correctly prompts before switching when edits are unsaved.
6. **Zero deps**: No React Router needed. Server's `app.get('*')` SPA catch-all at `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/src/server/app.ts` line 37 already supports this.
7. **Index priority list**: Pragmatic order (index > home > front > readme > numbered > first) covers common doc conventions.

---

## Recommended Actions (Priority Order)

1. **[Critical]** Fix encoding: Replace `encodeURI` with per-segment `encodeURIComponent`, ensure symmetric decode
2. **[High]** Add tree validation in popstate handler to reject non-existent paths
3. **[High]** Filter empty segments in `fileExistsInTree` for consistency with `isDirectoryInTree`
4. **[Medium]** Consider case-insensitive path matching for macOS/Windows compatibility
5. **[Low]** Store file path in history state object for more robust popstate handling

## Metrics

- Type Coverage: Good -- all functions typed, interfaces defined, no `any`
- Test Coverage: Unknown -- no test files found for these new modules
- Linting Issues: 1 (missing dep in Effect 1 -- `onInitialResolve` stable so safe)

## Unresolved Questions

1. Are filenames with `#`, `?`, or `&` characters expected in doc directories? If not, the encoding issue (Critical #1) is lower severity but still worth fixing defensively.
2. Should the popstate dirty check show `window.confirm`? Currently it does (via `handleNavigate`), but confirm dialogs blocking back/forward navigation can be a jarring UX. Consider `beforeunload` pattern instead.
3. Are tests planned for `default-page-resolver.ts` and `use-url-sync.ts`? Both are pure-logic-heavy and highly testable.
