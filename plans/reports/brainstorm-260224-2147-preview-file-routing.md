# Brainstorm: Preview File-Based URL Routing

## Problem Statement

Preview app has zero URL routing — navigation is pure React state (`activePath`). This means:
- URLs don't reflect current document (always `localhost:4983/`)
- Can't copy/share links to specific documents
- Page reload loses current position (returns to blank/first page)
- No default landing page (opens to empty state)

## Requirements

1. **URL ↔ file sync**: URL bar reflects active document path
2. **Shareable URLs**: Copy URL → paste in another tab → same document
3. **Reload persistence**: Refresh keeps current document
4. **Browser history**: Back/forward buttons work
5. **Default index pages**: Root/directory URLs auto-resolve to index page
6. **Index priority**: `index.md` → `home.md` → `front.md` → `README.md` → first `01-*` numbered → first file

## Chosen Approach: Native History API (Zero Dependencies)

### Why Not Others

| Approach | Verdict |
|----------|---------|
| **React Router** | Overkill. We only need URL↔state sync, not nested routes, loaders, or transitions. Adds ~15KB. |
| **Hash-based** | Works but ugly URLs (`/#/path`). History API is equally simple with existing SPA catch-all. |
| **History API** ✅ | Zero deps. Server already has `*` catch-all. Native `pushState`/`popstate`. ~70 lines total. |

### Architecture

```
URL: /docs/basic-design/01-overview.md
      ↕ (bidirectional sync)
State: activePath = "docs/basic-design/01-overview.md"
      ↕ (existing flow)
API: GET /api/files?path=docs/basic-design/01-overview.md
```

**Flow on page load:**
1. Browser requests `/docs/basic-design/01-overview.md`
2. Express catch-all serves `index.html` (existing behavior)
3. React mounts → `useUrlSync` reads `location.pathname`
4. If path matches a file in tree → set `activePath`
5. If path is directory or `/` → resolve default page → set `activePath`

**Flow on navigation click:**
1. User clicks file in sidebar → `setActivePath(path)`
2. `useUrlSync` detects change → `pushState({}, '', '/' + path)`
3. URL bar updates, no page reload

**Flow on back/forward:**
1. Browser fires `popstate` event
2. `useUrlSync` reads new `location.pathname`
3. Updates `activePath` accordingly

### Implementation Plan

#### 1. Default page resolver (`src/utils/default-page-resolver.ts`, ~30 LOC)

```typescript
const INDEX_PATTERNS = ['index.md', 'home.md', 'front.md', 'readme.md'];

function resolveDefaultPage(tree: TreeNode[], dirPath?: string): string | null {
  const children = dirPath ? findChildren(tree, dirPath) : getTopLevelFiles(tree);

  // Priority 1: Known index patterns (case-insensitive)
  for (const pattern of INDEX_PATTERNS) {
    const match = children.find(c => c.name.toLowerCase() === pattern);
    if (match) return match.path;
  }

  // Priority 2: First numbered file (01-*, 1-*, etc.)
  const numbered = children.find(c => /^\d/.test(c.name));
  if (numbered) return numbered.path;

  // Priority 3: First file in sort order
  return children[0]?.path ?? null;
}
```

#### 2. URL sync hook (`src/hooks/use-url-sync.ts`, ~40 LOC)

```typescript
function useUrlSync(activePath: string | null, setActivePath, tree) {
  // On mount: read URL → set initial activePath
  useEffect(() => {
    const urlPath = decodeURIComponent(location.pathname).replace(/^\//, '');
    if (urlPath && fileExistsInTree(tree, urlPath)) {
      setActivePath(urlPath);
    } else {
      // Root or directory → resolve default
      const defaultPage = resolveDefaultPage(tree, urlPath || undefined);
      if (defaultPage) setActivePath(defaultPage);
    }
  }, [tree]); // Run when tree loads

  // On activePath change: push URL
  useEffect(() => {
    if (activePath) {
      const newUrl = '/' + encodeURIPath(activePath);
      if (location.pathname !== newUrl) {
        history.pushState({}, '', newUrl);
      }
    }
  }, [activePath]);

  // Listen for popstate (back/forward)
  useEffect(() => {
    const handler = () => {
      const urlPath = decodeURIComponent(location.pathname).replace(/^\//, '');
      setActivePath(urlPath || null);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
}
```

#### 3. App.tsx integration (~5 LOC change)

```typescript
// Add to App.tsx
useUrlSync(activePath, setActivePath, tree);
```

#### 4. Server-side (minimal, ~3 LOC)

Current catch-all already works. Only tweak: ensure the catch-all doesn't match `/api/*` or `/docs-assets/*` (already ordered correctly in Express).

Optional: Add explicit content-type check to prevent serving HTML for `.js`/`.css` requests that 404.

### Default Page Resolution Priority

```
Directory requested → search in order:
  1. index.md        (web standard)
  2. home.md         (alternative)
  3. front.md        (alternative)
  4. README.md       (git convention)
  5. First 0*-*.md   (numbered, already sorted first by tree-scanner)
  6. First file      (ultimate fallback)
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Invalid URL path | Resolve to root default page |
| URL with query params | Strip params, use path only |
| URL with `.md` extension | Direct file match |
| URL without extension | Try as directory → resolve index |
| Encoded characters in path | `decodeURIComponent` handles |
| Guide mode vs workspace mode | Same routing logic, different docs root |

### Files to Modify

| File | Change |
|------|--------|
| `src/utils/default-page-resolver.ts` | **New** — index page resolution logic |
| `src/hooks/use-url-sync.ts` | **New** — URL ↔ state bidirectional sync |
| `src/App.tsx` | Integrate `useUrlSync`, remove manual initial page logic if any |
| `src/components/Sidebar.tsx` | No change needed — already calls `setActivePath` |
| `server/index.ts` | Minimal — may need to refine catch-all pattern |

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| URL conflicts with `/api/*` routes | Low | API routes registered before catch-all |
| URL conflicts with `/docs-assets/*` | Low | Static middleware registered before catch-all |
| Double pushState on initial load | Medium | Guard: check if URL already matches before pushing |
| Tree not loaded yet on mount | Medium | Run URL resolution in `useEffect` depending on tree state |
| Special chars in file names | Low | Use `encodeURIComponent`/`decodeURIComponent` |

### Success Criteria

- [ ] URL bar shows current document path
- [ ] Copy URL → new tab → same document loads
- [ ] F5/reload maintains current document
- [ ] Back/forward buttons navigate document history
- [ ] Root URL (`/`) loads default index page
- [ ] Directory URLs resolve to their index page
- [ ] No regressions in existing sidebar navigation
- [ ] Both workspace and guide modes work
