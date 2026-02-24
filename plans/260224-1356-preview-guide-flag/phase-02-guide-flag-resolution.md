# Phase 2: Add --guide Flag + Resolution Logic

## Context
- Parent: [plan.md](./plan.md)
- Depends on: Phase 1 (renamed user-guide structure)
- CLI: `packages/preview/src/cli.ts` (155 lines)
- Resolver: `packages/preview/src/resolve-docs-dir.ts` (51 lines)

## Overview
- **Priority:** High
- **Status:** complete
- **Description:** Add `--guide` boolean flag to CLI, create `resolveGuideDir()` function with dual resolution (bundled + monorepo)

## Key Insights
- Current `--docs <path>` stays unchanged — `--guide` is additive
- `parseArgs` already uses `strict: false`, so adding a new option is safe
- `packageDir` = `resolve(__dirname, '..')` — already computed in cli.ts
- When `--guide` + `--docs` both set: `--guide` takes precedence (guide is a specific mode)

## Architecture

### resolveGuideDir(packageDir: string): string

```
Priority 1: <packageDir>/guide/           → bundled in published package
Priority 2: walk up from packageDir to find docs/user-guide/  → monorepo dev
Priority 3: throw Error
```

Walk-up logic: from `packageDir`, go up max 5 levels looking for `docs/user-guide/`.

### CLI flow change

```
if (--guide) {
  docsDir = resolveGuideDir(packageDir)
  title = "Sekkei User Guide"
} else {
  docsDir = resolveDocsDir(values.docs)
  title = "Sekkei Docs"  (or from config)
}
```

## Related Code Files
- **Modify:** `packages/preview/src/cli.ts`
- **Modify:** `packages/preview/src/resolve-docs-dir.ts` (add `resolveGuideDir` export)

## Implementation Steps

### cli.ts changes
1. Add `guide: { type: 'boolean', default: false }` to parseArgs options
2. Update `printUsage()` — add `--guide` option description
3. After parseArgs, check `values.guide`:
   - If true: call `resolveGuideDir(packageDir)` instead of `resolveDocsDir()`
   - Set title to `"Sekkei User Guide"`
4. Pass title through to `generateVitePressConfig()` (already supported via `options.title`)

### resolve-docs-dir.ts changes
1. Add new exported function `resolveGuideDir(packageDir: string): string`
2. Priority 1: check `join(packageDir, 'guide')` exists
3. Priority 2: walk up from packageDir (max 5 levels) checking for `docs/user-guide/`
4. Priority 3: throw descriptive error

## Todo
- [x] Add `resolveGuideDir()` to resolve-docs-dir.ts
- [x] Add `--guide` flag to parseArgs in cli.ts
- [x] Update printUsage() help text
- [x] Wire guide mode: resolve dir + set title
- [x] Handle `--guide` + `--docs` conflict (guide wins, log warning)

## Success Criteria
- `sekkei-preview --guide` resolves to `docs/user-guide/` in dev mode
- `sekkei-preview --guide` resolves to `<pkg>/guide/` when bundled
- `sekkei-preview` (no flag) works unchanged
- `--help` shows new `--guide` option
- Error message is clear when guide dir not found

## Risk
- Walk-up resolution could match wrong directory in nested monorepo. Max 5 levels mitigates this.
