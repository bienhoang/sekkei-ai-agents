---
title: "Document Consistency Guards"
description: "Staleness detection, pre-generate warnings, full CHANGELOG logging for sekkei"
status: completed
priority: P2
effort: 2h
branch: main
tags: [consistency, validation, changelog, sekkei]
created: 2026-02-24
completed: 2026-02-24
---

# Document Consistency Guards

Addresses gaps identified in [brainstorm report](../reports/brainstorm-260224-1120-doc-consistency-gaps.md): direct edits cause silent drift, CR completion logs only origin doc, version field always empty.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Staleness Detection (Guard A)](phase-01-staleness-detection.md) | completed | 45min | `validator.ts`, `validate.ts`, `validate-chain.ts`, `cross-ref-linker.ts` |
| 2 | [Pre-Generate Warning (Guard B)](phase-02-pre-generate-warning.md) | completed | 30min | `generate.ts` |
| 3 | [Full CHANGELOG Logging](phase-03-full-changelog-logging.md) | completed | 30min | `changelog-manager.ts`, `cr-actions.ts`, `generate.ts` |
| 4 | [Skill Docs Update](phase-04-skill-docs-update.md) | completed | 15min | `utilities.md` |

## Key Dependencies

- Phase 2 reuses staleness util from Phase 1
- Phase 3 reuses version extraction from Phase 1
- Phase 4 documents all changes from Phases 1-3

## Architecture Decisions

- **Staleness = git timestamp comparison** via `simple-git` (already a dependency in `staleness-detector.ts`)
- **All guards are WARNING severity, non-blocking** -- never prevent generation or validation
- **Version extraction** reuses existing `extractRevisionSection` pattern from `validator.ts` L293-306
- **CHAIN_PAIRS** from `cross-ref-linker.ts` defines upstream/downstream relationships

## Out of Scope

- WYSIWYG auto-staleness on save (deferred per brainstorm)
- Blocking guards (all advisory)
- Content hash comparison fallback (future enhancement)

## Success Criteria

1. `validate_document` and `validate_chain` report staleness warnings
2. `generate_document` warns when upstream changed (regeneration only)
3. CR `handleComplete` logs all propagated docs with extracted versions
4. `generate_document` logs with extracted version
5. All existing tests pass; new unit tests for each guard
