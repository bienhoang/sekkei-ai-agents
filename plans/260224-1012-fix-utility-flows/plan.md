---
title: "Fix validate/glossary/update utility flows"
description: "Fix 9 bugs and implement improvements across 3 Sekkei utility command flows"
status: complete
priority: P2
effort: 2h
branch: main
tags: [sekkei, bugfix, skill-flow, utility-commands]
created: 2026-02-24
---

# Fix Utility Flows: validate, glossary, update

## Context

- Brainstorm report: `plans/reports/brainstorm-260224-1012-validate-glossary-update-flows.md`
- Root cause: Skill flows lack "config-aware" pattern — all input resolution is manual
- 9 bugs (B1-B5, B7-B10), 2 skipped (B6, B11), 8 improvements

## Confirmed Decisions

| # | Decision |
|---|----------|
| Q1 | Remove `seed`/`finalize` from skill doc (YAGNI) |
| Q2 | Validate 2-tier: `@doc` → single + auto upstream, no arg → validate_chain |
| Q3 | Update: guide `git show HEAD~1:{path}` with configurable ref |
| Q4 | Fix staleness `git.log` per-feature doc paths |
| Q5 | Skip GLOSSARIES_DIR fix (low priority) |

## Phases

| Phase | Description | Files | Status | Bugs |
|-------|-------------|-------|--------|------|
| [Phase 1](phase-01-skill-flow-rewrites.md) | Rewrite utilities.md + adapter SKILL.md | 2 | complete | B1-B5, B7, B10 |
| [Phase 2](phase-02-backend-fixes.md) | Fix staleness + Python ID regex | 2 | complete | B8, B9 |
| [Phase 3](phase-03-tests.md) | Update/add tests for backend changes | 2 | complete | — |

## Scope

**In scope:** B1-B5, B7-B10, IMP-V1/V2/V3, IMP-G1/G2, IMP-U1/U2/U3
**Out of scope:** B6 (GLOSSARIES_DIR hardcoded), B11 (CLI name collision)

## Dependencies

- Phase 2 and Phase 1 are independent (parallel-safe)
- Phase 3 depends on Phase 2
