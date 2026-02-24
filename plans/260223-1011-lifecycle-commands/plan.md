---
title: "Lifecycle Commands (version/uninstall/update) + Init Improvement"
description: "Add version, uninstall, update CLI commands and improve init to auto-install all deps"
status: complete
priority: P2
effort: 4h
branch: main
tags: [cli, lifecycle, devex, sekkei]
created: 2026-02-23
---

# Lifecycle Commands + Init Improvement

## Overview

Add `sekkei version`, `sekkei uninstall`, `sekkei update` CLI subcommands and improve `sekkei init` to auto-install all dependencies (Python venv, Playwright, npm build) in one run. Also add corresponding SKILL.md sub-commands for Claude Code users.

## Context

- Brainstorm report: `../reports/brainstorm-260223-1011-lifecycle-commands.md`
- CLI uses citty framework: `sekkei/packages/mcp-server/src/cli/main.ts`
- Existing commands: generate, validate, export, status, glossary, watch
- install.sh handles bootstrap but no uninstall/update flow exists

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Shared health check module](./phase-01-health-check-module.md) | complete | 45m | 1 new |
| 2 | [Version command](./phase-02-version-command.md) | complete | 30m | 2 modified, 1 new |
| 3 | [Uninstall command](./phase-03-uninstall-command.md) | complete | 30m | 1 new, 1 modified |
| 4 | [Update command](./phase-04-update-command.md) | complete | 30m | 1 new, 1 modified |
| 5 | [Init improvement](./phase-05-init-improvement.md) | complete | 45m | 1 modified |
| 6 | [SKILL.md + install.sh stubs](./phase-06-skill-and-stubs.md) | complete | 20m | 2 modified |
| 7 | [Build + Test verification](./phase-07-verification.md) | complete | 20m | — |

## Dependencies

```
Phase 1 (health-check) → Phase 2 (version) → Phase 7 (verify)
Phase 1 (health-check) → Phase 3 (uninstall) → Phase 7
Phase 1 (health-check) → Phase 4 (update) → Phase 7
Phase 1 (health-check) → Phase 5 (init) → Phase 7
Phase 2–5 → Phase 6 (SKILL.md)
```

## Key Decisions

- Extend existing citty CLI (not separate scripts)
- Shared `checkHealth()` returns structured data for version/init/update
- Uninstall = skill-only (keeps build + venv)
- Update = npm update + rebuild + re-copy skills
- Init auto-install with `--skip-deps` escape hatch
