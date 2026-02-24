# Phase 2: Turborepo Setup

## Context Links
- [Plan Overview](./plan.md)
- [Phase 1 — Registry Migration](./phase-01-package-registry-migration.md)
- [Root package.json](../../package.json)
- [.gitignore](../../.gitignore)

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 30m
- **Depends on**: Phase 1 complete

Add Turborepo for build orchestration and caching. Replaces `npm run build --workspaces` with `turbo run build` for parallel execution + local/remote caching.

## Key Insights
- Current root scripts use `npm run build --workspaces` — sequential, no caching
- Turborepo adds: parallel task execution, local `.turbo` cache, task dependency graph
- `packages/skills` has no real build (`echo 'No build needed'`) — turbo handles this gracefully
- `packages/preview` build copies user-guide files — needs `outputs` config
- Only `mcp-server` has tests — turbo `test` task only runs where defined

## Requirements

### Functional
- `turbo` installed as root devDependency
- `turbo.json` defines `build`, `lint`, `test` pipelines
- Root `package.json` scripts delegate to `turbo run`
- `.turbo/` added to `.gitignore`

### Non-Functional
- `turbo run build` produces same output as current `npm run build --workspaces`
- Cache invalidation works correctly (changing source re-triggers build)

## Architecture

```
turbo run build
├── @bienhoang/sekkei-mcp-server  → tsc → dist/
├── @bienhoang/sekkei-preview     → tsc + build:guide → dist/ + guide/
└── @bienhoang/sekkei-skills      → echo (no-op, cached immediately)
```

Task dependency: `lint` depends on nothing. `build` depends on nothing (packages are independent). `test` depends on `build` (needs compiled JS).

## Related Code Files

| File | Change |
|------|--------|
| `package.json` (root) | Add `turbo` devDep, update scripts |
| `turbo.json` | **New file** — pipeline config |
| `.gitignore` | Add `.turbo/` |

## Implementation Steps

### Step 1: Install Turborepo

```bash
npm install -D turbo
```

This adds `turbo` to root `package.json` devDependencies.

### Step 2: Create `turbo.json`

**New file**: `turbo.json` (repo root)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "env": ["NODE_OPTIONS"]
    }
  }
}
```

Notes:
- `build.outputs`: `dist/**` — cache key for all packages
- `lint.dependsOn`: `^build` — lint after dependencies build (type checking needs compiled deps)
- `test.dependsOn`: `build` — tests need compiled JS
- `test.env`: `NODE_OPTIONS` included because `--experimental-vm-modules` affects test behavior

### Step 3: Update root `package.json` scripts

**File**: `package.json`

**Before**:
```json
{
  "scripts": {
    "build": "npm run build --workspaces",
    "build:mcp": "npm run build --workspace=packages/mcp-server",
    "build:preview": "npm run build --workspace=packages/preview",
    "test": "npm run test --workspace=packages/mcp-server",
    "lint": "npm run lint --workspaces"
  }
}
```

**After**:
```json
{
  "scripts": {
    "build": "turbo run build",
    "build:mcp": "turbo run build --filter=@bienhoang/sekkei-mcp-server",
    "build:preview": "turbo run build --filter=@bienhoang/sekkei-preview",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

Keep `"private": true` and `"workspaces"` — Turborepo uses npm workspaces for package discovery.

### Step 4: Add `.turbo/` to `.gitignore`

**File**: `.gitignore`

Append:
```
.turbo/
```

### Step 5: Verify

```bash
# Clean build
rm -rf packages/*/dist
turbo run build
# Should compile all 3 packages in parallel

# Cached build (instant)
turbo run build
# Should show "FULL TURBO" — all cached

# Test
turbo run test
```

## Todo List

- [ ] `npm install -D turbo`
- [ ] Create `turbo.json` with `build`, `lint`, `test` tasks
- [ ] Update root `package.json` scripts to use `turbo run`
- [ ] Add `.turbo/` to `.gitignore`
- [ ] Verify `turbo run build` works
- [ ] Verify `turbo run test` works
- [ ] Verify cache works (second run is instant)

## Success Criteria

- `turbo run build` completes successfully for all 3 packages
- `turbo run test` runs mcp-server tests and passes
- Second `turbo run build` shows cache hit (prints "FULL TURBO")
- `turbo run lint` type-checks all packages
- `.turbo/` directory exists but is gitignored

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Turbo cache stale | Low — wrong build cached | `turbo run build --force` to bypass |
| `NODE_OPTIONS` not passed to test | Medium — tests fail | Declared in `turbo.json` `env` array |
| `build:guide` subtask not cached | Low | Included in `dist/**` outputs glob |

## Security Considerations
- No secrets involved in this phase
- `.turbo/` cache is local-only (no remote cache configured)

## Next Steps
- Phase 3 (Changesets) can proceed independently but conventionally after this
- Phase 4 (CI/CD) uses `turbo run` commands
