---
phase: 4
title: "Verification"
status: pending
effort: 10min
depends_on: [phase-03]
---

# Phase 4: Verification

## Context

- [plan.md](plan.md) | [Phase 3](phase-03-root-readme-update.md)

## Overview

Cross-check all READMEs for link integrity, consistent formatting, and npm rendering readiness.

## Implementation Steps

### 1. Verify cross-reference links

Check each README's ecosystem section links resolve to correct paths:
- Root → `./packages/mcp-server/`, `./packages/preview/`, `./packages/skills/`
- mcp-server → `../../README.md` or absolute GitHub URLs
- preview → same pattern
- skills → same pattern

### 2. Verify package.json consistency

All 3 packages must have:
- `repository.url` = `https://github.com/bienhoang/sekkei-ai-agents.git`
- `repository.directory` = correct package path
- `homepage` = correct GitHub tree URL
- `bugs` = correct issues URL

### 3. Check badge URLs

Verify shields.io badge URLs use correct package names:
- `sekkei-mcp-server`
- `sekkei-preview`
- `sekkei-skills`

### 4. Formatting consistency

- All READMEs use same heading hierarchy (H1 title, H2 sections, H3 subsections)
- All tables use consistent column alignment
- All code blocks have language specifiers
- 日本語 sections are consistent length/style

### 5. npm pack dry-run

```bash
cd packages/mcp-server && npm pack --dry-run 2>&1 | grep README
cd packages/preview && npm pack --dry-run 2>&1 | grep README
cd packages/skills && npm pack --dry-run 2>&1 | grep README
```

Verify README.md is included in each package tarball.

## Todo

- [ ] Verify all cross-reference links
- [ ] Verify package.json metadata consistency
- [ ] Check badge URLs
- [ ] Check formatting consistency across all 4 READMEs
- [ ] npm pack dry-run for all packages

## Success Criteria

- Zero broken links
- All package.json fields correct
- README included in npm pack output
- Consistent formatting across all files
