# Brainstorm: GitHub Packages Restructure

**Date**: 2026-02-24
**Status**: Agreed

## Problem Statement

Monorepo hiện publish 3 packages lên npm registry (public). Cần chuyển sang GitHub Packages (private repo) + cải thiện monorepo tooling và CI/CD.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Registry | GitHub Packages (`npm.pkg.github.com`) | Internal project, private distribution |
| Scope | `@bienhoang/*` | Personal GitHub account |
| Package names | `@bienhoang/sekkei-mcp-server`, `@bienhoang/sekkei-preview`, `@bienhoang/sekkei-skills` | Keep current names + scope prefix |
| Repo URL | `github.com/bienhoang/sekkei-ai-agents` (unchanged) | Already set up |
| Repo visibility | Private | Requires PAT for consumers |
| Monorepo tooling | Turborepo | Build caching, minimal config |
| Release strategy | Changesets | PR-based changelog, monorepo-aware version bump |

## Scope of Changes

### Phase 1: Package Registry Migration
- Rename all 3 packages with `@bienhoang/` scope
- Update `publishConfig.registry` → `https://npm.pkg.github.com`
- Update `.npmrc` → scope-based registry mapping
- Update all internal cross-references (imports, bin commands, README)
- Update `install.sh` for new package names
- Update skills content referencing package names

### Phase 2: Turborepo Setup
- Install `turbo` as root devDependency
- Create `turbo.json` with pipeline config (build, lint, test)
- Configure cache for `dist/` outputs
- Update root `package.json` scripts to use `turbo run`
- Add `.turbo/` to `.gitignore`

### Phase 3: Changesets Setup
- Install `@changesets/cli` + `@changesets/changelog-github`
- Init changesets config (`.changeset/config.json`)
- Configure for GitHub Packages registry
- Set `access: restricted` (private)

### Phase 4: CI/CD Restructure
- **`ci.yml`**: PR + push main → lint → test → build (with turbo cache)
- **`release.yml`**: Changesets-based — auto version PR, publish on merge
- Remove old `publish.yml`
- Use `GITHUB_TOKEN` (not NPM_TOKEN)

### Phase 5: Documentation & Consumer Setup
- Update README install instructions
- Add consumer `.npmrc` example
- Update `sekkei-setup` bin script if it references old package names
- Update adapter configs (Cursor, Copilot, Claude Code)

## Consumer Installation (After Migration)

```bash
# Consumer needs .npmrc in project or home dir:
echo "@bienhoang:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=ghp_YOUR_TOKEN" >> .npmrc

# Then install normally:
npm install @bienhoang/sekkei-mcp-server
npx @bienhoang/sekkei-skills   # Install Claude Code skill
npx @bienhoang/sekkei-setup    # Auto-detect editor
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing npm consumers break | Medium | Deprecate npm packages, point to GitHub Packages |
| PAT token management | Low | Document clearly in README |
| Turborepo cache invalidation issues | Low | Cache `dist/` only, easy to clear |
| Changesets learning curve | Low | Simple CLI workflow: `npx changeset` → commit → PR |

## Files to Modify

**Root:**
- `package.json` — add turbo, changesets deps + scripts
- `.npmrc` — GitHub Packages registry
- `.gitignore` — add `.turbo/`
- `turbo.json` — new file
- `.changeset/config.json` — new file
- `README.md` — install instructions
- `install.sh` — package names

**packages/mcp-server/:**
- `package.json` — name, publishConfig, repository
- `bin/setup.js` — if references old package name
- `bin/init.js` — if references old package name
- `README.md`

**packages/preview/:**
- `package.json` — name, publishConfig, repository
- `README.md`

**packages/skills/:**
- `package.json` — name, publishConfig, repository
- `bin/install.js` — if references old package name
- `content/` — any hardcoded package names in SKILL.md
- `README.md`

**.github/workflows/:**
- Delete `publish.yml`
- Create `ci.yml`
- Create `release.yml`

**Adapters:**
- `packages/mcp-server/adapters/` — update package references

## Next Steps

Create implementation plan with 5 phases above.
