---
title: "Phase 05: Git-based Versioning + 朱書き Diff (C2)"
status: complete
priority: P2
effort: 0.75d
---

# Phase 05: Git-based Versioning + 朱書き Diff (C2)

## Context Links
- Work context: `sekkei/packages/mcp-server/`
- Existing diff: `python/nlp/diff_analyzer.py` — already implemented
- Python bridge: `src/lib/python-bridge.ts` — `VALID_ACTIONS` includes `"diff"`
- Skill: `sekkei/skills/sekkei/SKILL.md` → `sekkei:diff-visual` sub-command
- Export tool: `src/tools/export.ts` — 朱書き Excel needs to be wired here
- Config: `src/config.ts` → `ServerConfig`; sekkei.config.yaml → `output.directory`

## Overview
- **Priority:** P2
- **Status:** pending; independent of other phases
- **Goal:** Auto-commit on generation + `sekkei diff` CLI command that calls existing `diff_analyzer.py` and produces 朱書き (redline) Excel

## Key Insights
- `execFile("git", [...])` is the correct pattern (consistent with python-bridge, avoids shell injection)
- Git operations are best-effort: if git not initialized, log warning and continue (don't fail generation)
- `diff_analyzer.py` already exists and outputs JSON diff — just need wiring in `export.ts` for 朱書き Excel
- 朱書き Excel: additions = green fill (ARGB `FF92D050`), deletions = red fill (ARGB `FFFF0000`) with strikethrough
- Git commit message format: `sekkei: update {doc_type} v{version}` (conventional + traceable)

## Requirements
<!-- Updated: Validation Session 1 - Auto-commit changed from always-on to opt-in via config -->
- **Functional:**
  - Post-generation auto-commit: `git add <output_path> && git commit -m "sekkei: update {doc_type}"` — **only when `autoCommit: true` in sekkei.config.yaml** (default: false)
  - `export_document` with `format: "xlsx"` + `diff_mode: true` → 朱書き Excel via diff bridge
  - `sekkei diff <doc-type>` CLI command (Phase 01 wires this)
  - New `diff_mode` boolean param on `export_document` tool
  - New `autoCommit` field in `sekkei.config.yaml` schema (boolean, default false)
- **Non-functional:** git operations non-blocking (fire-and-forget with error logging); diff only when git history exists

## Architecture

```
lib/git-committer.ts
  autoCommit(outputPath, docType, version?): Promise<void>
    ├─ isGitRepo(dir): boolean          ← execFile("git", ["rev-parse"])
    ├─ stageFile(path): Promise<void>   ← execFile("git", ["add", path])
    └─ commit(msg): Promise<void>       ← execFile("git", ["commit", "-m", msg])

tools/export.ts  (modify)
  └─ diff_mode: true
       └─ callPython("diff", { old_path, new_path, output_path })
            → diff_analyzer.py returns JSON diff
       └─ applyDiffHighlighting(excelPath, diff)  ← in excel-exporter.ts
```

Diff highlighting in ExcelJS:
```ts
// additions: green fill
cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
// deletions: red fill + strikethrough
cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
cell.font = { strike: true };
```

## Related Code Files

**Create:**
- `src/lib/git-committer.ts` — git operation wrapper (~60 lines)

**Modify:**
- `src/tools/export.ts` — add `diff_mode?: boolean` to inputSchema; wire 朱書き path
- `src/lib/excel-exporter.ts` — add `applyDiffHighlighting(wb, diff)` function
- `src/tools/generate.ts` — call `autoCommit()` after successful generation (best-effort)

## Implementation Steps

1. Create `src/lib/git-committer.ts`:
   - `isGitRepo(dir)` — `execFile("git", ["rev-parse", "--is-inside-work-tree"])` in dir
   - `autoCommit(outputPath, docType)` — stage + commit; catch and log errors, never throw
2. Add `autoCommit?: boolean` to `ProjectConfig` type in `documents.ts` (default false)
3. Modify `generate.ts`: after writing output file, read config → if `autoCommit === true`, call `autoCommit()` wrapped in try/catch
3. Add `diff_mode?: z.boolean().optional()` to export.ts inputSchema
4. In `export.ts` handler: if `diff_mode === true`, call `callPython("diff", ...)` then `applyDiffHighlighting()`
5. Add `applyDiffHighlighting(wb, diff)` to `excel-exporter.ts`
6. Wire `sekkei diff` CLI command in Phase 01's `src/cli/commands/` (placeholder if Phase 01 not done)
7. Write unit tests for `git-committer.ts` (mock execFile)

## Todo List

- [x] Create `src/lib/git-committer.ts`
- [x] Implement `isGitRepo`, `stageFile`, `commit`, `autoCommit`
- [x] Add `autoCommit?: boolean` to `ProjectConfig` in `documents.ts`
- [x] Modify `generate.ts` — best-effort `autoCommit()` after write (only if config.autoCommit)
- [x] Add `diff_mode` param to `export.ts` inputSchema
- [x] Add `applyDiffHighlighting` to `excel-exporter.ts`
- [x] Wire diff path in `export.ts` handler
- [x] Write unit tests (mock execFile — jest.unstable_mockModule for ESM)
- [x] `npm run lint` — no errors
- [x] `npm test` — 204 pass (7 new, 5 failures in cross-ref-linker owned by another phase)

## Success Criteria
- Document generation auto-commits if `autoCommit: true` in config AND inside a git repo
- `autoCommit: false` (default): generation completes, no git operations
- Non-git directory: generation completes, warning logged, no error thrown
- `export_document { diff_mode: true }` produces Excel with green/red highlighted changes
- Unit tests: mock git call succeeds, mock git call fails (graceful handling)

## Risk Assessment
- **No git repo initialized** — mitigate: `isGitRepo()` check, skip commit silently
- **diff_analyzer.py returns empty diff (no previous version)** — mitigate: check git log depth; skip 朱書き if no prior commit
- **git commit fails (nothing to commit)** — mitigate: check exit code 1 vs actual error; exit code 1 = "nothing to commit" is OK

## Security Considerations
- `execFile` not `exec` — no shell injection; git path args never from user input
- Output path for `git add` is the same validated path from tool input (already Zod-checked)
- Commit message: template string with doc_type (enum-constrained) — no injection possible

## Next Steps
- Phase 01 CLI `sekkei diff <doc-type>` command will call this
- Consider adding `--since <commit>` flag to diff command in future
