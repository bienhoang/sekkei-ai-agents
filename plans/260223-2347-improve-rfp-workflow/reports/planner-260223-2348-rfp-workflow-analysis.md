# RFP Workflow Analysis Report

## Summary

Analyzed all 5 RFP source files (3 skill docs, 1 MCP tool, 1 state machine), 7 flow templates, types, resources, and project docs. Identified 6 categories of improvements across state machine, analysis quality, UX, and V-model integration.

## Current State

**Architecture:** 3-layer (entrypoint/state/analysis) — clean separation, well-tested. 8 phases, 5 MCP actions, 7 flow templates served via `rfp://instructions/{flow}` resource.

**Strengths:**
- File-based state — deterministic, resumable
- Phase recovery from file inventory — robust
- Write rules (append/rewrite/checklist) — well-enforced
- Zod validation on all inputs
- Good test coverage for happy paths

## Issues Found

### 1. Forward-Only State Machine (HIGH impact)
`ALLOWED_TRANSITIONS` has zero backward edges. Real presales needs re-analysis after client answers change scope. Multi-round Q&A (2-5 rounds typical) impossible without manual file manipulation.

### 2. Dead Code: `07_decisions.md` (MEDIUM impact)
File created on workspace init but no flow ever writes to it. Decision logging should be automatic on phase transitions.

### 3. Shallow Analysis Templates (MEDIUM impact)
- Flow 1: Complexity Radar scores dimensions 0-5 but never translates to effort. No tech risk section.
- Flow 2: Questions have no IDs (hard to reference in email), no priority ranking.
- Flow 5: Proposal lacks cost breakdown skeleton.
- Flow 6: Static 6-item checklist regardless of system type.

### 4. Weak V-Model Handoff (MEDIUM impact)
Scope freeze handoff is a text prompt. No auto-config generation despite analysis containing project type, features, and stack hints. User must manually create `sekkei.config.yaml`.

### 5. UX Friction Points (MEDIUM impact)
- No progress visibility (which phase am I in? how far along?)
- Cryptic prompts ("type BUILD_NOW" — what does that mean?)
- No SHOW/BACK/SKIP navigation commands
- Recovery messages lack actionable steps

### 6. Missing Q&A Round Tracking (LOW impact)
`RfpStatus` has no `qna_round` counter. `04_client_answers.md` uses `## Round N` format but status file doesn't track round number.

## Recommendations

5-phase plan created. Total effort: ~12h.

| Phase | Focus | Effort | Dependencies |
|-------|-------|--------|--------------|
| 1 | State machine: backward transitions, multi-round, decisions | 3h | None |
| 2 | Analysis: richer templates, scoring, IDs | 3h | None (parallel with 1) |
| 3 | UX: dashboard, prompts, navigation | 2h | After Phase 1 |
| 4 | V-model: auto-config, feature seed, traceability | 2h | After Phase 2 |
| 5 | Tests: full coverage for all new features | 2h | After 1 + 4 |

## Files Analyzed

| File | LOC | Purpose |
|------|-----|---------|
| `rfp-command.md` | 109 | Entrypoint routing & UX |
| `rfp-manager.md` | 152 | State management & file rules |
| `rfp-loop.md` | 200 | 6 analysis flows |
| `rfp-workspace.ts` | 124 | MCP tool handler (5 actions) |
| `rfp-state-machine.ts` | 266 | State machine core |
| `rfp-instructions.ts` | 47 | MCP resource handler |
| `documents.ts` (RFP section) | 28 | Type definitions |
| `templates/rfp/*.md` (7 files) | ~150 | Flow instruction templates |

## Unresolved Questions

1. Should backward transitions require a `reason` string (for decision log), or is it optional?
2. Should `generate-config` action parse prose from `05_proposal.md` to extract features, or require the structured Feature Seed table?
3. Should the progress dashboard be generated server-side (in MCP tool response) or client-side (in skill doc instructions)?
