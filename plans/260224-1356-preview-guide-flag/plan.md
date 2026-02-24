---
title: "Preview --guide flag & user-guide restructure"
description: "Add --guide flag to sekkei-preview CLI, restructure docs/user-guide with numbered prefixes"
status: complete
priority: P2
effort: 2h
branch: main
tags: [preview, docs, cli, user-guide]
created: 2026-02-24
completed: 2026-02-24
---

# Preview --guide Flag & User-Guide Restructure

## Context
- Brainstorm: `plans/reports/brainstorm-260224-1356-preview-guide-flag.md`
- Preview CLI: `packages/preview/src/cli.ts` (155 lines)
- User-guide: `docs/user-guide/` (22 markdown files, 4 subdirs)

## Summary
Add `--guide` boolean flag to `sekkei-preview` CLI to serve user-guide docs via VitePress. Restructure `docs/user-guide/` with numbered prefixes for proper sidebar ordering. Dual path resolution: dev → monorepo, published → bundled.

## Phases

| # | Phase | Status | Files |
|---|-------|--------|-------|
| 1 | [Restructure user-guide](./phase-01-restructure-user-guide.md) | complete | 22 .md files |
| 2 | [Add --guide flag + resolution](./phase-02-guide-flag-resolution.md) | complete | cli.ts, resolve-docs-dir.ts |
| 3 | [Config generation for guide mode](./phase-03-config-guide-mode.md) | complete | generate-config.ts |
| 4 | [Bundle build step](./phase-04-bundle-build.md) | complete | package.json, .gitignore |
| 5 | [Update SKILL.md + references](./phase-05-skill-docs-update.md) | complete | 3 files |

## Dependencies
- Phase 1 is independent (can run first)
- Phases 2–3 depend on each other (flag → config)
- Phase 4 independent after Phase 1
- Phase 5 after all others

## Key Decisions
- `--guide` boolean flag (keep `--docs <path>` unchanged)
- Numbered prefixes on all files + dirs
- Bundled guide/ in published package, monorepo path for dev
- Title: "Sekkei User Guide" when --guide
