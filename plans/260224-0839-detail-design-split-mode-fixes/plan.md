---
title: "Fix detail-design split mode flow"
description: "Fix 7 bugs and 5 improvements in detail-design split mode — prerequisite checks, upstream loading, path resolution, chain status, completeness rules"
status: complete
priority: P1
effort: 2h
branch: main
tags: [sekkei, detail-design, split-mode, bugfix]
created: 2026-02-24
---

# Fix Detail-Design Split Mode Flow

**Brainstorm:** [brainstorm-260224-0839-detail-design-split-mode-review.md](../reports/brainstorm-260224-0839-detail-design-split-mode-review.md)

## Summary

The `/sekkei:detail-design` command has critical bugs in split mode. Prerequisite check only validates monolithic path, upstream loading ignores split directory structure, and chain status hardcodes monolithic output. These issues make detail-design unusable in split mode.

## Phases

| Phase | Description | Status | Effort | Files |
|-------|-------------|--------|--------|-------|
| [Phase 1](./phase-01-skill-flow-rewrite.md) | Rewrite detail-design skill flow (BUG-1,2,3,5,6 + IMP-1,2,3) | Complete | 1h | 3 skill files |
| [Phase 2](./phase-02-backend-fixes.md) | Backend fixes (BUG-4,7 + IMP-4,5) + tests | Complete | 45m | 3 TS files + 2 test files |
| Phase 3 | Build verification + commit | Complete | 15m | — |

## Bug/Improvement Matrix

| ID | Phase | Severity |
|----|-------|----------|
| BUG-1 | 1 | CRITICAL — prerequisite check monolithic-only |
| BUG-2 | 1 | CRITICAL — upstream loading monolithic-only |
| BUG-3 | 1 | HIGH — same upstream blob for all features |
| BUG-4 | 2 | MEDIUM — resolve-output-path missing shared |
| BUG-5 | 1 | MEDIUM — chain status hardcoded monolithic |
| BUG-6 | 1 | MEDIUM — screen-design not loaded |
| BUG-7 | 2 | LOW — completeness rules too simple |
| IMP-1 | 1 | HIGH — per-feature upstream assembly |
| IMP-2 | 1 | HIGH — unified prerequisite check |
| IMP-3 | 1 | MEDIUM — shared sections config |
| IMP-4 | 2 | LOW — chain pairs for traceability |
| IMP-5 | 2 | LOW — enhanced completeness rules |

## Dependencies

- basic-design split flow (already fixed) — use as reference pattern
- `loadChainDocs()` in cross-ref-linker.ts — already supports `system_output` + `features_output`
