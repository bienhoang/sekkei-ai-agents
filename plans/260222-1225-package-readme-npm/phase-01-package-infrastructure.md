---
phase: 1
title: "Package Infrastructure"
status: pending
effort: 20min
---

# Phase 1: Package Infrastructure

## Context

- [plan.md](plan.md) | [Brainstorm](../reports/brainstorm-260222-1225-package-readme-npm.md)
- GitHub: https://github.com/bienhoang/sekkei-ai-agents

## Overview

Move `skills/sekkei/` into `packages/skills/`, create its package.json, and fix repository metadata across all package.json files.

## Key Insights

- `skills/sekkei/` currently lives at repo root, outside `packages/` workspace glob
- mcp-server package.json has wrong repo URL (`sekkei.git` instead of `sekkei-ai-agents.git`)
- preview package.json missing `repository`, `homepage`, `bugs` fields
- Root package.json uses `"packages/*"` workspace glob — moving skills there auto-includes it

## Requirements

### Functional
- skills/ content accessible from packages/skills/
- All 3 packages have correct npm metadata
- Workspace setup recognizes all 3 packages

### Non-functional
- No breaking changes to existing mcp-server/preview builds
- install.sh at root still works (update paths if needed)

## Related Code Files

### Modify
- `package.json` (root) — no change needed if workspace glob is `"packages/*"`
- `packages/mcp-server/package.json` — fix repository.url, add homepage/bugs
- `packages/preview/package.json` — add repository, homepage, bugs

### Create
- `packages/skills/package.json` — new npm package metadata

### Move
- `skills/sekkei/` → `packages/skills/` (git mv)

## Implementation Steps

### 1. Move skills directory
```bash
git mv skills/sekkei packages/skills
# If skills/ has other contents, only move sekkei subfolder
# Result: packages/skills/SKILL.md, packages/skills/references/, packages/skills/bin/
```

Note: Check if `skills/sekkei/` has `bin/install.js`. If not, it may be at a different path. Verify structure before moving.

### 2. Create packages/skills/package.json
```json
{
  "name": "sekkei-skills",
  "version": "1.0.0",
  "description": "Claude Code skills for generating Japanese specification documents (設計書)",
  "type": "module",
  "bin": {
    "sekkei-skills": "./bin/install.js"
  },
  "files": [
    "bin/",
    "content/",
    "SKILL.md",
    "references/"
  ],
  "scripts": {},
  "keywords": [
    "sekkei",
    "claude-code",
    "skills",
    "japanese",
    "specification",
    "設計書",
    "mcp"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/bienhoang/sekkei-ai-agents.git",
    "directory": "packages/skills"
  },
  "homepage": "https://github.com/bienhoang/sekkei-ai-agents/tree/main/packages/skills",
  "bugs": "https://github.com/bienhoang/sekkei-ai-agents/issues",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Adjust `files` array based on actual directory structure after move.

### 3. Fix packages/mcp-server/package.json
Add/update these fields:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/bienhoang/sekkei-ai-agents.git",
    "directory": "packages/mcp-server"
  },
  "homepage": "https://github.com/bienhoang/sekkei-ai-agents/tree/main/packages/mcp-server",
  "bugs": "https://github.com/bienhoang/sekkei-ai-agents/issues"
}
```

### 4. Fix packages/preview/package.json
Add these fields:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/bienhoang/sekkei-ai-agents.git",
    "directory": "packages/preview"
  },
  "homepage": "https://github.com/bienhoang/sekkei-ai-agents/tree/main/packages/preview",
  "bugs": "https://github.com/bienhoang/sekkei-ai-agents/issues",
  "publishConfig": {
    "access": "public"
  }
}
```

### 5. Verify workspace recognition
```bash
npm ls --workspaces --json 2>/dev/null | jq '.dependencies | keys'
# Should list: sekkei-mcp-server, sekkei-preview, sekkei-skills
```

### 6. Update root install.sh if it references skills/sekkei/
Check and update any path references from `skills/sekkei/` to `packages/skills/`.

## Todo

- [ ] Move skills/sekkei/ → packages/skills/
- [ ] Create packages/skills/package.json
- [ ] Fix mcp-server package.json (repo URL, homepage, bugs)
- [ ] Fix preview package.json (add repo, homepage, bugs, publishConfig)
- [ ] Update install.sh paths if needed
- [ ] Verify workspace recognition

## Success Criteria

- `npm ls --workspaces` shows all 3 packages
- All package.json files have correct `repository.url` pointing to `sekkei-ai-agents.git`
- No build regressions in mcp-server or preview

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Moving skills breaks Claude Code users who copied path | Medium | Document migration in root README |
| install.sh has hardcoded paths | Low | Check and update |
| npm workspace resolution issues | Low | Test with npm ls |

## Next Steps

→ Phase 2: Create package READMEs
