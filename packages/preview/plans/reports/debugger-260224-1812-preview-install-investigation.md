# Debugger Report: Preview Package Install & Stale Version Investigation

**Date:** 2026-02-24
**Scope:** How `sekkei-preview` gets installed/built during setup and init; where old versions can persist.

---

## Executive Summary

The preview package is built correctly in `install.sh` (force `rm -rf dist/` then `npm run build`). However:

1. `sekkei init` (the interactive wizard) does **not** build the preview package at all.
2. `sekkei update` (the `update` CLI command) does **not** rebuild the preview package.
3. The adapter `SKILL.md` at `packages/mcp-server/adapters/claude-code/SKILL.md` references a stale path `packages/sekkei-preview/` instead of the actual `packages/preview/`.
4. No health check verifies the preview build is present or up-to-date.
5. `npm install` in `install.sh` runs `npm install` only on `packages/mcp-server` — preview dependencies are only installed when building the preview package.

---

## Detailed Findings

### 1. `install.sh` — Setup on initial/re-install (correct, but conditional)

File: `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/install.sh`

**Lines 87–103:**
```bash
PREVIEW_DIR="$SCRIPT_DIR/packages/preview"
if [[ -d "$PREVIEW_DIR" && -f "$PREVIEW_DIR/package.json" ]]; then
  step "Building sekkei-preview package"
  cd "$PREVIEW_DIR"
  npm install --no-fund --no-audit 2>&1 | tail -1
  rm -rf dist/                     # ← force wipe, good
  npm run build 2>&1 | tail -1
  PREVIEW_CLI="$PREVIEW_DIR/dist/cli.js"
  cd "$SCRIPT_DIR"
else
  warn "sekkei-preview package not found — skipping (preview unavailable)"
fi
```

**Assessment:** Correct — wipes old `dist/` before rebuild. This path is safe from stale artifacts.

**BUT:** This only runs when `install.sh` or `setup.sh` (one-line installer) is executed. It is NOT triggered by `sekkei init` or `sekkei update`.

---

### 2. `sekkei init` (bin/init.js) — Does NOT build preview

File: `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/bin/init.js`

The `installDeps()` call (step 10) only handles:
- Python venv + pip install
- Playwright chromium
- MCP server build (only if `dist/index.js` is missing)

**No mention of preview anywhere in `bin/init.js` or `bin/init/deps.js`.**

If a user runs `sekkei init` after updating the repo manually, the preview package stays at its old version.

---

### 3. `sekkei update` CLI command — Does NOT rebuild preview

File: `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/cli/commands/update.ts`

Steps performed:
1. Build MCP server (`npx tsc`)
2. Copy skill files
3. Regenerate sub-command stubs
4. Update MCP entry in `settings.json`
5. Health check

**No step rebuilds `packages/preview/`.**

When a user runs `sekkei update` or `/sekkei:rebuild`, the preview package stays stale.

---

### 4. Stale path in adapter SKILL.md

File: `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/adapters/claude-code/SKILL.md` line 816:

```
node <sekkei-path>/packages/sekkei-preview/dist/cli.js
```

Actual package directory: `packages/preview/` (not `packages/sekkei-preview/`).

This means the fallback `node ...` command in the SKILL.md would fail with "no such file".

---

### 5. No health check for preview

File: `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/src/cli/commands/health-check.ts`

The `checkHealth()` function checks: Node.js, Python, Playwright, Templates, Config, Python venv, Skill (SKILL.md), MCP registration, sub-command stubs.

**No check for `packages/preview/dist/server.js` existence or freshness.**

`sekkei doctor` will report all-green even if the preview package has never been built.

---

### 6. Where old version persists

| Scenario | Preview built? | Stale risk |
|---|---|---|
| Fresh `setup.sh \| bash` | YES (install.sh runs) | No |
| Re-run `setup.sh \| bash` (update) | YES (rm -rf dist/ then rebuild) | No |
| Run `install.sh` directly | YES | No |
| `sekkei init` only | NO | Old dist/ stays |
| `sekkei update` / `/sekkei:rebuild` | NO | Old dist/ stays |
| Manual `git pull` + no rebuild | NO | Old dist/ stays |
| `npm install` in mcp-server only | NO | Old dist/ stays |

---

## What Needs to Change

### Fix 1 (High priority): Add preview build to `sekkei update` command

`packages/mcp-server/src/cli/commands/update.ts` — add a step after MCP build:

```typescript
// After step 1 (build MCP), add:
const previewDir = resolve(SEKKEI_ROOT, "packages", "preview");
if (existsSync(join(previewDir, "package.json"))) {
  s.start("Building sekkei-preview...");
  try {
    execSync("npm install --no-fund --no-audit", { cwd: previewDir, stdio: "pipe" });
    execSync("npm run build", { cwd: previewDir, stdio: "pipe" });
    s.stop("sekkei-preview built");
  } catch {
    s.stop("sekkei-preview build failed (non-fatal)");
  }
}
```

### Fix 2 (Medium): Add preview build to `bin/init/deps.js`

`installDeps()` should rebuild preview alongside MCP server:

```javascript
// After the MCP server build block, add:
const previewDir = resolve(mcpDir, "..", "preview");
if (existsSync(resolve(previewDir, "package.json"))) {
  s.start("Building sekkei-preview...");
  try {
    execFileSync("npm", ["install", "--no-fund", "--no-audit"], { cwd: previewDir, stdio: "pipe" });
    execFileSync("npm", ["run", "build"], { cwd: previewDir, stdio: "pipe", timeout: 120_000 });
    s.stop(t(lang, "preview_done") || "sekkei-preview built");
  } catch {
    s.stop("sekkei-preview build failed (non-fatal)");
  }
}
```

### Fix 3 (Low): Correct stale path in adapters SKILL.md

File: `packages/mcp-server/adapters/claude-code/SKILL.md` line 816

Change:
```
node <sekkei-path>/packages/sekkei-preview/dist/cli.js
```
To:
```
node <sekkei-path>/packages/preview/dist/server.js
```

Note: the binary is `sekkei-preview` (from `package.json` bin field pointing to `./dist/server.js`), not `dist/cli.js`.

### Fix 4 (Low): Add preview health check

`packages/mcp-server/src/cli/commands/health-check.ts` — add a new check:

```typescript
function checkPreviewBuild(): HealthItem {
  const previewEntry = resolve(PKG_ROOT, "..", "preview", "dist", "server.js");
  if (existsSync(previewEntry)) {
    return { name: "Preview", status: "ok", detail: previewEntry };
  }
  return { name: "Preview", status: "warn", detail: "not built — run: sekkei update" };
}
```

And add to `checkHealth()` `paths` array.

---

## Summary of Issues

| # | Issue | Severity | File |
|---|---|---|---|
| 1 | `sekkei update` doesn't rebuild preview | High | `src/cli/commands/update.ts` |
| 2 | `sekkei init` doesn't build preview | Medium | `bin/init/deps.js` |
| 3 | Stale path `packages/sekkei-preview/` in adapter SKILL.md | Medium | `adapters/claude-code/SKILL.md:816` |
| 4 | No health check for preview build | Low | `src/cli/commands/health-check.ts` |

---

## Unresolved Questions

- Should the preview build be skipped with `--skip-build` flag in `sekkei update`? Currently that flag only skips MCP server build.
- Is `packages/mcp-server/adapters/claude-code/SKILL.md` auto-copied to `~/.claude/skills/sekkei/` during install, or is `packages/skills/content/` the canonical source? The `update.ts` copies from `packages/skills/content` — so the adapter SKILL.md may not be the installed version (need to verify which SKILL.md ends up in `~/.claude/skills/sekkei/`).
- The `utilities.md` (in `packages/skills/content/references/`) references `npx @bienhoang/sekkei-preview` — does this rely on the package being published to npm or the local build? If local, the `node` fallback path in the adapter SKILL.md needs fixing urgently.
