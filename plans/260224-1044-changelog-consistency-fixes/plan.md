---
title: "Fix Changelog Consistency Gaps"
description: "Preserve 改訂履歴 on regeneration, add global changelog, auto-insert rows, enhance validation"
status: completed
priority: P1
effort: 3h
branch: main
tags: [changelog, consistency, validation, sekkei]
created: 2026-02-24
completed: 2026-02-24
---

# Fix Changelog Consistency Gaps

## Context

- Brainstorm: [brainstorm-260224-1044-changelog-consistency-gaps.md](../reports/brainstorm-260224-1044-changelog-consistency-gaps.md)
- Problem: 5 critical gaps where document 改訂履歴 (revision history) becomes inconsistent after updates

## Phases

| # | Phase | Status | Effort | Description |
|---|-------|--------|--------|-------------|
| 1 | [Preserve Changelog on Regeneration](./phase-01-preserve-changelog.md) | completed | 1h | Add `existing_content` param to `generate_document`, extract/preserve 改訂履歴 |
| 2 | [Global Changelog File](./phase-02-global-changelog.md) | completed | 45m | New `changelog-manager.ts` + `sekkei-docs/CHANGELOG.md` auto-append |
| 3 | [Auto-Insert in Skill Flows](./phase-03-auto-insert-skill-flows.md) | completed | 30m | Update `/sekkei:update` and `/sekkei:change` flows to auto-insert 改訂履歴 rows |
| 4 | [Validation Rules Enhancement](./phase-04-validation-rules.md) | completed | 45m | Staleness check, row count, version sequence — warning only |

## Dependencies

- Phase 2 depends on Phase 1 (changelog-manager used by generate.ts)
- Phase 3 depends on Phase 1 (skill flows reference updated generate_document)
- Phase 4 independent (can run parallel with Phase 2/3)

## Key Files

All under `sekkei/packages/mcp-server/`:

| File | Phases | Change |
|------|--------|--------|
| `src/tools/generate.ts` | 1, 2 | Add existing_content param + global changelog append |
| `src/lib/generation-instructions.ts` | 1 | Add buildChangelogPreservationInstruction() |
| `src/lib/changelog-manager.ts` | 2 | NEW — global changelog + row extraction helpers |
| `src/lib/validator.ts` | 4 | Add staleness/version/row-count checks |
| `src/tools/cr-propagation-actions.ts` | 2, 3 | Include 改訂履歴 row in propagate_next + global append |
| `skills/content/references/utilities.md` | 3 | Auto-insert row in /sekkei:update flow |
| `skills/content/references/change-request-command.md` | 3 | Document 改訂履歴 handling in CR flow |

## Success Criteria

- [x] Regenerating a document preserves existing 改訂履歴 rows
- [x] Global CHANGELOG.md auto-updated on every document change
- [x] Skill flows auto-insert suggested 改訂履歴 rows
- [x] Validator warns on stale/missing changelog entries
- [x] All existing tests pass + new tests for changelog logic
