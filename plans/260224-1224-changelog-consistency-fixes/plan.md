---
title: "Fix 9 Changelog Consistency Gaps"
description: "Post-generation validation, version extraction fix, MCP auto-insert, skill flow updates"
status: completed
priority: P1
effort: 3h
branch: main
tags: [changelog, consistency, validator, skill-flow, bugfix]
created: 2026-02-24
---

# Fix 9 Changelog Consistency Gaps

## Context
- Brainstorm: `plans/reports/brainstorm-260224-1224-changelog-consistency-audit.md`
- MCP Server: `sekkei/packages/mcp-server/`
- Skills: `sekkei/packages/skills/content/references/`

## Problem
Full audit found 9 gaps in 改訂履歴 consistency across direct-edit and CR update paths. Key risks: silent data loss during regeneration (AI-dependent preservation), origin doc changelog never updated, global CHANGELOG version extraction bug.

## Phases

| # | Phase | Gaps | Status | Effort |
|---|-------|------|--------|--------|
| 1 | [Post-generation validation](phase-01-post-generation-validation.md) | G2/G7/G8 | completed | 45min |
| 2 | [Version extraction fixes](phase-02-version-extraction-fixes.md) | G3/G9 | completed | 30min |
| 3 | [MCP auto-insert changelog](phase-03-mcp-auto-insert-changelog.md) | G6 | completed | 30min |
| 4 | [Skill flow updates](phase-04-skill-flow-updates.md) | G1/G5 | completed | 30min |
| 5 | [Unit tests](phase-05-unit-tests.md) | All | completed | 45min |

## Dependencies
- Phase 1 → Phase 5 (tests validate new functions)
- Phase 2 → Phase 3 (version extraction used in auto-insert)
- Phase 4 references Phase 1 + Phase 3 (skill flows call new MCP features)

## Execution Order
1 → 2 → 3 → 4 → 5 (sequential, each builds on prior)

## Success Criteria
- All existing tests pass
- New validation catches missing/modified 改訂履歴 rows
- Global CHANGELOG logs correct (new) version
- Origin/upstream docs get changelog rows in both flows
- `npm run build && npm test` passes from mcp-server/
