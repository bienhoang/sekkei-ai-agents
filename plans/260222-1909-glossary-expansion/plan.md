---
title: "Glossary Library Expansion"
description: "Expand 14 industries x 250 terms x trilingual (ja/en/vi) with code updates"
status: completed
priority: P2
effort: 7h
branch: main
tags: [glossary, trilingual, japanese, vietnamese, terminology]
created: 2026-02-22
---

# Glossary Library Expansion

Expand Sekkei's glossary from 4 industries / 146 terms / bilingual (ja/en) to 14 industries / ~3,500 terms / trilingual (ja/en/vi).

## Current State

- 4 glossary files: finance (40), medical (40), manufacturing (36), real-estate (30)
- Schema: `{ ja, en, context }` -- no Vietnamese
- Code: TS Zod enum + Python allowlist hardcoded to 4 industries

## Target State

- 15 glossary YAML files (14 industry + 1 common), ~250 terms each
- Schema: `{ ja, en, vi, context }` -- trilingual
- Code updated: TS enum, Python logic, SKILL.md all support 14 industries + common + `vi` field

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Schema + Code Changes](./phase-01-schema-code-changes.md) | completed | 30min | glossary.ts, glossary.py, SKILL.md |
| 2 | [Expand Existing Glossaries](./phase-02-expand-existing-glossaries.md) | completed | 2h | 4 existing YAML files |
| 3 | [Create New Glossaries](./phase-03-create-new-glossaries.md) | completed | 4h | 11 new YAML files |
| 4 | [Validation](./phase-04-validation.md) | completed | 30min | All 15 YAML files + code |

## Dependencies

- Phase 1 must complete before Phases 2/3 (schema defines target format)
- Phases 2 and 3 can run in parallel after Phase 1
- Phase 4 runs after Phases 2+3 complete

## Key Decisions

- `vi` field is **required** in all terms -- clean break, no backward compat
- Vietnamese strategy: formal translations for govt/medical/education; English loanwords OK for telecom/logistics/IT terms
- Universal IT terms (API, DB, UI, etc.) kept as English in `vi` field
- Sub-contexts (5-8 per industry) ensure term coverage breadth

## Research References

- [Brainstorm](../reports/brainstorm-260222-1909-glossary-expansion.md)
- [Vietnamese BrSE Terminology](./research/researcher-02-vietnamese-brse-terminology.md)

## Validation Log

### Session 1 — 2026-02-22
**Trigger:** Initial plan creation validation
**Questions asked:** 6

#### Questions & Answers

1. **[Schema]** Research recommended a 3-tier Vietnamese approach (vi_formal, vi_technical, vi_note) but the plan uses a single `vi` field. Are you okay with the single `vi` field, or do you want the richer multi-field approach?
   - Options: Single vi field (Recommended) | Two fields: vi + vi_note | Three fields: vi + vi_alt + vi_note
   - **Answer:** Single vi field
   - **Rationale:** KISS — single field keeps schema minimal. BrSE can infer formality from context field.

2. **[Assumptions]** The plan assumes all `vi` fields must be non-empty. Some universal IT terms (API, DB, UI, SQL) would just repeat the English. Should those use the English word as-is in `vi`, or allow empty `vi`?
   - Options: English as-is in vi (Recommended) | Allow empty vi
   - **Answer:** English as-is in vi
   - **Rationale:** Consistent non-empty `vi` makes validation simpler. Explicit English in `vi` signals "Vietnamese devs use this English term."

3. **[Testing]** Should we add unit tests for the glossary code changes (vi field handling, 14 industry imports), or defer to manual validation?
   - Options: Add unit tests (Recommended) | Manual only | Add to Phase 4 as optional
   - **Answer:** Add unit tests
   - **Rationale:** Unit tests provide regression safety net. ~30min extra effort for long-term quality.

4. **[Architecture]** For the 10 new glossary YAML files: each ~1,000 YAML lines. Split by sub-context or one file per industry?
   - Options: One file per industry (Recommended) | Split by sub-context
   - **Answer:** One file per industry
   - **Rationale:** Matches current structure. No code changes to `handle_import()` needed. Simpler file management.

5. **[Scope]** Should we add V-model document name translations (e.g., 要件定義書 → 'Tài liệu Định nghĩa Yêu cầu') as a separate common.yaml, add to each industry, or skip?
   - Options: Separate common.yaml (Recommended) | Add to each industry | Skip
   - **Answer:** Separate common.yaml
   - **Rationale:** Highest-value output per research. Avoids duplication across 14 files. Requires adding "common" to INDUSTRIES enum.

6. **[Scope]** Should we add a `source` or `ref` field to track provenance (JIS, IPA, wiki, BrSE)?
   - Options: No source field (Recommended) | Add optional source field
   - **Answer:** No source field
   - **Rationale:** KISS — minimal schema. Source tracking low user benefit, high complexity.

#### Confirmed Decisions
- Schema: single `vi` field, no `vi_note`/`vi_alt`
- Empty vi: never empty, use English as-is for universal IT terms
- Testing: add unit tests in Phase 1 (code changes)
- File structure: one file per industry (14 files + 1 common)
- V-model terms: separate `common.yaml` (~50 terms)
- Provenance: no `source` field

#### Action Items
- [ ] Add `common.yaml` creation to Phase 3
- [ ] Add `"common"` to INDUSTRIES enum in Phase 1
- [ ] Add unit test creation to Phase 1 todo list
- [ ] Update total file count from 14 to 15 in plan.md

#### Impact on Phases
- Phase 1: Add `"common"` to INDUSTRIES enum + add unit tests for vi field handling (~30min added)
- Phase 3: Add `common.yaml` creation (~50 V-model + universal IT terms)
- Phase 4: Validate 15 files instead of 14, include unit test run
