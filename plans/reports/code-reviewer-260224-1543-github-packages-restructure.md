# Code Review: GitHub Packages Restructure

**Date:** 2026-02-24
**Reviewer:** code-reviewer
**Scope:** 5-phase migration from npm to GitHub Packages with Turborepo + Changesets

---

## Code Review Summary

### Scope
- **Files reviewed:** 18 modified/new files (excluding coverage, lockfile, plan docs)
- **New files:** `turbo.json`, `.changeset/config.json`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- **Deleted:** `.github/workflows/publish.yml`
- **Focus:** Registry migration, CI/CD correctness, missed references, security

### Overall Assessment

Solid restructure. Package renames, `publishConfig`, `.npmrc`, CI/CD workflows are correctly wired. Changesets + Turborepo are well-configured. However, there are **missed reference updates** in several files that will cause broken `npx` commands for consumers, and one file (`packages/preview/README.md`) was entirely missed.

---

## Critical Issues

None.

---

## High Priority

### H1. Missed `npx sekkei-preview` references in SKILL.md and utilities.md

**Files affected:**
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/adapters/claude-code/SKILL.md` (lines 816-826)
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/skills/content/references/utilities.md` (lines 173-184)

**Problem:** These files still reference `npx sekkei-preview` (9 occurrences in SKILL.md, 9 in utilities.md). With scoped packages on GitHub Packages, consumers who installed via `npm install -g @bienhoang/sekkei-preview` will have the `sekkei-preview` binary available, but users using `npx` directly will fail because `npx sekkei-preview` resolves to the npm registry (which no longer has the package), not GitHub Packages.

**Impact:** `/sekkei:preview` command instructions will not work for users who haven't globally installed the package.

**Fix:** Replace `npx sekkei-preview` with `npx @bienhoang/sekkei-preview` in both files. Example:
```
- npx sekkei-preview
+ npx @bienhoang/sekkei-preview
```

### H2. `packages/preview/README.md` entirely missed

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/README.md`

**Problem:** This file still references:
- Title: `# sekkei-preview` (should be `# @bienhoang/sekkei-preview`)
- Badge: npm badge pointing to `npmjs.com/package/sekkei-preview`
- Install: `npm install -g sekkei-preview`
- `npx sekkei-preview` (multiple)
- Ecosystem table: `sekkei-mcp-server`, `sekkei-skills`

**Impact:** Inconsistent documentation, broken install instructions.

**Fix:** Apply same pattern as `packages/mcp-server/README.md` and `packages/skills/README.md` updates.

### H3. `install.sh` references `sekkei-preview` in user-facing messages

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/install.sh` (lines 90, 97, 100, 230, 262)

**Problem:** Messages like `"Building sekkei-preview package"` and `"sekkei-preview not built"` use unscoped name. While these are internal build messages (not `npx` commands), they should match the new naming for consistency. Low urgency since `install.sh` builds from source, not registry.

**Impact:** Minor inconsistency.

---

## Medium Priority

### M1. `release.yml` should depend on CI passing

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.github/workflows/release.yml`

**Problem:** Both `ci.yml` and `release.yml` trigger on `push` to `main`. They run independently with separate concurrency groups. The release job does not wait for CI to pass -- it builds and publishes immediately. If CI fails (e.g., test failure), the release job may still publish broken packages.

**Fix:** Either:
1. Add `needs: ci` dependency (requires `workflow_run` trigger instead), or
2. Add lint + test steps to `release.yml` before the changesets action, or
3. Use `workflow_run` trigger:
```yaml
on:
  workflow_run:
    workflows: [CI]
    branches: [main]
    types: [completed]
```

### M2. `release.yml` missing turbo cache

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.github/workflows/release.yml`

**Problem:** `ci.yml` has turbo cache via `actions/cache@v4` but `release.yml` does not. Build will always be uncached in release workflow.

**Fix:** Add same cache step:
```yaml
- name: Cache turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: |
      turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
      turbo-${{ runner.os }}-
```

### M3. `ci.yml` missing `registry-url` for scoped package resolution during `npm ci`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.github/workflows/ci.yml`

**Problem:** The `.npmrc` in the repo maps `@bienhoang` scope to GitHub Packages and expects `GITHUB_TOKEN`. In CI, `npm ci` will try to resolve any `@bienhoang/*` dependencies from GitHub Packages, but CI doesn't set `GITHUB_TOKEN` env or `registry-url`. Currently this is fine because the 3 `@bienhoang/*` packages are local workspace packages (resolved via `file:` protocol in lockfile), but if workspace packages ever add cross-references as proper dependencies, `npm ci` will fail.

**Impact:** Future risk, not currently breaking.

**Fix:** Consider adding `registry-url` + `GITHUB_TOKEN` to ci.yml like release.yml has:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
    registry-url: https://npm.pkg.github.com
    scope: '@bienhoang'
```

### M4. `.gitignore` and `.npmrc` missing trailing newline

**Files:**
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.gitignore` (line 14: `.turbo/` with no newline)
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.npmrc` (no trailing newline)
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/skills/package.json` (no trailing newline)
- `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/preview/package.json` (no trailing newline)

**Impact:** POSIX compliance; some tools may not read the last line properly.

### M5. Turbo `lint` depends on `^build` but no inter-package deps exist

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/turbo.json` (line 8)

**Problem:** `"lint": { "dependsOn": ["^build"] }` means lint waits for all *dependency* packages to build first. Currently no workspace packages depend on each other, so `^build` resolves to nothing. This is not wrong but is unnecessary overhead. If a dependency is added later, this becomes correct behavior.

**Impact:** None currently. Correct forward-looking design.

---

## Low Priority

### L1. `setup.js` doc comment inaccurate

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/packages/mcp-server/bin/setup.js` (line 4)

```javascript
* Usage: npx @bienhoang/sekkei-mcp-server
```

The comment should say `npx sekkei-setup` since `sekkei-setup` is the bin name registered for this script. `npx @bienhoang/sekkei-mcp-server` would run the MCP server (the `main` entry), not the setup script.

### L2. `README.md` architecture diagram has alignment issues

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/README.md` (lines 98-114)

The ASCII art has awkward line breaks after adding `@bienhoang/` prefix. The diagram boxes are misaligned. Minor visual issue.

### L3. Changeset `access` is `restricted` -- verify intentional

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/.changeset/config.json` (line 10)

`"access": "restricted"` is correct for GitHub Packages (which are tied to the repo). Just confirming this is intentional and consistent with `publishConfig.access: "restricted"` in all 3 package.json files.

---

## Edge Cases Found by Scout

1. **`npx` resolution with scoped GitHub Packages**: When a user runs `npx @bienhoang/sekkei-preview`, npm must be configured with the `@bienhoang` scope pointing to GitHub Packages. Without `.npmrc` config, `npx` will try npm registry and fail. The README documents this setup correctly.

2. **Bin name collision**: `packages/preview/package.json` registers `"sekkei-preview"` as the bin name while the package is `@bienhoang/sekkei-preview`. This is valid -- npm will create a `sekkei-preview` symlink for globally installed packages. However, `npx sekkei-preview` (without scope) will NOT work unless the user has the correct `.npmrc`.

3. **`install.sh` uses local build path, not registry**: The local `install.sh` script bypasses npm entirely (builds from source, registers MCP via absolute path). This is unaffected by the registry migration.

4. **`sekkei-setup` and `sekkei-init` bin names preserved**: The mcp-server bin entries (`sekkei-mcp`, `sekkei-setup`, `sekkei-init`, `sekkei`) remain unscoped bin names, which is correct.

5. **No inter-package dependency**: None of the 3 packages import from each other in code. The turbo `^build` dependency is forward-looking only.

---

## Positive Observations

- Clean separation of CI and Release workflows with proper concurrency groups
- Changesets config correctly points to `bienhoang/sekkei-ai-agents` repo for changelog
- `GITHUB_TOKEN` used (auto-provided by GitHub Actions) -- no custom secret management needed
- `publishConfig.registry` set in all 3 package.json files -- belt and suspenders with `.npmrc`
- Turbo `test` task correctly declares `env: ["NODE_OPTIONS"]` for Jest ESM support
- Turbo cache in CI is well-configured with proper restore-keys fallback
- Old `publish.yml` cleanly deleted

---

## Recommended Actions

1. **[HIGH] Update `npx sekkei-preview` to `npx @bienhoang/sekkei-preview`** in SKILL.md and utilities.md (18 occurrences total)
2. **[HIGH] Update `packages/preview/README.md`** -- apply same scoping pattern as other READMEs
3. **[MEDIUM] Add CI gate to release** -- prevent publishing if CI fails
4. **[MEDIUM] Add turbo cache to `release.yml`**
5. **[LOW] Fix `setup.js` doc comment** -- `npx sekkei-setup`, not `npx @bienhoang/sekkei-mcp-server`
6. **[LOW] Add trailing newlines** to `.gitignore`, `.npmrc`, `packages/skills/package.json`, `packages/preview/package.json`

---

## Metrics

- **Files changed:** 18 source files + lockfile + coverage (auto-generated)
- **New infra files:** 4 (turbo.json, changeset config, 2 workflows)
- **Deleted files:** 1 (publish.yml)
- **Missed references:** ~20 occurrences across 2 code files + 1 README
- **Linting issues:** 0 (turbo dry-run succeeds, builds pass)
- **Security issues:** 0 (no token leaks, `GITHUB_TOKEN` properly used via `secrets` context)

---

## Unresolved Questions

1. Should `npx sekkei-preview` commands in SKILL.md/utilities.md use `npx @bienhoang/sekkei-preview`, or should the assumption be that users always globally install first? The README install instructions show `npm install -g`, which would make `npx sekkei-preview` work. But not all users globally install.

2. The `packages/preview/README.md` was missed -- was this intentional (planning a separate update) or oversight?

3. Should `release.yml` run tests before publishing, or is the assumption that CI always passes before merge to main (enforced via branch protection)?
