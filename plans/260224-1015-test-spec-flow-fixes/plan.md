---
status: pending
created: 2026-02-24
issue: test-spec-flow-fixes
source: plans/reports/brainstorm-260224-1009-test-spec-flows-review.md
---

# Plan: Fix test-spec flows (ut-spec, st-spec, uat-spec)

## Context

Brainstorm review found 6 bugs (B1-B6) and 5 improvements in test spec flows.
Core issues: hardcoded paths, missing test-plan upstream, no split support in loadChainDocs, inconsistent diagrams.

## Phases

| Phase | Description | Status | Files |
|-------|-------------|--------|-------|
| 1 | Skill flow rewrite (phase-test.md) | pending | phase-test.md |
| 2 | Adapter SKILL.md sync | pending | adapters/claude-code/SKILL.md |
| 3 | Backend fixes (chain pairs + loadChainDocs) | pending | cross-ref-linker.ts |
| 4 | Tests | pending | cross-ref-linker.test.ts |

## Bug → Phase mapping

| Bug | Phase | Fix |
|-----|-------|-----|
| B1 (hardcoded output path) | 1, 2 | Dynamic `output_path` variable in step 6 |
| B2 (loadChainDocs no split) | 3 | Add split handling for ut-spec/it-spec |
| B3 (diagram inconsistent) | 1, 2 | Sync both SKILL.md diagrams |
| B4 (missing chain pairs) | 3 | Add 4 test-plan → spec pairs |
| B5 (no test-plan upstream) | 1, 2 | Load test-plan as optional upstream |
| B6 (manual prereq check) | 1, 2 | Use `get_chain_status` MCP tool |

## Decisions

- test-plan = **optional** upstream (load if complete, don't ABORT if missing)
- st-spec/uat-spec remain system-level only (no split mode)
