# Phase 5: Documentation & Consumer Setup

## Context Links
- [Plan Overview](./plan.md)
- [Phase 1 — Registry Migration](./phase-01-package-registry-migration.md)
- [README.md](../../README.md)
- [Skills README.md](../../packages/skills/README.md)

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 30m
- **Depends on**: Phases 1-4 complete

Update all documentation to reflect new `@bienhoang/*` scoped package names, GitHub Packages registry, and consumer setup instructions (PAT token + `.npmrc`).

## Key Insights
- `README.md` has ~15 references to unscoped package names across: package table, install commands, architecture diagram, platform setup, project structure comments
- `packages/skills/README.md` has npm badge, install command, MCP config example
- Consumer setup requires `.npmrc` with `@bienhoang` scope mapping + PAT token
- `install.sh` uses filesystem paths only — no package name updates needed (verified in Phase 1)
- `npx` commands like `npx sekkei init` remain unchanged (bin name, not package name)

## Requirements

### Functional
- README reflects `@bienhoang/*` package names everywhere
- Consumer `.npmrc` setup documented clearly
- npm badge URLs updated from npmjs.com to GitHub Packages (or removed)
- MCP config examples use scoped names

### Non-Functional
- Installation instructions are copy-pasteable
- Consumer can install with 3 commands max

## Related Code Files

| File | Change |
|------|--------|
| `README.md` | Package table, install section, architecture diagram, platform setup, project structure |
| `packages/skills/README.md` | npm badge, install cmd, MCP config |
| `packages/mcp-server/README.md` | If exists — update |
| `packages/preview/README.md` | If exists — update |

## Implementation Steps

### Step 1: Update `README.md` — Package Table (line 47-49)

**Before**:
```markdown
| [sekkei-mcp-server](./packages/mcp-server/) | 2.0.0 | Core MCP server — ... |
| [sekkei-preview](./packages/preview/) | 0.3.0 | VitePress live preview ... |
| [sekkei-skills](./packages/skills/) | 2.0.0 | Claude Code slash commands ... |
```

**After**:
```markdown
| [@bienhoang/sekkei-mcp-server](./packages/mcp-server/) | 2.0.0 | Core MCP server — ... |
| [@bienhoang/sekkei-preview](./packages/preview/) | 0.3.0 | VitePress live preview ... |
| [@bienhoang/sekkei-skills](./packages/skills/) | 2.0.0 | Claude Code slash commands ... |
```

### Step 2: Update `README.md` — Install (npm) section (lines 64-68)

**Before**:
```markdown
### Install (npm)

\```bash
npm install -g sekkei-mcp-server
npx sekkei-skills   # Install Claude Code skill
npx sekkei-setup    # Auto-detect editor and configure MCP
\```
```

**After**:
```markdown
### Install (GitHub Packages)

\```bash
# 1. Configure registry (one-time setup)
echo "@bienhoang:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT" >> ~/.npmrc

# 2. Install
npm install -g @bienhoang/sekkei-mcp-server
npx @bienhoang/sekkei-skills   # Install Claude Code skill
npx sekkei-setup                # Auto-detect editor and configure MCP
\```

> **Note**: Generate a GitHub PAT with `read:packages` scope at [github.com/settings/tokens](https://github.com/settings/tokens).
```

### Step 3: Update `README.md` — Architecture diagram (lines 93, 105)

**Before**:
```
│  sekkei-skills   │ ──────────────────→ │ sekkei-mcp-server │
...
│  sekkei-preview   │
```

**After**:
```
│  @bienhoang/      │ ──────────────────→ │ @bienhoang/        │
│  sekkei-skills    │  /sekkei:* commands │  sekkei-mcp-server  │
...
│  @bienhoang/      │
│  sekkei-preview   │
```

Note: architecture diagram may need width adjustment for longer names. Consider simplifying labels to just `sekkei-skills`, `sekkei-mcp-server`, `sekkei-preview` with a note that full names are `@bienhoang/*`.

### Step 4: Update `README.md` — Platform Setup / Claude Code (lines 194, 202)

**Before**:
```bash
npx sekkei-skills   # Auto-install skill
```
```json
"sekkei": { "command": "npx", "args": ["sekkei-mcp-server"] }
```

**After**:
```bash
npx @bienhoang/sekkei-skills   # Auto-install skill
```
```json
"sekkei": { "command": "npx", "args": ["@bienhoang/sekkei-mcp-server"] }
```

### Step 5: Update `README.md` — Preview section (line 86)

**Before**:
```bash
npx sekkei-preview   # Live preview in browser
```

**After**:
```bash
npx @bienhoang/sekkei-preview   # Live preview in browser
```

### Step 6: Update `README.md` — Project Structure comments (lines 256, 266, 270)

**Before**:
```
│   ├── mcp-server/              # sekkei-mcp-server
│   ├── preview/                 # sekkei-preview
│   └── skills/                  # sekkei-skills
```

**After**:
```
│   ├── mcp-server/              # @bienhoang/sekkei-mcp-server
│   ├── preview/                 # @bienhoang/sekkei-preview
│   └── skills/                  # @bienhoang/sekkei-skills
```

### Step 7: Update `packages/skills/README.md`

Line 1 — title:
```diff
- # sekkei-skills
+ # @bienhoang/sekkei-skills
```

Line 3 — npm badge (remove or update):
```diff
- [![npm version](https://img.shields.io/npm/v/sekkei-skills)](https://www.npmjs.com/package/sekkei-skills)
+ [![GitHub Package](https://img.shields.io/github/v/release/bienhoang/sekkei-ai-agents?label=sekkei-skills)](https://github.com/bienhoang/sekkei-ai-agents/packages)
```

Line 11 — dependency reference:
```diff
- - [sekkei-mcp-server](../mcp-server/) configured as MCP server
+ - [@bienhoang/sekkei-mcp-server](../mcp-server/) configured as MCP server
```

Line 18 — install command:
```diff
- npx sekkei-skills
+ npx @bienhoang/sekkei-skills
```

Lines 101-109 — MCP config example:
```diff
- Skills invoke MCP tools via Claude Code's MCP integration. Ensure `sekkei-mcp-server` is configured:
+ Skills invoke MCP tools via Claude Code's MCP integration. Ensure `@bienhoang/sekkei-mcp-server` is configured:
...
-       "args": ["sekkei-mcp-server"]
+       "args": ["@bienhoang/sekkei-mcp-server"]
```

Lines 119-120 — related packages:
```diff
- | [sekkei-mcp-server](../mcp-server/) | Core MCP server ... |
- | [sekkei-preview](../preview/) | VitePress live preview ... |
+ | [@bienhoang/sekkei-mcp-server](../mcp-server/) | Core MCP server ... |
+ | [@bienhoang/sekkei-preview](../preview/) | VitePress live preview ... |
```

### Step 8: Deprecate old npm packages (optional, post-publish)

After first successful GitHub Packages publish:

```bash
npm deprecate sekkei-mcp-server "Moved to @bienhoang/sekkei-mcp-server on GitHub Packages. See https://github.com/bienhoang/sekkei-ai-agents"
npm deprecate sekkei-preview "Moved to @bienhoang/sekkei-preview on GitHub Packages."
npm deprecate sekkei-skills "Moved to @bienhoang/sekkei-skills on GitHub Packages."
```

This shows a deprecation warning to anyone installing the old packages.

## Todo List

- [ ] Update `README.md` — package table (3 names)
- [ ] Update `README.md` — install section (npm → GitHub Packages + PAT instructions)
- [ ] Update `README.md` — architecture diagram
- [ ] Update `README.md` — platform setup / Claude Code section
- [ ] Update `README.md` — preview command
- [ ] Update `README.md` — project structure comments
- [ ] Update `packages/skills/README.md` — all package name references
- [ ] Update any other package READMEs if they exist
- [ ] Final grep verification: no unscoped `sekkei-mcp-server` / `sekkei-preview` / `sekkei-skills` in tracked files
- [ ] (Post-publish) Deprecate old npm packages

## Success Criteria

- `grep -rn "sekkei-mcp-server\|sekkei-preview\|sekkei-skills" --include="*.md" --include="*.json" --include="*.ts" --include="*.js" --include="*.yml" . | grep -v node_modules | grep -v dist | grep -v coverage | grep -v @bienhoang` returns **zero** results
- README install instructions are copy-pasteable and work with a valid PAT
- Consumer can install by following README instructions in < 2 minutes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missed references | Low — cosmetic | Final grep check catches everything |
| Old npm consumers confused | Medium | Deprecation notice with migration URL |
| Badge URL broken | Low — cosmetic | Use GitHub release badge instead of npm |

## Security Considerations
- README example uses `YOUR_GITHUB_PAT` placeholder — never show real tokens
- PAT token docs link to GitHub settings with minimal `read:packages` scope
- `.npmrc` with real tokens should be in `~/.npmrc` (home dir), never committed to repo

## Next Steps
- After all 5 phases complete: open a single PR with all changes
- After merge + publish: run `npm deprecate` on old npm packages
- Monitor GitHub Packages page for successful publish
