---
title: "One-Line Installer, sekkei doctor, workspace-docs rename"
description: "setup.sh curl-pipe installer, doctor CLI subcommand, configurable workspace-docs default"
status: completed
priority: P1
effort: 6h
branch: main
tags: [installer, cli, dx, rename]
created: 2026-02-24
---

# One-Line Installer, Doctor Command, workspace-docs Rename

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Rename sekkei-docs → workspace-docs](./phase-01-workspace-rename.md) | 1.5h | completed |
| 2 | [sekkei doctor CLI subcommand](./phase-02-doctor-command.md) | 1h | completed |
| 3 | [setup.sh one-line installer](./phase-03-setup-script.md) | 2h | completed |
| 4 | [sekkei init updates](./phase-04-init-updates.md) | 0.5h | completed |

## Execution Order

Phase 1 → Phase 2 → Phase 4 (parallel-safe) → Phase 3 (depends on all others complete)

## Key Dependencies

- Phase 1 must complete before Phase 3 (setup.sh runs `sekkei doctor` which checks paths)
- Phase 2 must complete before Phase 3 (setup.sh runs `sekkei doctor`)
- Phase 4 is independent but logically tied to Phase 1 (same rename context)
- `health-check.ts` already exists — Phase 2 is a thin wrapper

## Shared Constant Location

`packages/mcp-server/src/lib/constants.ts` (new file) — exports `DEFAULT_WORKSPACE_DIR = "workspace-docs"`.
All renamed references import from here.
