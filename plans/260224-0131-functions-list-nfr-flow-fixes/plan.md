---
title: "Fix functions-list & NFR flow issues"
description: "Standardize F-xxx IDs, add upstream validation, clarify NFR instructions"
status: complete
priority: P1
effort: 1h
branch: main
tags: [bugfix, validation, sekkei, functions-list, nfr]
created: 2026-02-24
---

# Fix Functions-list & NFR Flow Issues

## Context
- **Brainstorm:** [brainstorm-260224-0131-functions-list-nfr-flow-review.md](../reports/brainstorm-260224-0131-functions-list-nfr-flow-review.md)
- **Work context:** `sekkei/packages/mcp-server/`

## Problem Summary
1. **CRITICAL** — Functions-list template/instructions say `[PREFIX]-001` but validator expects `F-xxx`, cross-ref expects `F`, downstream expects `F-xxx`
2. **MEDIUM** — Functions-list has empty `UPSTREAM_ID_TYPES` despite requiring REQ cross-refs
3. **MEDIUM** — Functions-list template lacks explicit `関連要件ID` column for REQ traceability
4. **MEDIUM** — NFR `UPSTREAM_ID_TYPES` doesn't include `NFR` (requirements already defines NFR-xxx)
5. **MEDIUM** — NFR generation instructions don't clarify relationship with existing NFR-xxx from requirements

## Phases

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| [Phase 1](phase-01-template-and-instructions.md) | Fix template + generation instructions | complete | 2 files |
| [Phase 2](phase-02-validator-upstream-types.md) | Update UPSTREAM_ID_TYPES + REQUIRED_COLUMNS | complete | 1 file |
| [Phase 3](phase-03-update-tests.md) | Update affected tests | complete | 3 files |

## Success Criteria
- `npm run lint` passes
- `npm test` passes (all existing + updated tests)
- Functions-list template uses `F-xxx` format
- Validator enforces REQ cross-refs for functions-list
- NFR instructions clarify relationship with upstream NFR-xxx
