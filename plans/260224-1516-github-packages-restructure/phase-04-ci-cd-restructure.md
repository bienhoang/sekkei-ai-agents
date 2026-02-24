# Phase 4: CI/CD Restructure

## Context Links
- [Plan Overview](./plan.md)
- [Phase 2 — Turborepo](./phase-02-turborepo-setup.md)
- [Phase 3 — Changesets](./phase-03-changesets-setup.md)
- [Current publish.yml](../../.github/workflows/publish.yml)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1h
- **Depends on**: Phase 1 (scoped names), Phase 2 (turbo commands), Phase 3 (changesets)

Replace single `publish.yml` (tag-triggered, npm registry) with two workflows:
1. **`ci.yml`** — PR + push to main: lint, test, build (with turbo cache)
2. **`release.yml`** — Changesets-based: auto version PR, publish on merge

## Key Insights
- Current `publish.yml` triggers on `v*` tags, publishes all 3 packages to npm with `NPM_TOKEN`
- New approach: no manual tags — Changesets auto-creates version PRs and publishes on merge
- GitHub Packages auth uses `GITHUB_TOKEN` (auto-provided) — no need for `NPM_TOKEN` secret
- Playwright install needed for mcp-server tests (PDF export tests)
- Turbo caching in CI requires `actions/cache` for `.turbo` directory

## Requirements

### Functional
- `ci.yml`: runs on PR and push to main; executes lint, test, build via turbo
- `release.yml`: runs on push to main; creates version PR via changesets, publishes on merge
- `publish.yml`: deleted
- `GITHUB_TOKEN` used for registry auth (not `NPM_TOKEN`)

### Non-Functional
- CI completes in < 5 minutes for cached builds
- Release workflow is idempotent (re-running doesn't double-publish)
- Turbo cache persists across CI runs via GitHub Actions cache

## Architecture

```
PR opened / push to main
  └─→ ci.yml
       ├── Install deps
       ├── Restore turbo cache
       ├── turbo run lint
       ├── turbo run build
       ├── Install Playwright (chromium)
       └── turbo run test

Push to main (after PR merge)
  └─→ release.yml
       ├── If .changeset/*.md files exist:
       │   └── Create/update "Version Packages" PR (changeset version)
       └── If Version PR just merged (no .changeset/*.md):
           ├── turbo run build
           └── changeset publish → GitHub Packages
```

## Related Code Files

| File | Change |
|------|--------|
| `.github/workflows/publish.yml` | **Delete** |
| `.github/workflows/ci.yml` | **New file** |
| `.github/workflows/release.yml` | **New file** |

## Implementation Steps

### Step 1: Delete `publish.yml`

```bash
rm .github/workflows/publish.yml
```

### Step 2: Create `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Cache turbo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-
            turbo-${{ runner.os }}-

      - name: Lint
        run: npx turbo run lint

      - name: Build
        run: npx turbo run build

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Test
        run: npx turbo run test
```

Key decisions:
- `concurrency` with `cancel-in-progress: true` — cancels stale CI runs on same branch
- `actions/setup-node` with `cache: npm` — caches `node_modules` via lockfile hash
- Turbo cache persisted via `actions/cache` — speeds up subsequent runs
- Playwright install after build, before test — only chromium (smallest)
- No matrix build needed (single Node version, single OS)

### Step 3: Create `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  packages: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          registry-url: https://npm.pkg.github.com
          scope: '@bienhoang'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx turbo run build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          version: npm run changeset:version
          publish: npm run changeset:publish
          title: 'chore: version packages'
          commit: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Key decisions:
- `concurrency` with `cancel-in-progress: false` — don't cancel ongoing publish
- `permissions`: `contents: write` (push version bumps), `packages: write` (publish), `pull-requests: write` (create Version PR)
- `changesets/action@v1` handles both flows: creates Version PR when changesets exist, publishes when Version PR is merged
- `NODE_AUTH_TOKEN` = `GITHUB_TOKEN` — GitHub Packages auth
- `registry-url` + `scope` in `setup-node` — configures `.npmrc` for publish
- Build before publish — ensures fresh `dist/` in the Version PR merge commit

### Step 4: Verify workflow files

```bash
# Validate YAML syntax
npx yaml-lint .github/workflows/ci.yml
npx yaml-lint .github/workflows/release.yml

# Or use actionlint if available
actionlint .github/workflows/ci.yml
actionlint .github/workflows/release.yml
```

## Todo List

- [ ] Delete `.github/workflows/publish.yml`
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/release.yml`
- [ ] Verify YAML syntax
- [ ] Push to branch, open PR — confirm `ci.yml` runs
- [ ] Merge PR with changeset — confirm `release.yml` creates Version PR
- [ ] Merge Version PR — confirm packages published to GitHub Packages
- [ ] Remove `NPM_TOKEN` secret from GitHub repo settings (no longer needed)

## Success Criteria

- PR triggers `ci.yml` — lint, build, test all pass
- Push to main triggers `release.yml`
- With `.changeset/*.md` files: Version PR created automatically
- Without changeset files (Version PR merged): packages published to `npm.pkg.github.com`
- `publish.yml` no longer exists
- No reference to `NPM_TOKEN` in any workflow

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `GITHUB_TOKEN` insufficient permissions | High — publish fails | `permissions` block explicitly grants `packages: write` |
| Changesets action version incompatibility | Medium | Pin to `@v1`, test in dry-run first |
| Concurrent release + CI race condition | Low | Separate concurrency groups |
| Playwright install slow in CI | Low — adds ~30s | Only install chromium, cached by GitHub Actions |

## Security Considerations
- `GITHUB_TOKEN` is auto-provisioned per workflow run — no manual secret needed
- `NPM_TOKEN` secret should be removed from repo settings after migration
- `permissions` block follows least-privilege: only what's needed for version bump + publish
- `cancel-in-progress: false` on release prevents interrupted publishes (partial state)

## Next Steps
- After first successful publish, verify package visible at `github.com/bienhoang/sekkei-ai-agents/packages`
- Phase 5 updates docs with new install instructions referencing GitHub Packages
