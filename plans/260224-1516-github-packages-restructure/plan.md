---
title: "GitHub Packages Restructure"
description: "Migrate npm registry to GitHub Packages with Turborepo + Changesets"
status: complete
priority: P2
effort: 4h
branch: main
tags: [registry, ci-cd, monorepo, turborepo, changesets]
created: 2026-02-24
---

# GitHub Packages Restructure

Migrate 3 packages from npm registry (public) to GitHub Packages (private, `@bienhoang/*` scope). Add Turborepo for build caching and Changesets for release management.

## Phases

| # | Phase | Status | Effort | Key Files |
|---|-------|--------|--------|-----------|
| 1 | [Package Registry Migration](./phase-01-package-registry-migration.md) | complete | 1.5h | 3x `package.json`, `.npmrc`, adapters, `install.sh`, source refs |
| 2 | [Turborepo Setup](./phase-02-turborepo-setup.md) | complete | 30m | root `package.json`, `turbo.json`, `.gitignore` |
| 3 | [Changesets Setup](./phase-03-changesets-setup.md) | complete | 30m | `.changeset/config.json`, root `package.json` |
| 4 | [CI/CD Restructure](./phase-04-ci-cd-restructure.md) | complete | 1h | `ci.yml`, `release.yml`, delete `publish.yml` |
| 5 | [Documentation & Consumer Setup](./phase-05-documentation-consumer-setup.md) | complete | 30m | `README.md`, skills READMEs |

## Dependencies

```
Phase 1 (registry) → Phase 2 (turbo) → Phase 3 (changesets) → Phase 4 (CI/CD) → Phase 5 (docs)
```

Phase 1 must complete first (package names used everywhere). Phases 2-3 can run in parallel but both needed before Phase 4.

## Key Decisions

- Scope: `@bienhoang/*` (matches GitHub username)
- Registry: `https://npm.pkg.github.com`
- Access: `restricted` (private repo)
- Auth: `GITHUB_TOKEN` for CI, PAT for consumers
- Old npm packages: deprecate with pointer to GitHub Packages

## Risk Summary

| Risk | Mitigation |
|------|------------|
| Existing npm consumers break | Deprecate npm packages with migration notice |
| PAT token management | Document in README + consumer `.npmrc` template |
| `package-lock.json` conflicts | Regenerate after all `package.json` changes |

## Post-Migration Verification

- [ ] `npm run build` succeeds with turbo
- [ ] `npm test` passes
- [ ] `npx changeset` creates changeset file
- [ ] `npm publish --dry-run` targets `npm.pkg.github.com`
- [ ] CI workflow passes on PR
- [ ] Release workflow publishes on merge
