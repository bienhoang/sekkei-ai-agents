# Phase 5: Dual Mode — Workspace + Guide

## Context Links
- Plan: [plan.md](./plan.md)
- Phase 2: [phase-02-express-server-api.md](./phase-02-express-server-api.md) — `GET /api/system` already returns `mode`
- Phase 3: [phase-03-react-frontend-tree.md](./phase-03-react-frontend-tree.md) — `useSystem` + `readonly` prop wired
- Phase 4: [phase-04-tiptap-editor.md](./phase-04-tiptap-editor.md) — `editable: !readonly` in useEditor
- Reuse: `packages/preview/src/server/utils/resolve-docs-dir.ts` — `resolveGuideDir()`
- Guide source: `docs/user-guide/` (monorepo) or `guide/` (published package)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 2h
- **Depends on:** Phase 2 (server mode flag), Phase 4 (readonly editor)

Dual mode is largely already wired through prior phases. This phase verifies the full end-to-end flow for both modes, adds the `build:guide` copy step to the dual build, and confirms guide mode is fully read-only (no PUT, no toolbar, no dirty state).

## Key Insights
- `resolveGuideDir()` already exists (moved in Phase 2) — priority: `<packageDir>/guide/` → walk up to `docs/user-guide/`
- Mode propagates: CLI `--guide` flag → `resolveGuideDir()` → Express `mode='guide'` → `GET /api/system` → `useSystem()` → `readonly` prop → Tiptap `editable: false`
- Server already returns 403 on `PUT /api/files` when `mode === 'guide'` (Phase 2)
- `build:guide` script already exists in package.json (Phase 1) — copy `docs/user-guide/ → guide/`
- No changes needed to `resolve-docs-dir.ts` or `resolve-guide-dir` logic
- The only new work: verify build:guide produces correct output, add guide/ to .gitignore if missing, smoke test both modes

## Requirements

### Functional
- `sekkei-preview --guide` serves `guide/` (or `docs/user-guide/` in monorepo dev)
- Guide mode: tree shows files, clicking file opens in readonly Tiptap (no cursor, no input)
- Guide mode: no toolbar rendered, no Save button visible, no dirty indicator
- Guide mode: `PUT /api/files` returns 403
- Guide mode: `GET /api/system` returns `{ mode: 'guide', version }`
- Guide mode: SystemBar shows blue "guide" badge (already implemented in Phase 3)
- Workspace mode: all edit/save features work as in Phase 4
- `npm run build` includes `build:guide` copy step

### Non-functional
- `guide/` dir excluded from git (add to `.gitignore` if not present)
- No changes to MCP server or other packages

## Architecture

Mode flow (already wired — this phase validates):

```
CLI --guide flag
  └→ resolveGuideDir(packageDir)        [src/server/utils/resolve-docs-dir.ts]
       └→ Express createApp({ mode: 'guide' })   [src/server/app.ts]
            └→ GET /api/system → { mode: 'guide' }
                 └→ useSystem() in React
                      └→ readonly = system.mode === 'guide'
                           └→ TiptapEditor editable: false
                                └→ no toolbar rendered
```

## Files to Verify / Modify

### Verify (no code changes expected)
- `src/server/utils/resolve-docs-dir.ts` — `resolveGuideDir()` exists and correct
- `src/server/index.ts` — `--guide` flag parsed, `resolveGuideDir()` called, `mode='guide'` passed to `createApp()`
- `src/server/routes/files.ts` — PUT returns 403 when `mode === 'guide'`
- `src/server/app.ts` — `mode` passed through to `createFilesRouter()`
- `src/client/App.tsx` — `readonly = system?.mode === 'guide'` correct
- `src/client/components/TiptapEditor.tsx` — `editable: !readonly`, toolbar hidden when `readonly`

### Modify if missing
- `.gitignore` (root or package-level) — add `packages/preview/guide/`
- `package.json` `build` script — verify `vite build && tsup && npm run build:guide` order

### Confirm build:guide script
Current script in package.json (from Phase 1):
```json
"build:guide": "node --input-type=commonjs -e \"const {cpSync}=require('fs');cpSync('../../docs/user-guide','./guide',{recursive:true})\""
```
- This copies from `../../docs/user-guide` (relative to `packages/preview/`) → `./guide/`
- Verify path resolves correctly from `packages/preview/`
- If `docs/user-guide/` doesn't exist in CI, script should fail gracefully (add `|| true` for optional copy)

## Implementation Steps

### 1. Trace mode flow — verify each file
```bash
# Check src/server/index.ts has --guide handling
grep -n 'guide\|resolveGuideDir\|mode' packages/preview/src/server/index.ts

# Check routes/files.ts has guide 403
grep -n 'guide\|403' packages/preview/src/server/routes/files.ts

# Check App.tsx readonly logic
grep -n 'guide\|readonly' packages/preview/src/client/App.tsx
```
Fix any gaps found.

### 2. Harden build:guide script
Update `package.json` build script to copy guide only if source exists:
```json
"build": "vite build && tsup && npm run build:guide",
"build:guide": "node --input-type=commonjs -e \"const {cpSync, existsSync}=require('fs'); const src='../../docs/user-guide'; if(existsSync(src)) cpSync(src,'./guide',{recursive:true}); else console.log('Warning: docs/user-guide not found, skipping guide copy');\""
```

### 3. Update .gitignore
```bash
# At repo root
echo 'packages/preview/guide/' >> .gitignore
# or in packages/preview/.gitignore if it exists
```

### 4. Smoke test workspace mode
```bash
npm run build

# Create minimal test docs dir
mkdir -p /tmp/test-docs
echo '---
title: Test Document
---
# Hello
This is a test.' > /tmp/test-docs/test.md

node dist/server.js --docs /tmp/test-docs --no-open
# Open http://localhost:4983
# Verify: tree shows test.md, click opens editor, edit works, save persists
```

### 5. Smoke test guide mode
```bash
node dist/server.js --guide --no-open
# Open http://localhost:4983
# Verify:
# - SystemBar shows blue "guide" badge
# - Tree shows guide files
# - Click file → opens in editor (no toolbar visible)
# - Cannot type in editor
# - curl -X PUT http://localhost:4983/api/files?path=any.md -H 'Content-Type: application/json' -d '{"content":"x"}' → 403
```

### 6. Verify GET /api/system in both modes
```bash
# Workspace mode
curl http://localhost:4983/api/system
# Expected: {"version":"1.0.0","mode":"workspace"}

# Guide mode
curl http://localhost:4983/api/system
# Expected: {"version":"1.0.0","mode":"guide"}
```

### 7. Verify resolveGuideDir fallback (monorepo dev)
```bash
# In monorepo root (no guide/ dir yet):
node packages/preview/dist/server.js --guide --no-open
# Should resolve to docs/user-guide/ via walk-up logic
```

## Todo List
- [ ] Trace mode flow — grep each file for gaps, fix if needed
- [ ] Harden build:guide script with existsSync guard
- [ ] Add `packages/preview/guide/` to .gitignore
- [ ] `npm run build` — verify guide/ populated
- [ ] Smoke test workspace mode (tree, edit, save)
- [ ] Smoke test guide mode (readonly, no toolbar, 403 on PUT)
- [ ] Verify `GET /api/system` returns correct mode in both cases
- [ ] Verify `resolveGuideDir` fallback to `docs/user-guide/` in monorepo dev

## Success Criteria
- `sekkei-preview` (workspace): full edit/save works
- `sekkei-preview --guide`: tree shows files, editor is read-only, no toolbar, PUT returns 403
- `GET /api/system` returns correct `mode` in both cases
- SystemBar badge color differs: green=workspace, blue=guide
- `guide/` excluded from git

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `docs/user-guide/` absent in published package (no guide/ copy) | Medium | High | `resolveGuideDir` priority 1 = `<packageDir>/guide/` — build must run `build:guide` before publish |
| Guide mode PUT not blocked if mode not passed to router | Low | High | Phase 2 design passes `mode` to `createFilesRouter` — grep to verify |
| `cpSync` fails on Windows (path separator) | Low | Low | Use `path.resolve` in script; test on CI only if Windows runner used |
| `resolveGuideDir` walk-up finds wrong `docs/user-guide/` | Very Low | Low | Bounded to 5 levels; unlikely to find false positives |

## Security Considerations
- Guide mode 403 on PUT is enforced server-side — cannot be bypassed from client
- `resolveGuideDir` resolves absolute path — no user-controlled input used for guide dir resolution
- `guide/` contents are read-only markdown — no executable files copied

## Next Steps
- Phase 6: Update sekkei:preview skill + run E2E validation across both modes
