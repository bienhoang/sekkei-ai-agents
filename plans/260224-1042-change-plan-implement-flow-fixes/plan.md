---
title: "Change / Plan / Implement Flow Fixes"
description: "Fix change-request bugs, add manage_plan MCP tool for plan/implement backend support"
status: pending
priority: P1
effort: 10h
branch: main
tags: [mcp-tool, plan, implement, change-request, split-mode]
created: 2026-02-24
---

# Change / Plan / Implement Flow Fixes

## Overview
- **Scope:** 3 flows — `/sekkei:change`, `/sekkei:plan`, `/sekkei:implement`
- **Key deliverable:** New `manage_plan` MCP tool (6 actions) following `manage_change_request` pattern
- **Change flow:** Fix 2 medium + 5 low severity bugs
- **Sources:** Brainstorm report `brainstorm-260224-1023-change-plan-implement-flows-review.md`

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Change Flow Fixes (C1-C7) | Pending | 1.5h | [phase-01](./phase-01-change-flow-fixes.md) |
| 2 | manage_plan Tool Definition | Pending | 1.5h | [phase-02](./phase-02-manage-plan-tool.md) |
| 3 | Plan Engine Backend | Pending | 3h | [phase-03](./phase-03-plan-engine.md) |
| 4 | Implement Engine Backend | Pending | 2h | [phase-04](./phase-04-implement-engine.md) |
| 5 | Skill Flow Updates | Pending | 1h | [phase-05](./phase-05-skill-flow-updates.md) |
| 6 | Unit Tests | Pending | 1h | [phase-06](./phase-06-tests.md) |

## Dependencies
- Existing `manage_change_request` pattern (reference architecture)
- `generate_document` tool with `scope`/`feature_name` params (already implemented)
- `sekkei.config.yaml` split config structure (already documented)
- `plan-orchestrator.md` spec (§1-§5)

## Execution Order
Phase 1 is independent. Phases 2-4 are sequential (tool def -> plan engine -> implement engine). Phase 5 depends on 2-4. Phase 6 depends on 2-4.
