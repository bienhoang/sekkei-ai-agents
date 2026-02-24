---
title: "Supplementary Flow Fixes — S1-S6, IMP-1 to IMP-6"
status: complete
created: 2026-02-24
branch: main
report: ../reports/brainstorm-260224-0955-supplementary-flows-review.md
---

# Supplementary Flow Fixes

Fix 6 bugs and 6 improvements for matrix, sitemap, operation-design, migration-design flows.

## Decisions (from brainstorm)

1. Sitemap output path → `03-system/sitemap.md`
2. Matrix required sections → keep empty, add table column validation instead
3. Matrix chain pairs → add one-directional pairs (check referenced IDs exist in upstream)

## Phases

| Phase | File(s) | Issues | Status |
|-------|---------|--------|--------|
| 1 — Backend fixes | resolve-output-path.ts, cross-ref-linker.ts | S1-S5, IMP-4, IMP-5 | Done |
| 2 — Validation rules | completeness-rules.ts, validator.ts | IMP-2, IMP-6 | Done |
| 3 — Skill flows | phase-supplementary.md, adapter SKILL.md | S6, IMP-1, IMP-3 | Done |
| 4 — Tests | cross-ref-linker.test.ts, completeness-checker.test.ts | All | Done (453/453 pass) |

## Phase Details

→ See `phase-01-backend-fixes.md`
→ See `phase-02-validation-rules.md`
→ See `phase-03-skill-flows.md`
→ See `phase-04-tests.md`
