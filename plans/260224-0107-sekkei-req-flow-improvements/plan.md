---
title: "Sekkei Requirements Flow — 7 Improvements"
description: "Bug fixes, guards, path standardization, new MCP tool, and auto-validate for /sekkei:requirements flow"
status: complete
priority: P1
effort: 6h
branch: main
tags: [sekkei, requirements, bug-fix, mcp-tool, validation]
created: 2026-02-24
---

# Sekkei Requirements Flow — 7 Improvements

## Context

- Brainstorm: `plans/reports/brainstorm-260224-0107-sekkei-requirements-flow-review.md`
- MCP server root: `sekkei/packages/mcp-server/`
- All 7 decisions agreed, no open questions

## Phases

| Phase | File | Changes | Status | Effort |
|-------|------|---------|--------|--------|
| 1 | [phase-01-bug-fixes.md](phase-01-bug-fixes.md) | #1 UPSTREAM_ID_TYPES fix, #2 NFR origin ambiguity | complete | 45m |
| 2 | [phase-02-guards-validation.md](phase-02-guards-validation.md) | #3 Prerequisite guard, #5 Split mode allowlist | complete | 45m |
| 3 | [phase-03-path-standardization.md](phase-03-path-standardization.md) | #4 functions-list output path | complete | 30m |
| 4 | [phase-04-update-chain-status-tool.md](phase-04-update-chain-status-tool.md) | #6 New `update_chain_status` MCP tool | complete | 1.5h |
| 5 | [phase-05-skill-flow-improvement.md](phase-05-skill-flow-improvement.md) | #7 Auto-validate after generation | complete | 30m |
| 6 | [phase-06-tests.md](phase-06-tests.md) | All test updates + new test file | complete | 2h |

## Dependencies

```
Phase 1 (bug fixes) ─┐
Phase 2 (guards)     ├─► Phase 6 (tests)
Phase 3 (paths)      │
Phase 4 (new tool) ──┤
Phase 5 (skill)      ┘
```

Phases 1-5 are independent — can execute in parallel. Phase 6 depends on all prior phases.

## Key Constraints

- Each code file < 200 LOC
- ESM imports with `.js` extensions
- Zod schemas for tool inputs, SekkeiError for errors
- Skill files (`.md`) are Claude Code instructions, not TS code
- `npm run lint && npm test` must pass after each phase

## Risk Summary

- **#2** type change (`string` -> `string | string[]`) affects 3 consumer sites in cross-ref-linker
- **#4** path change may break projects with existing `04-functions-list.md` flat file
- **#6** new tool adds YAML write — must be atomic to avoid corruption
