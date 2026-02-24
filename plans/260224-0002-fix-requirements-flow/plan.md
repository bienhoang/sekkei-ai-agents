---
title: "Fix Requirements Flow — Requirements Before Functions-List"
description: "Correct chain flow so requirements generates before functions-list with 01-rfp input"
status: complete
priority: P1
effort: 2h
branch: main
tags: [bugfix, flow-correction, requirements, v-model]
created: 2026-02-24
---

# Fix Requirements Flow

## Problem

Requirements must generate BEFORE functions-list, with input from 01-rfp workspace. Code chain order is already correct but 4 bugs + 3 doc inconsistencies + skill UX issues remain.

## Decisions (from brainstorm)

1. Replace `機能ID` + `関連画面` columns → `関連RFP項目` in requirements template
2. After requirements: suggest PARALLEL generation of `functions-list` + `nfr`
3. Update functions-list instructions: explicitly reference REQ-xxx from upstream

## Phases

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| [Phase 1](./phase-01-fix-mcp-server-bugs.md) | Fix completeness rules, generation instructions, template | complete | 3 |
| [Phase 2](./phase-02-fix-documentation.md) | Fix CLAUDE.md chain order, docs references | complete | 2-3 |
| [Phase 3](./phase-03-improve-skill-layer.md) | Rewrite phase-requirements.md, verify SKILL.md | complete | 2 |
| [Phase 4](./phase-04-run-tests.md) | Run tests, verify no regressions | complete | 0 |

## Files NOT to change (already correct)

- `src/lib/cross-ref-linker.ts` — CHAIN_PAIRS correct
- `src/types/documents.ts` — DOC_TYPES order correct
- `src/lib/resolve-output-path.ts` — paths correct
- `docs/system-architecture.md` — chain diagram correct

## Dependencies

- Brainstorm report: `plans/reports/brainstorm-260224-0002-requirements-flow-correction.md`
