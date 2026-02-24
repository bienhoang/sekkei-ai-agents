# Phase 2: URL Sync Hook

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-default-page-resolver.md)
- App.tsx: `packages/preview/src/client/App.tsx`

## Overview

- **Priority**: High (core feature)
- **Status**: Completed
- **Description**: Custom React hook for bidirectional sync between `activePath` state and browser URL via History API

## Key Insights

- App.tsx has `activePath: string | null` state — null means no file selected
- `handleSelect(path)` is the single navigation entry point — sets activePath + clears editor state
- Tree loads async — URL resolution must wait for tree data
- Server catch-all already serves index.html for all non-API/non-asset paths
- `useFile(path)` fetches document when `activePath` changes — no extra work needed

## Requirements

### Functional
- On page load: parse URL → resolve to activePath (or default page if directory/root)
- On activePath change (sidebar click, next/prev nav): update URL bar without reload
- On browser back/forward: update activePath from URL
- Guard against double pushState (URL already matches)
- Handle invalid URLs gracefully (fallback to default page)

### Non-Functional
- No new dependencies
- Must not break existing navigation flow
- Must work in both workspace and guide modes

## Architecture

```
┌─────────────────────────────────────────────┐
│                useUrlSync                    │
│                                              │
│  Mount + tree ready:                         │
│    pathname → fileExistsInTree?              │
│      yes → setActivePath(path)              │
│      no  → resolveDefaultPage → setActive   │
│                                              │
│  activePath changed:                         │
│    if URL != path → pushState(path)         │
│                                              │
│  popstate event (back/forward):             │
│    pathname → setActivePath                  │
└─────────────────────────────────────────────┘
```

## Related Code Files

| File | Action |
|------|--------|
| `src/client/hooks/use-url-sync.ts` | **Create** |
| `src/client/utils/default-page-resolver.ts` | Import (Phase 1) |
| `src/client/hooks/use-tree.ts` | Import TreeNode type |
| `src/client/hooks/use-flat-tree.ts` | Reference for flat lookup |

## Implementation Steps

1. Create `src/client/hooks/use-url-sync.ts`
2. Define hook signature: `useUrlSync(activePath: string | null, setActivePath: (p: string | null) => void, tree: TreeNode[], treeLoading: boolean)`
3. **Helper**: `fileExistsInTree(tree: TreeNode[], path: string): boolean` — walk tree to check if path matches a file node
4. **Helper**: `urlPathToFilePath(pathname: string): string` — strip leading `/`, decode URI components
5. **Effect 1 — Initial resolution** (deps: `[tree, treeLoading]`):
   - Skip if treeLoading or tree empty
   - Read `location.pathname`, convert to file path
   - If path is empty or `/` → `resolveDefaultPage(tree)` → setActivePath
   - If path matches file in tree → setActivePath(path)
   - If path doesn't match but looks like directory → `resolveDefaultPage(tree, path)` → setActivePath
   - If nothing matches → `resolveDefaultPage(tree)` → setActivePath (fallback to root default)
   - Use `history.replaceState` (not push) for initial URL normalization
6. **Effect 2 — Push URL on activePath change** (deps: `[activePath]`):
   - Skip if activePath is null
   - Compute expected URL: `'/' + activePath`
   - If `location.pathname` already matches → skip (guard)
   - Else `history.pushState({}, '', '/' + encodeURI(activePath))`
7. **Effect 3 — Popstate listener** (deps: `[]`):
   - Add `popstate` event listener
   - On fire: read pathname → convert to file path → setActivePath
   - Cleanup: remove listener
8. Export hook

## Todo

- [ ] Create `use-url-sync.ts` hook
- [ ] Implement initial URL resolution (mount + tree ready)
- [ ] Implement pushState on activePath change (with guard)
- [ ] Implement popstate listener for back/forward
- [ ] Use `replaceState` for initial load (avoid extra history entry)
- [ ] Handle encoded characters in URL paths

## Success Criteria

- Page load with `/docs/file.md` → that file opens
- Page load with `/` → default index page opens
- Sidebar click → URL updates without reload
- Browser back → returns to previous document
- Reload → same document stays open
- Invalid URL → falls back to root default page

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tree not loaded on first render | Medium | Guard: skip resolution if treeLoading |
| Double pushState loop | Medium | Guard: check pathname before push |
| Race between initial resolution and user click | Low | activePath wins — user intent takes priority |
| URL encoding mismatch | Low | Consistent encode/decode at boundary |

## Security Considerations

- URL paths are decoded but only used for tree lookup — no filesystem access from client
- Server-side `safePath()` already validates paths in file API

## Next Steps

→ Phase 3 integrates this hook into App.tsx
