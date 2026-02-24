# Phase 3: App Integration

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-default-page-resolver.md), [Phase 2](./phase-02-url-sync-hook.md)
- Target file: `packages/preview/src/client/App.tsx`

## Overview

- **Priority**: High
- **Status**: Completed
- **Description**: Wire useUrlSync hook into App.tsx, replacing the empty initial state with URL-driven navigation

## Key Insights

- Current `activePath` starts as `null` → shows EmptyState component
- `handleSelect` already handles dirty check + state reset — popstate should also respect this
- Hook needs `tree` and `treeLoading` from existing `useTree()` call
- Minimal change: just import + one hook call + adjust handleSelect

## Requirements

### Functional
- App opens with URL-resolved document instead of empty state
- All existing navigation (sidebar, next/prev) continues to work
- Dirty check still works when URL changes (back/forward)

### Non-Functional
- Minimal diff — only add what's needed
- No regression in existing behavior

## Related Code Files

| File | Action |
|------|--------|
| `src/client/App.tsx` | **Modify** — add import + hook call |

## Implementation Steps

1. Import `useUrlSync` from `./hooks/use-url-sync.js`
2. Call `useUrlSync(activePath, setActivePath, tree, treeLoading)` after existing hooks (line ~29)
3. **Consider**: The popstate handler in useUrlSync calls `setActivePath` directly — this bypasses `handleSelect`'s dirty check. Two options:
   - **Option A (simple)**: Pass `handleSelect` to hook instead of raw `setActivePath` — then back/forward also checks dirty
   - **Option B (minimal)**: Keep raw `setActivePath` — back/forward skips dirty check (browser back = user intent to leave)
   - **Recommended**: Option A — consistent UX, user gets warned about unsaved changes on back/forward too
4. Adjust hook call: pass `handleSelect` as the navigation callback instead of `setActivePath`
   - But `handleSelect` also clears editor state — that's fine, we want that on navigation
   - For initial load (no dirty state possible), `setActivePath` is safe
5. Final approach: Hook takes two callbacks:
   - `onInitialResolve: (path: string) => void` — for mount resolution (just setActivePath)
   - `onNavigate: (path: string) => void` — for popstate (handleSelect, includes dirty check)

## Todo

- [ ] Import useUrlSync in App.tsx
- [ ] Call hook with activePath, tree, treeLoading, setActivePath, handleSelect
- [ ] Verify EmptyState only shows when tree is truly empty (not during loading)
- [ ] Test: sidebar click → URL updates
- [ ] Test: reload → same page
- [ ] Test: back/forward → navigates with dirty check

## Success Criteria

- App opens directly to default page (no more empty state on fresh load)
- All navigation paths update URL bar
- Back/forward triggers dirty check if unsaved changes exist
- No regressions in editor, sidebar, next/prev navigation

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hook runs before tree loads | Low | treeLoading guard in hook |
| handleSelect dirty prompt on popstate | Low | Expected UX — user warned |

## Next Steps

→ Phase 4 verifies server-side compatibility
