---
title: "Fix RFP flow state machine bugs and improvements"
description: "Fix 3 critical bugs (back action, missing transitions, terminal scope freeze) and 2 medium issues (stale next_action, no content validation)"
status: complete
priority: P1
effort: 2h
branch: main
tags: [bugfix, rfp, state-machine, sekkei]
created: 2026-02-24
---

# Fix RFP Flow State Machine

## Problem
Brainstorm audit found 3 critical bugs and 2 medium issues in `/sekkei:rfp` flow:
- **B1:** `back` action broken — validates against forward-only ALLOWED_TRANSITIONS
- **B2:** Missing QNA_GENERATION → DRAFTING (SKIP_QNA/BUILD_NOW documented but impossible)
- **B3:** SCOPE_FREEZE terminal — docs promise BACK but no transitions allowed
- **M1:** `next_action` stale after phase transitions
- **M2:** No content validation before transitions (can analyze empty RFP)

## LOC Constraints
| File | Current | After | Strategy |
|------|---------|-------|----------|
| rfp-state-machine.ts | 443 | ~465 | Already over limit; add maps only |
| rfp-workspace.ts | 194 | ~198 | Delegate validation to state-machine layer |
| rfp-workspace-tool.test.ts | 199 | 199 | Keep as-is, no modifications |
| rfp-flow-fixes.test.ts | 0 | ~120 | **New file** for all new test cases |

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [State machine fixes (B1, B2, B3, M1)](./phase-01-state-machine-fixes.md) | complete | 45m |
| 2 | [Tool handler improvements (M2)](./phase-02-tool-handler-improvements.md) | complete | 30m |
| 3 | [Tests and docs update](./phase-03-tests-and-docs.md) | complete | 45m |

## Key Files
- `sekkei/packages/mcp-server/src/lib/rfp-state-machine.ts`
- `sekkei/packages/mcp-server/src/tools/rfp-workspace.ts`
- `sekkei/packages/mcp-server/tests/unit/rfp-flow-fixes.test.ts` (new)
- `sekkei/packages/skills/content/references/rfp-manager.md`

## Validation
```bash
cd sekkei/packages/mcp-server && npm run lint && npm test
```
