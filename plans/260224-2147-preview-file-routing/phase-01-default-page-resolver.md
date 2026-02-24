# Phase 1: Default Page Resolver

## Context

- Parent: [plan.md](./plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260224-2147-preview-file-routing.md)
- Tree type: `packages/preview/src/client/hooks/use-tree.ts` (`TreeNode`)

## Overview

- **Priority**: High (Phase 2 depends on this)
- **Status**: Completed
- **Description**: Utility function to resolve directory paths → default index file, mimicking Apache/nginx DirectoryIndex

## Key Insights

- Tree scanner already sorts `index.md` first within each directory (line 38-45 of `tree-scanner.ts`)
- `TreeNode` has `name`, `type` ('file'|'directory'), `path` (relative), `children?`
- `useFlatTree` already flattens tree to `FlatFile[]` — useful for file existence checks
- Resolution must work for both root (`/`) and nested dirs (`/subdir/`)

## Requirements

### Functional
- Resolve root URL to global default page
- Resolve directory URL to that directory's index page
- Support priority chain: `index.md` → `home.md` → `front.md` → `README.md` → first numbered → first file
- Case-insensitive pattern matching

### Non-Functional
- Pure function, no side effects
- Reusable from hook and any future component

## Architecture

```
resolveDefaultPage(tree, dirPath?)
  → findChildFiles(tree, dirPath)  // get files at directory level
  → match INDEX_PATTERNS            // case-insensitive
  → fallback to numbered/first      // ultimate fallback
  → return path | null
```

## Related Code Files

| File | Action |
|------|--------|
| `src/client/utils/default-page-resolver.ts` | **Create** |
| `src/client/hooks/use-tree.ts` | Read (TreeNode type) |
| `src/server/utils/tree-scanner.ts` | Reference (sort order) |

## Implementation Steps

1. Create `src/client/utils/default-page-resolver.ts`
2. Define `INDEX_PATTERNS = ['index.md', 'home.md', 'front.md', 'readme.md']`
3. Implement `findChildFiles(tree: TreeNode[], dirPath?: string): TreeNode[]`
   - If no dirPath or empty → return top-level file nodes from tree
   - If dirPath → walk tree segments to find directory node → return its file children
4. Implement `resolveDefaultPage(tree: TreeNode[], dirPath?: string): string | null`
   - Get children via `findChildFiles`
   - Iterate INDEX_PATTERNS, match `.name.toLowerCase()` — return first match's `.path`
   - Fallback: find first child where `name` starts with digit — return `.path`
   - Ultimate fallback: return first child's `.path` or `null`
5. Export both functions (findChildFiles useful for URL-is-directory check)

## Todo

- [ ] Create `default-page-resolver.ts` with `resolveDefaultPage` and `findChildFiles`
- [ ] Handle root (no dirPath) and nested directory cases
- [ ] Case-insensitive matching for index patterns
- [ ] Numbered file fallback (`/^\d/` test)
- [ ] Export types for use in hook

## Success Criteria

- `resolveDefaultPage(tree)` returns root index page path
- `resolveDefaultPage(tree, 'subdir')` returns that directory's index page
- Returns `null` for empty tree or non-existent directory
- Patterns matched case-insensitively

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tree structure mismatch | Low | Using exact TreeNode type from use-tree.ts |
| Deeply nested dirs | Low | Walk path segments recursively |

## Next Steps

→ Phase 2 imports this to resolve URLs on load
