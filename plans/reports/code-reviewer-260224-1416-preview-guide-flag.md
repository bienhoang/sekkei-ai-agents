# Code Review — Preview --guide Flag & User-Guide Restructure

**Date:** 2026-02-24
**Reviewer:** code-reviewer agent
**Plan:** `plans/260224-1356-preview-guide-flag/plan.md` (status: complete)

---

## Scope

- **Files reviewed:** 5
  - `packages/preview/src/cli.ts`
  - `packages/preview/src/resolve-docs-dir.ts`
  - `packages/preview/src/generate-config.ts`
  - `packages/preview/package.json`
  - `packages/preview/.gitignore`
- **LOC changed:** ~75 net additions
- **Focus:** Guide resolution correctness, CLI flag edge cases, config template string safety

---

## Overall Assessment

Solid, minimal implementation. The dual-resolution strategy (bundled vs monorepo walk-up) is clean and correct. TypeScript type check passes with zero errors. Three issues worth addressing: one medium (artifact leak on `build` command), one medium (CJS `require()` in ESM package context fragility), one low (warning not surfaced to stderr on conflict).

---

## Critical Issues

None.

---

## High Priority

None.

---

## Medium Priority

### 1. `.vitepress/` artifacts written into `guide/` on `build`/`serve` — not cleaned up

**File:** `packages/preview/src/cli.ts`, lines 113–128

**Problem:** `cleanup()` is only called when `command === 'dev'` (line 157). When `--guide build` or `--guide serve` is run, `docsDir` points to `guide/` (either the bundled copy or the live monorepo `docs/user-guide/`). The generated `guide/.vitepress/config.mts`, `guide/.vitepress/theme/`, and the `guide/node_modules` symlink are never removed after the process exits.

In the **bundled package scenario** (`guide/` is a real directory inside the npm package), this pollutes the bundled artifact with ephemeral generated files. In the **monorepo dev scenario** (`docs/user-guide/`), this pollutes the source tree. The `.gitignore` does not cover `docs/user-guide/.vitepress/`.

**Impact:** `npm pack` / publish would include stale `config.mts` and `theme/` in `guide/`. Git diff will show dirty state in `docs/user-guide/` after `build`.

**Fix:** Remove the `command === 'dev'` guard so cleanup always runs on process close:

```typescript
// cli.ts line 157 — change:
child.on('close', (code) => {
  if (command === 'dev') cleanup();   // BUG: build/serve skip cleanup
  process.exit(code ?? 0);
});

// to:
child.on('close', (code) => {
  cleanup();
  process.exit(code ?? 0);
});
```

Alternatively, only skip cleanup for `build` if the intent is to preserve the generated site in `guide/dist/`, but then restrict cleanup to symlink + config only, not the whole theme dir.

---

### 2. `build:guide` uses CJS `require()` inside an `"type": "module"` package

**File:** `packages/preview/package.json`, line 18

```json
"build:guide": "node -e \"const {cpSync}=require('fs');cpSync('../../docs/user-guide','./guide',{recursive:true})\""
```

**Problem:** `packages/preview/package.json` declares `"type": "module"`. When Node executes `-e` inline scripts, it uses the package type of the nearest `package.json`. On Node ≥ 20 this currently works because `-e` is still treated as CJS by default regardless of `"type"` (it uses `vm.Script`, not the ESM loader). However, this is an implementation detail and has been a source of confusion / breakage across Node versions.

**Impact:** Low probability of breakage today on Node 20, but fragile. Notably, `cpSync` was added in Node 16.7.0 so the Node ≥ 20 engine constraint makes it safe on _that_ API.

**Fix:** Use ESM-safe inline syntax, or move to a tiny script file:

```json
"build:guide": "node --input-type=commonjs -e \"const {cpSync}=require('fs');cpSync('../../docs/user-guide','./guide',{recursive:true})\""
```

Or cleaner — since Node ≥ 20 is required — use the ESM form:

```json
"build:guide": "node --input-type=module -e \"import{cpSync}from'fs';cpSync('../../docs/user-guide','./guide',{recursive:true})\""
```

---

## Low Priority

### 3. `--guide` + `--docs` conflict warning goes to `console.warn` (stdout) instead of `console.error` (stderr)

**File:** `packages/preview/src/cli.ts`, line 74

```typescript
console.warn('Warning: --guide takes precedence over --docs');
```

**Problem:** All other diagnostic messages in this file use `console.error()`. Using `console.warn()` sends to stdout on some environments (it maps to stderr in Node, but the intent is inconsistent). Keeping it `console.error()` is consistent with the file's convention.

**Fix:** One-line change:

```typescript
console.error('Warning: --guide takes precedence over --docs');
```

---

### 4. `resolveGuideDir` walk-up: in monorepo with `guide/` already built, Priority 1 wins unintentionally

**File:** `packages/preview/src/resolve-docs-dir.ts`, lines 61–62

```typescript
const bundled = join(packageDir, 'guide');
if (existsSync(bundled)) return bundled;
```

**Problem:** In the monorepo dev workflow, after `build:guide` has been run once, `packages/preview/guide/` exists as a _real directory copy_ (not a symlink). From that point on, `resolveGuideDir` always returns the stale copy, bypassing the live `docs/user-guide/`. Changes to `docs/user-guide/` during dev are invisible until `build:guide` is re-run.

This is arguably by design (the plan notes `bundled → monorepo` priority ordering), but the behavior is counter-intuitive during local development. A developer running `sekkei-preview --guide dev` after one `npm run build` would see stale content.

**Recommendation (not blocking):** Consider checking whether we are running from the monorepo by detecting the presence of `../../docs/user-guide` relative to `packageDir` before checking for `guide/`, or add a comment warning that the dev workflow requires deleting `guide/` when iterating on docs.

---

## Edge Cases — Scout Findings

| Scenario | Status |
|---|---|
| `--guide serve` with missing `.vitepress/dist/` | Safe — VitePress errors naturally on `serve` without prior build; no special handling needed |
| `--guide` + SIGINT during dev: cleanup on signal path | Correct — signal handler calls `child.kill(sig)`, which triggers `child.on('close')`, which calls `cleanup()` for `dev` (issue #1 above applies to non-dev) |
| `resolveGuideDir` on filesystem root (loop guard) | Correct — `parent === current` break condition handles this |
| `guide/` directory exists but is empty | `resolveGuideDir` returns it; `generateIndexIfMissing` generates `index.md`; sidebar is empty → VitePress renders empty site. Graceful. |
| `description` with special chars / injection into config.mts | Safe — `JSON.stringify()` used for both `title` and `description` (the Phase 3 fix was correct) |
| `--guide` + `--edit` combined | Works — `edit` and `guide` flags are independent. Edit mode would write `sekkeiFileApiPlugin` pointing to `guide/` as docsDir, which is reasonable |
| Walk-up hitting symlinked directories | `existsSync` follows symlinks; `dirname` on a symlink returns the containing directory not the link target — behaves correctly |

---

## Positive Observations

- `JSON.stringify()` used for all user-supplied strings interpolated into the config template — eliminates injection entirely (improvement over prior hardcoded string)
- Guard `isNaN(port) || port < 1 || port > 65535` is thorough
- Walk-up loop has a depth cap (5) and a filesystem-root guard — both defensive
- `strict: false` in `parseArgs` is intentional (tolerates unknown flags from callers)
- Cleanup is best-effort (`try/catch` per block) — correct for signal-interrupt scenarios
- `guide/` added to both `.gitignore` (excludes from repo) and `files` (includes in npm publish) — no contradiction; `files` overrides `.gitignore` for `npm publish`
- `console.warn` on flag conflict rather than silent suppression is user-friendly even if it should be `console.error`

---

## Recommended Actions

1. **(Medium)** Fix cleanup to run for all commands, not just `dev` — prevents artifact leak into published `guide/` and dirty `docs/user-guide/` after build/serve. See Issue #1.
2. **(Medium)** Pin `--input-type=commonjs` on the `build:guide` inline script or convert to ESM form for long-term safety. See Issue #2.
3. **(Low)** Switch conflict warning to `console.error` for consistency. One-line change. See Issue #3.
4. **(Advisory)** Add a comment in `resolveGuideDir` that developers should delete `guide/` when iterating on `docs/user-guide/` in a monorepo context.

---

## Metrics

| Metric | Value |
|---|---|
| TypeScript errors (tsc --noEmit) | 0 |
| Linting issues | 0 |
| Test coverage | N/A (no tests for new CLI flag) |
| Files changed | 5 |
| Net LOC added | ~75 |

---

## Plan Verification

All 5 phases marked `complete` in `plan.md`. Changes match plan scope. No TODO items outstanding.

---

## Unresolved Questions

1. Is the intent for `--guide serve`/`--guide build` to preserve VitePress output in `guide/dist/`? If yes, Issue #1 cleanup behavior should be scoped to symlink + config only, not the full `.vitepress/` dir.
2. Should `--guide` be compatible with `--edit`? Currently it works but is undocumented. Is WYSIWYG editing of the user-guide intentional?
