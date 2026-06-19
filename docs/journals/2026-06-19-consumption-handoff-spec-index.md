# Consumption Handoff Spec Index: Shipped All 3 Phases

**Date**: 2026-06-19 14:30
**Severity**: Medium
**Component**: Agent consumption layer (MCP server + Sekkei chain tooling)
**Status**: Resolved

## What Happened

Merged commit 5607721 completing all three phases of the consumption-handoff-spec-index plan. Built an agent-facing "spec index" system that downstream coding agents can consume — a structured guide to Sekkei's Japanese V-model spec output.

- **Phase 1 (Index Core)**: `consumption-index.ts` + `consumption-doc-purpose.ts`. New `validate_chain emit_agent_index` action writes `.sekkei-agent/llms.txt` (doc map + 4-step reading protocol). Reused `loadChainDocs`; feature-scoped docs expand to concrete file paths.
- **Phase 2 (Empirical Gate)**: Authored 5-doc reference corpus, ran two agent traces (baseline vs llms.txt). **Verdict: QUALIFIED GO**. Key finding: doc-level index doesn't enable pruning on multi-ID table structure — ID-level granularity is the real tool. Over-read scale is corpus-dependent.
- **Phase 3 (Reconciliation)**: `spec-index-builder.ts` + `spec-index-render.ts`. Same action also writes `spec-index.md` (ID│Type│Title-JA│Source│Status│Traced). `reconcile` subcommand flags added/removed/duplicate IDs + advisory next-free ID per numbering space + PARTIAL status banner.

## The Brutal Truth

This was a three-round code-review gauntlet. My unit tests **masked two critical bugs** that review caught:

1. **Phase 1**: `perFeatureRelPath` returned a directory path, not a file. Tests never called the export path with real files—caught cold by human review.
2. **Phase 3**: `reconcile` was non-idempotent. Prior run's non-origin IDs were flagged "removed" on the next run. Also, Source ID matching used `.includes()` — `SCR-001` collided with `SCR-0010` in a sibling file.

Both are fixed + regression-tested. This hurt because I relied on test isolation too heavily; the code never touched a real chain on disk until review.

## Technical Details

**Dualized code paths:**
- Origin IDs: emitted directly to `spec-index.md`
- Non-origin IDs (e.g., `SCR-SAL-001`): placed in a documented "Non-origin IDs (unreconciable)" note rather than dropped

**Empirical gate constraint:** Pre-registered ground truth + decision rule (QUALIFIED vs NO-GO) kept verdict honest. Actual finding: smaller corpora don't reproduce large-scale over-read; verdict was `QUALIFIED` (bounded certainty), not forced `GO`.

**Reuse discipline:** `loadChainDocs` and `buildTraceabilityMatrix` already existed; no new MCP tool; `chain_status` untouched.

Error metrics: 1058/1058 unit tests pass; `tsc --noEmit` clean after npm install (dev deps were pruned at session start).

## Root Cause Analysis

1. **Test isolation**: My mocks never hit real file I/O. Caught on dry-run; fixed with integration fixtures.
2. **Non-idempotence oversight**: Did not model the prior-file read loop as a state machine; reconcile became a "detect changes from empty baseline" rather than "diff old vs new". Fixed by storing reconcile checksum.
3. **String matching laziness**: `.includes()` instead of exact-token parse. Lesson: use boundary or numeric comparison when field order matters.

## Lessons Learned

- **Adversarial review saves code.** Code-reviewer ran scenarios I didn't model (real multi-ID files, repeated reconcile runs). Human scrutiny > comprehensive unit isolation.
- **Empirical gates ground design.** Pre-registering a decision rule (QUALIFIED GO if agents still read all docs; NO-GO if we can't bound the cost) kept the spec index honest. The finding (ID-level > doc-level) shaped Phase 3.
- **Exact matching disciplines specs.** When reconciling IDs, use regex or numeric comparison, not substring search. One extra `.split('-')[1]` prevents future collisions.

## Next Steps

1. **No breaking changes required.** `emit_agent_index` is additive; existing tools unaffected.
2. **Rotate GitHub PAT in `.npmrc`** (contains `ghp_…` key; excluded from commit, but needs immediate rotation + VCS guard).
3. **Future: ID-level anchors** — Next phase could render anchors per ID row (e.g., `## F-001`) so downstream agents can deep-link. Blocked by table-row ID collapse + template renderer slug mismatch; noted in Phase 3 report.

**Test status:** 1058/1058 passing. Type check clean. Ready for merge and downstream agent consumption.
