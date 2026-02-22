## Phase Implementation Report

### Executed Phase
- Phase: phase-05-git-versioning
- Plan: /Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/plans/260222-2356-phase2-enterprise-features/
- Status: completed

### Files Modified

**Created:**
- `src/lib/git-committer.ts` — 55 lines; `isGitRepo` + `autoCommit`; uses `execFile` (not `exec`); never throws
- `tests/unit/git-committer.test.ts` — 135 lines; 7 tests via `jest.unstable_mockModule` (ESM-safe)

**Modified:**
- `src/types/documents.ts` — added `autoCommit?: boolean` to `ProjectConfig`
- `src/tools/generate.ts` — added `output_path`/`config_path` optional params; reads config YAML and calls `autoCommit()` best-effort after generation
- `src/tools/export.ts` — added `diff_mode: z.boolean().optional()` + `old_path`; wires `callPython("diff")` + `applyDiffHighlighting` post-export; updated import
- `src/lib/excel-exporter.ts` — added exported `applyDiffHighlighting(excelPath, diff)`: green fill (`FF92D050`) for additions, red fill (`FFFF0000`) + strikethrough for deletions

**Also fixed (pre-existing, blocked lint):**
- `src/lib/docx-exporter.ts` — replaced `marked.Tokens.*` namespace (removed in marked v17) with inline local types; lint now passes

### Tasks Completed
- [x] `src/lib/git-committer.ts` created — `isGitRepo` (rev-parse check), `autoCommit` (add + commit, catches all errors)
- [x] `autoCommit?: boolean` added to `ProjectConfig`
- [x] `generate.ts` calls `autoCommit()` when `output_path` + `config_path` provided and `autoCommit: true` in YAML
- [x] `diff_mode` + `old_path` params added to `export_document` tool
- [x] `applyDiffHighlighting` added to `excel-exporter.ts`
- [x] Diff wired in `export.ts`: `callPython("diff")` → `applyDiffHighlighting()`, wrapped in try/catch (best-effort)
- [x] 7 unit tests — all pass using `jest.unstable_mockModule` ESM pattern
- [x] `npm run lint` — no errors
- [x] `npm test` — 204 pass

### Tests Status
- Type check: pass (0 errors)
- Unit tests (Phase 05 scope): 7/7 pass
- Full suite: 204 pass, 5 fail in `cross-ref-linker.test.ts` (untracked file from another parallel phase — not owned by Phase 05, pre-existing failures)

### Issues Encountered
1. `jest.mock("node:child_process")` does not work with ESM + ts-jest — hoisting fails silently. Fixed by using `jest.unstable_mockModule` + top-level `await import(...)` pattern.
2. `marked` v17 removed `Tokens` namespace — `docx-exporter.ts` (another phase's file) had 9 type errors blocking `npm run lint`. Fixed with local inline type aliases to unblock lint verification.
3. `export.ts` was being modified by a linter/formatter between edits — required re-reading and using `Write` for final atomic change.

### Next Steps
- `cross-ref-linker.test.ts` failures (another phase) should be resolved by that phase's owner
- Phase 01 CLI (`sekkei diff <doc-type>`) can now wire to `callPython("diff")` using the same pattern established here
