# Code Review: Phase 2 Enterprise Features

**Reviewer:** code-reviewer | **Date:** 2026-02-23 | **Score: 8.5/10**

## Scope

- **New files:** 16 (lib: 5, tools: 1, cli: 8, bin: 1, types additions)
- **Modified files:** 10 (tools: 5, lib: 2, types: 1, package.json: 1, index: 1)
- **Total LOC reviewed:** ~2821 across 23 files
- **Tests:** 21 suites, 215 tests -- all passing
- **TypeScript lint:** Clean (tsc --noEmit passes with zero errors)
- **Focus:** Security, error handling, backward compat, ESM, file size limits

## Overall Assessment

Solid implementation. Handler extraction pattern (separate `handleXxx` from `registerXxxTool`) enables clean CLI reuse. Cross-ref linker and completeness rules are well-architected. All existing tests continue to pass. Security posture is good with path traversal checks on all user-facing paths. A few medium-priority issues found, no critical vulnerabilities.

---

## Critical Issues

**None found.**

---

## High Priority

### H-1. `cross-ref-linker.ts` exceeds 200-line limit (255 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`

Per project rules, files should be under 200 lines. At 255 lines this file should be split. Suggestion: extract `loadChainDocs()` (lines 70-126) into a separate `chain-doc-loader.ts` module.

### H-2. `generate.ts` exceeds 200-line limit (268 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/generate.ts`

At 268 lines. The `PROJECT_TYPE_INSTRUCTIONS` map (lines 67-86) and `buildSplitInstructions` (lines 88-112) could be extracted to a dedicated instructions module.

### H-3. `excel-exporter.ts` exceeds 200-line limit (283 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/excel-exporter.ts`

At 283 lines. The `applyDiffHighlighting` function (lines 241-283) is a distinct concern and could live in a separate `diff-highlighter.ts` module.

### H-4. `validator.ts` exceeds 200-line limit (364 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/validator.ts`

At 364 lines. Already split `completeness-rules.ts` out -- good. Could further extract `validateSplitDocument` (lines 294-352) and related constants into `split-validator.ts`.

### H-5. `docx-exporter.ts` slightly over limit (208 lines)

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/docx-exporter.ts`

Minor overage. Consider extracting `parseMarkdownToBlocks` block into its own module if the file grows further.

### H-6. Inconsistent path traversal validation in `docx-exporter.ts`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/docx-exporter.ts`, line 192

```typescript
if (output_path.includes("..")) {
```

This is weaker than `excel-template-filler.ts` which uses `resolve()` + segment splitting. The string `..` check can be bypassed on some OS path encodings, though in practice this is adequate for Node.js path resolution. For consistency, consider reusing the same `assertNoTraversal()` pattern from `excel-template-filler.ts`.

**Fix suggestion:** Extract a shared `assertNoTraversal` utility into `lib/path-utils.ts` and reuse across both exporters and cross-ref-linker.

---

## Medium Priority

### M-1. `config-loader.ts` has no error handling

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/cli/config-loader.ts`, line 16

```typescript
export async function loadCliConfig(configPath?: string): Promise<CliConfig> {
  const path = resolve(configPath ?? "sekkei.config.yaml");
  const raw = await readFile(path, "utf-8");
  return parseYaml(raw) as CliConfig;
}
```

No try/catch. If the file doesn't exist or YAML is malformed, the raw Node error propagates up. Since CLI commands that use this function (currently none -- it's defined but unused) would need user-friendly errors, add error handling or note this is intentional.

**Status:** `loadCliConfig` is currently **unused by any CLI command**. The CLI commands call their respective `handleXxx` functions directly, bypassing this loader. Consider removing it (YAGNI) or integrating it.

### M-2. `cross-ref-linker.ts` ID_PATTERN duplicates `id-extractor.ts` pattern

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`, line 36

The regex `ID_PATTERN` is duplicated from `id-extractor.ts` line 16. Should import from `id-extractor.ts` to maintain DRY.

```typescript
// Current (duplicated):
const ID_PATTERN = /\b(F|REQ|NFR|SCR|TBL|API|CLS|DD|TS|UT|IT|ST|UAT|OP|MIG)-(\d{1,4})\b/g;

// Suggested: export from id-extractor.ts and import
import { ID_PATTERN } from "./id-extractor.js";
```

### M-3. `cross-ref-linker.ts` buildIdGraph conflates "defined" and "referenced"

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`, lines 142-152

```typescript
export function buildIdGraph(docs: Map<string, string>): IdGraph {
  const graph: IdGraph = new Map();
  for (const [docType, content] of docs) {
    const allIds = extractStandardIds(content);
    const customIds = extractAllIds(content);
    const defined = new Set([...allIds, ...customIds]);
    graph.set(docType, { defined, referenced: allIds });
  }
  return graph;
}
```

Both `defined` and `referenced` contain the same standard IDs for each doc. The semantic distinction (which IDs originate from this doc vs. which are referenced from upstream) is resolved later in `analyzeGraph` via `ID_ORIGIN` lookup. This is correct but the naming is misleading. The JSDoc comment (line 139) explains the intent, but renaming `defined` to `allPresent` would improve clarity.

### M-4. `excel-exporter.ts` inconsistent path traversal check

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/excel-exporter.ts`, line 197

```typescript
if (resolve(output_path) !== output_path && output_path.includes("..")) {
```

This AND condition is too permissive: `resolve(output_path) !== output_path` is true for relative paths (even safe ones like `./output.xlsx`). The check only blocks paths that are BOTH non-absolute AND contain `..`. For relative paths without `..`, it passes. For absolute paths with `..` (e.g., `/tmp/../etc/file.xlsx`), `resolve()` normalizes it so the first condition is true, and the second is also true, so it correctly blocks. But the logic is confusing. Use the same pattern as `excel-template-filler.ts` for clarity.

### M-5. `cross-ref-linker.ts` readDirMarkdown uses recursive readdir with no depth limit

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts`, line 51

```typescript
const entries = await readdir(dirPath, { recursive: true });
```

Combined with the 500KB per-file guard, this is mostly safe. But a deeply nested directory tree could still cause slowness. The 500KB guard is good. Consider adding a max file count guard (e.g., first 100 files) for robustness.

### M-6. `generate.ts` auto-commit runs after returning generation result

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/generate.ts`, lines 232-243

The auto-commit block fires when `output_path && config_path` are provided. However, in MCP mode, `generate_document` returns template + instructions for the AI to generate content -- the file hasn't been written yet at this point. The auto-commit would `git add` a potentially non-existent file. This only makes sense if the file was written by a prior step and this call is a follow-up. The `output_path` schema description says "used for git auto-commit" but the flow is: (1) tool returns template, (2) AI generates content, (3) AI saves file, (4) ... when does git add happen?

**Edge case:** If `output_path` points to a file that doesn't exist yet, `git add` will fail silently (caught by try/catch in `autoCommit`). Not harmful but misleading. Document the intended workflow or move auto-commit to a separate tool/CLI command.

### M-7. No `validate_chain` schema validation for path traversal double-check

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/tools/validate-chain.ts`, line 88

Good: Zod schema already checks `!p.includes("..")` and `.yaml/.yml` extension. The `validateConfigPath()` in `cross-ref-linker.ts` duplicates these checks. Redundant but defense-in-depth -- acceptable.

---

## Low Priority

### L-1. `docx-exporter.ts` marked v17 type workarounds

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/docx-exporter.ts`, lines 21-27

Heavy use of `as unknown as` casts for marked Token types. Consider using `@types/marked` or augmenting the types if marked v17 has improved type exports.

### L-2. `cli-logger.ts` is unused by CLI commands

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/cli/cli-logger.ts`

`cliLogger` is defined but never imported by any CLI command file. The CLI commands use `handleXxx` which internally uses the MCP `logger` (pino on fd 2). This file can be removed (YAGNI) or integrated.

### L-3. `bin/cli.js` missing newline at end of file

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/bin/cli.js`

Minor: 2 lines, no trailing newline. Not impactful.

### L-4. `screen-design` not in `CONTENT_DEPTH_RULES`

**File:** `/Users/bienhoang/Documents/Projects/specs-skills-for-japan/sekkei/packages/mcp-server/src/lib/completeness-rules.ts`

Screen-design is a valid doc type but has no completeness rules. This is fine if intentional (MVP). For completeness, could add a check for `SCR-xxx` IDs in screen-design docs.

---

## Edge Cases Found (Scout Phase)

1. **cross-ref-linker + id-extractor divergence risk**: If `ID_PATTERN` in `cross-ref-linker.ts` gets updated but `id-extractor.ts` doesn't (or vice versa), the two modules will produce inconsistent ID sets. The DRY violation (M-2) creates a maintenance hazard.

2. **fillTables row mutation during iteration**: `excel-template-filler.ts` line 124 iterates rows with `eachRow` while `fillTables` writes to cells in the same sheet. ExcelJS handles this correctly because `eachRow` snapshots rows, but it's a subtle pattern worth a comment.

3. **git-committer `dirname(outputPath)` for cwd**: If `outputPath` is a filename without directory (e.g., `doc.md`), `dirname` returns `.` which resolves to CWD. This is fine but worth noting that relative paths in `output_path` mean git operations happen in whatever CWD the process was started in.

4. **cross-ref-linker `readDirMarkdown` entries type**: Node.js `readdir({ recursive: true })` returns `string[]` in Node 20+ but the type check `typeof entry === "string"` (line 54) is unnecessary -- it's always string when `withFileTypes` is not set. Harmless but adds confusion.

5. **validate-chain tool passes user-supplied `config_path` to `readFile` without resolving**: `cross-ref-linker.ts` line 72 calls `resolve(configPath)` which handles relative paths. Combined with Zod schema's `!p.includes("..")` check, this is safe.

---

## Positive Observations

1. **Handler extraction pattern**: Clean separation of `handleXxx()` from `registerXxxTool()` enables CLI reuse without code duplication. Well done.

2. **git-committer never-throw design**: `autoCommit` catches all errors and writes to stderr. Excellent for a best-effort side-effect -- never blocks the main workflow.

3. **Defense in depth**: Path traversal checks at both Zod schema level (tool registration) and function level (cross-ref-linker, template filler). Multiple layers of validation.

4. **completeness-rules as separate module**: Clean separation of content depth rules from validator core. Easy to extend per doc type.

5. **CLI integration tests**: Spawning `bin/cli.js` as subprocess validates the full path from entrypoint to output. Good coverage of --help, status, and validate.

6. **Test quality**: 215 tests covering edge cases (path traversal, empty input, missing files, exit codes). Git-committer mock tests exercise all branches including "nothing to commit" code path.

7. **ESM conventions**: All imports use `.js` extensions. `bin/cli.js` uses `#!/usr/bin/env node` with ESM import. `type: "module"` in package.json.

8. **Python bridge whitelist updated**: `VALID_ACTIONS` in `python-bridge.ts` includes `export-docx` and `export-matrix` -- correctly expanded for new export.ts routes.

9. **Backward compatibility**: `check_completeness` flag defaults to off, existing `validateDocument` callers unaffected. Tests explicitly verify backward compat.

---

## Metrics

| Metric | Value |
|--------|-------|
| TypeScript Lint | 0 errors |
| Test Suites | 21 passing |
| Tests | 215 passing |
| Files over 200 LOC | 4 (cross-ref-linker: 255, generate: 268, excel-exporter: 283, validator: 364) |
| New dependencies | citty ^0.2.1, docx ^9.5.3 (both justified) |
| Security issues | 0 critical, 1 medium (inconsistent path traversal check) |

---

## Recommended Actions (Prioritized)

1. **[High]** Extract shared `assertNoTraversal()` into `lib/path-utils.ts`, reuse in docx-exporter, excel-exporter, and excel-template-filler
2. **[High]** Split `cross-ref-linker.ts` to stay under 200 lines (extract chain doc loading)
3. **[High]** Split `validator.ts` -- extract `validateSplitDocument` into `split-validator.ts`
4. **[Medium]** Deduplicate `ID_PATTERN` regex -- export from `id-extractor.ts` and import in `cross-ref-linker.ts`
5. **[Medium]** Remove unused `config-loader.ts` and `cli-logger.ts` (YAGNI) or integrate them
6. **[Medium]** Clarify auto-commit timing in `generate.ts` -- document that the file must already exist
7. **[Low]** Add comments in `excel-template-filler.ts` about row iteration safety during `fillTables`

---

## Unresolved Questions

1. Is the auto-commit in `generate.ts` intentionally placed at generation-time (before the AI actually writes the file), or should it be triggered by a separate MCP tool call after the file is saved?
2. Should `detail-design` and `screen-design` doc types get completeness rules in a future phase, or is the current coverage intentionally scoped to MVP?
3. The `config-loader.ts` and `cli-logger.ts` were created but never used -- are these placeholders for future CLI features, or should they be removed?
