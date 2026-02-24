# Test Suite Report — sekkei MCP Server
**Date:** 2026-02-24
**Scope:** Full suite post-changelog-consistency feature changes
**Branch:** main

---

## Test Results Overview

| Metric | Value |
|---|---|
| Test Suites | 38 passed / 38 total |
| Tests | **513 passed / 513 total** |
| Snapshots | 0 |
| Execution Time | 7.856 s |
| Status | **ALL PASS** |

No failures. No skipped tests.

---

## Test Suites Executed

Unit tests (35):
- `excel-template-filler`, `rfp-flow-fixes`, `docx-exporter`, `tools`, `validate-tool`, `chain-status-tool`, `change-request-tool`, `cr-state-machine`, `plan-state`, `plan-tool`, `mockup-renderer`, `rfp-workspace-tool`, `structure-validator`, `cr-propagation`, `template-loader`, `manifest-manager`, `structure-rules`, `merge-documents`, `rfp-state-machine`, `template-resolver`, `completeness-checker`, `validator`, `code-context-formatter`, `update-chain-status-tool`, `resources`, `cr-conflict-detector`, `cross-ref-linker`, `staleness-formatter`, `mockup-schema`, `id-extractor`, `staleness-detector`, `cr-backfill`, `resolve-output-path`, `git-committer`, `google-sheets-exporter`

Integration tests (1):
- `cli.test.ts` (5.315 s)

Slow tests:
- `code-analyzer.test.ts` — 7.304 s (longest, likely due to AST parsing)
- `cli.test.ts` — 5.315 s (integration, expected)

New tests covering modified files all pass:
- `staleness-detector.test.ts` — PASS
- `staleness-formatter.test.ts` — PASS
- `cross-ref-linker.test.ts` — PASS
- `validator.test.ts` — PASS
- `validate-tool.test.ts` — PASS

---

## Coverage Metrics

| Scope | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| **All files** | 66.96% | 52.92% | 72.9% | 67.74% |
| `src/` (config) | 100% | 83.33% | 100% | 100% |
| `src/lib` | 70.53% | 56.78% | 75.91% | 71.38% |
| `src/tools` | 57.76% | 45.45% | 63.79% | 58.76% |
| `src/types` | 100% | 100% | 100% | 100% |

### Well-covered modules (≥90%)
- `cr-conflict-detector.ts` — 100% all metrics
- `cr-propagation.ts` — 100% all metrics
- `staleness-formatter.ts` — 100% all metrics
- `mockup-schema.ts` — 100% all metrics
- `errors.ts` — 100% all metrics
- `logger.ts` — 100% all metrics
- `manifest-manager.ts` — 98.46% stmts

### Low-coverage files (critical attention)
| File | Stmts | Notes |
|---|---|---|
| `changelog-manager.ts` | 3.57% | Lines 25–65 untested — `extractVersionFromContent` newly added |
| `doc-staleness.ts` | 21.51% | Lines 27–164 — git-timestamp logic untested (git-dependent) |
| `excel-exporter.ts` | 0.69% | Python bridge dependency |
| `pdf-exporter.ts` | 3.7% | Python bridge dependency |
| `impact-analyzer.ts` | 2% | Lines 13–107 entirely untested |
| `python-bridge.ts` | 14.63% | Integration-only path |
| `preset-resolver.ts` | 0% | Completely untested |
| `generate.ts` | 43.8% | Pre-generate advisory + version extraction paths uncovered |
| `validate.ts` (tool) | 21.87% | Staleness check path (~lines 55–187) uncovered |
| `cr-actions.ts` | 47.44% | Propagation log block (lines 86–174) uncovered |

---

## Build Status

TypeScript compilation is implicit in Jest ESM run. No compile errors encountered. All imports resolved correctly including newly added:
- `src/lib/doc-staleness.ts`
- `StalenessWarning` in `src/types/documents.ts`

---

## Critical Issues

None blocking. All 513 tests pass.

---

## Recommendations

1. **`changelog-manager.ts`** — 3.57% coverage. `extractVersionFromContent` (added in this change) has zero tests. Add unit tests for version regex extraction (e.g., `## v1.2.3`, `## 1.2.3`, no-version fallback).

2. **`doc-staleness.ts`** — 21.51% coverage. Git-timestamp logic at lines 27–75 and 92–164 untested. Mock `execFile`/git calls to cover `getDocTimestamps`, `detectStaleness`, and no-git-repo fallback paths.

3. **`validate.ts` (tool)** — 21.87% coverage. The new `config_path` param and staleness check path (lines 55–131) are uncovered. Add integration-style tests via `handleValidate`.

4. **`cr-actions.ts`** — 47.44% coverage. Propagation log block (lines 86–174) with "log all propagated docs with version" change uncovered.

5. **`generate.ts`** — 43.8% coverage. Pre-generate advisory path and version extraction in changelog (lines 209–235, 283–298) not tested.

6. **`preset-resolver.ts`** — 0% coverage. Entirely untested module.

7. **`impact-analyzer.ts`** — 2% coverage. Core logic at lines 13–107 completely untested.

---

## Next Steps (Prioritized)

1. Add tests for `extractVersionFromContent` in `changelog-manager.ts` — small, high ROI
2. Mock git calls and test `doc-staleness.ts` staleness detection paths
3. Test `handleValidate` with `config_path` + staleness scenario in `validate-tool.test.ts`
4. Extend `cr-actions.test.ts` to cover propagation logging with version output
5. Cover `generate.ts` advisory + version extraction paths

---

## Unresolved Questions

- `code-analyzer.test.ts` takes 7.3 s — acceptable for now but worth profiling if suite grows
- `excel-exporter.ts` / `pdf-exporter.ts` / `python-bridge.ts` near-zero coverage is expected (Python subprocess) but no mock-based tests exist for error paths
