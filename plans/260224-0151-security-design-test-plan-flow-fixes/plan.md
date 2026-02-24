---
title: "Fix security-design & test-plan flow issues"
description: "Fix 13 cross-ref, validation, and workflow issues in security-design and test-plan flows"
status: complete
priority: P1
effort: 2h
branch: main
tags: [bugfix, sekkei, cross-ref, validator, skill-flow]
created: 2026-02-24
---

# Fix security-design & test-plan Flow Issues

**Brainstorm report:** `plans/reports/brainstorm-260224-0151-security-design-test-plan-flow-review.md`

## Summary

13 issues found across security-design and test-plan flows:
- Cross-ref chain pairs missing (test-plan entirely absent, security-design incomplete)
- Validator upstream ID types inconsistent with skill flows and generation instructions
- Missing prerequisite checks, validate steps, completeness rules, next steps

## Phases

| Phase | Description | Files | Status |
|-------|-------------|-------|--------|
| [Phase 1](./phase-01-backend-fixes.md) | Backend: cross-ref-linker, validator, completeness-rules | 3 files | pending |
| [Phase 2](./phase-02-skill-flow-fixes.md) | Skill flows: phase-design.md, phase-test.md | 2 files | pending |
| [Phase 3](./phase-03-adapter-sync.md) | Adapter: adapters/claude-code/SKILL.md | 1 file | pending |
| [Phase 4](./phase-04-tests-verify.md) | Tests + build verification | 2 test files | pending |

## Dependencies

```
Phase 1 (backend) → Phase 4 (tests verify backend changes)
Phase 2 (skill flows) → Phase 3 (adapter mirrors skill flows)
Phase 1 and Phase 2 can run in parallel
```

## Fix Mapping

| FIX | Phase | File | Description |
|-----|-------|------|-------------|
| FIX-1 | 1 | cross-ref-linker.ts | Add 3 CHAIN_PAIRS for test-plan |
| FIX-2 | 1 | cross-ref-linker.ts | Add 2 CHAIN_PAIRS for security-design |
| FIX-3 | 1 | validator.ts | Fix UPSTREAM_ID_TYPES for security-design |
| FIX-10 | 1 | completeness-rules.ts | Add test-plan completeness rule |
| FIX-4 | 2 | phase-design.md | Fix security-design cross-refs |
| FIX-5 | 2 | phase-test.md | Fix test-plan cross-refs (add F-xxx) |
| FIX-6 | 2 | phase-design.md | Add prerequisite check for security-design |
| FIX-7 | 2 | phase-test.md | Add prerequisite check for test-plan |
| FIX-8 | 2 | phase-design.md | Add validate step for security-design |
| FIX-9 | 2 | phase-test.md | Add validate step for test-plan |
| FIX-11 | 2 | phase-design.md | Add next steps for security-design |
| FIX-12 | 2 | phase-test.md | Add next steps for test-plan |
| FIX-13 | 2 | phase-design.md | Load requirements + nfr upstream |
