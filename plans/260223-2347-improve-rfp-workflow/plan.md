---
title: "Improve /sekkei:rfp Presales Workflow"
description: "Address UX friction, state machine gaps, multi-round Q&A, analysis quality, and V-model integration in the RFP lifecycle"
status: complete
priority: P2
effort: 12h
branch: main
tags: [rfp, presales, ux, state-machine, analysis]
created: 2026-02-23
---

# Improve /sekkei:rfp Presales Workflow

## Problem Statement

Current RFP workflow has UX friction (no back-navigation, unclear error recovery), limited multi-round Q&A tracking, shallow analysis templates, weak V-model chain handoff, and missing `07_decisions.md` integration. State machine is forward-only with no ability to revisit phases.

## Phases

| # | Phase | Status | Effort | Description |
|---|-------|--------|--------|-------------|
| 1 | State Machine Enhancements | complete | 3h | Backward transitions, multi-round Q&A loop, decision logging |
| 2 | Analysis Quality Improvements | complete | 3h | Richer templates, structured scoring, industry-aware prompts |
| 3 | UX & Interaction Polish | complete | 2h | Progress dashboard, clearer prompts, phase navigation |
| 4 | V-Model Chain Integration | complete | 2h | Stronger handoff, auto-config generation, traceability seeding |
| 5 | Tests & Validation | complete | 2h | Unit tests for new transitions, integration test for full flow |

## Key Dependencies

- Phase 1 must complete before Phase 3 (UX depends on new transitions)
- Phase 2 is independent, can parallel with Phase 1
- Phase 4 depends on Phase 2 (handoff uses enriched analysis)
- Phase 5 covers all prior phases

## Architecture Principle

Keep 3-layer separation (entrypoint/state/analysis). All changes fit existing patterns: Zod schemas, SekkeiError, file-based state, MCP tool interface.

## Files Affected

- `src/lib/rfp-state-machine.ts` — transitions, multi-round, decisions
- `src/tools/rfp-workspace.ts` — new actions (history, back)
- `src/types/documents.ts` — extended RfpStatus type
- `templates/rfp/*.md` — enriched flow templates
- `skills/content/references/rfp-*.md` — updated skill docs
- `tests/unit/rfp-*.test.ts` — new test coverage
