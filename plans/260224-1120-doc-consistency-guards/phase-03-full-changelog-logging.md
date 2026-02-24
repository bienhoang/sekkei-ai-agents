# Phase 03: Full Global CHANGELOG Logging

## Context

- Parent: [plan.md](plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260224-1120-doc-consistency-gaps.md) — Solution 3
- Current gap: CR `handleComplete` logs only `origin_doc` (L119-128 in `cr-actions.ts`); `generate_document` logs with empty version (L355-366 in `generate.ts`)

## Overview

- **Priority**: P2
- **Status**: completed
- **Description**: Fix CHANGELOG logging to (a) log ALL propagated docs on CR completion, (b) extract version from 改訂履歴 table, (c) populate version in `generate_document` changelog entry.

## Key Insights

- `handleComplete()` in `cr-actions.ts` L109-131 reads CR state which has `propagation_steps[]` (type at `change-request.ts` L35)
- Each `PropagationStep` has `doc_type` and `status` ("done"/"skipped"/"pending")
- To get file paths for version extraction, need `loadChainDocPaths()` from Phase 1 (or inline config reading)
- Version pattern in 改訂履歴: `| 1.0 | 2026-02-24 | ... |` — regex `^\|\s*(\d+\.\d+)\s*\|` (already used in `validator.ts` L332)
- `appendGlobalChangelog()` in `changelog-manager.ts` L31-51 takes `ChangelogEntry` with `version` field
- `generate.ts` L355-366 calls `appendGlobalChangelog` with `version: ""` — needs extraction from `existing_content`

## Requirements

### Functional
- FR1: `extractVersionFromContent(content)` returns latest version string from 改訂履歴 table
- FR2: CR `handleComplete` iterates `propagation_steps` where `status === "done"`, reads each doc, extracts version, logs to CHANGELOG
- FR3: `generate_document` extracts version from `existing_content` 改訂履歴 and passes to CHANGELOG
- FR4: Origin doc also logged (preserve existing behavior)

### Non-Functional
- NFR1: All CHANGELOG operations remain non-blocking (try/catch)
- NFR2: If doc file unreadable, log with empty version (graceful degradation)

## Architecture

```
handleComplete(args)                         # cr-actions.ts
  ├── readCR(filePath) → cr
  ├── transitionCR(COMPLETED)
  ├── appendGlobalChangelog(origin_doc)       # EXISTING — add version
  └── for step in cr.propagation_steps:      # NEW
       if step.status === "done":
         path = resolveDocPath(configPath, step.doc_type)
         content = readFile(path)
         version = extractVersionFromContent(content)
         appendGlobalChangelog(step.doc_type, version, cr.id)

extractVersionFromContent(content)           # changelog-manager.ts — NEW
  └── regex on 改訂履歴 rows → return last 版数 value
```

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/lib/changelog-manager.ts` — add `extractVersionFromContent()` (L52+)
- `sekkei/packages/mcp-server/src/tools/cr-actions.ts` — expand `handleComplete()` L109-131 to log all propagated docs
- `sekkei/packages/mcp-server/src/tools/generate.ts` — extract version from `existing_content` at L355-366

### Read (no modify)
- `sekkei/packages/mcp-server/src/types/change-request.ts` — `PropagationStep` type reference
- `sekkei/packages/mcp-server/src/lib/validator.ts` — L293-306 `extractRevisionSection` pattern to reuse

### Create
- `sekkei/packages/mcp-server/tests/unit/changelog-version.test.ts` — unit tests

## Implementation Steps

1. **Add `extractVersionFromContent()` to `changelog-manager.ts`**
   ```typescript
   /** Extract latest version from 改訂履歴 table (last 版数 value) */
   export function extractVersionFromContent(content: string): string {
     const lines = content.split("\n");
     let capturing = false;
     let lastVersion = "";
     for (const line of lines) {
       if (/^#{1,4}\s+改訂履歴/.test(line)) { capturing = true; continue; }
       if (capturing && /^#{1,4}\s/.test(line)) break;
       if (capturing) {
         const match = line.match(/^\|\s*(\d+\.\d+)\s*\|/);
         if (match) lastVersion = match[1];
       }
     }
     return lastVersion;
   }
   ```
   - Pattern mirrors `extractRevisionSection()` in `validator.ts` L293-306 and version regex at L332

2. **Update `handleComplete()` in `cr-actions.ts`**
   - After existing `appendGlobalChangelog` call (L119-128):
   ```typescript
   // Log all propagated docs
   if (args.config_path && cr.propagation_steps.length > 0) {
     try {
       const { loadChainDocPaths } = await import("../lib/doc-staleness.js");
       const { extractVersionFromContent } = await import("../lib/changelog-manager.js");
       const docPaths = await loadChainDocPaths(args.config_path);
       for (const step of cr.propagation_steps) {
         if (step.status !== "done") continue;
         if (step.doc_type === cr.origin_doc) continue; // already logged above
         const docPath = docPaths.get(step.doc_type);
         let version = "";
         if (docPath) {
           try {
             const content = await readFile(docPath, "utf-8");
             version = extractVersionFromContent(content);
           } catch { /* file unreadable */ }
         }
         await appendGlobalChangelog(args.workspace_path, {
           date: new Date().toISOString().slice(0, 10),
           docType: step.doc_type,
           version,
           changes: `Propagated from ${cr.origin_doc}: ${cr.description}`,
           author: "",
           crId: cr.id,
         });
       }
     } catch { /* non-blocking */ }
   }
   ```

3. **Also extract version for origin doc logging**
   - Update existing changelog call at L119-128 to extract version from origin doc:
   ```typescript
   let originVersion = "";
   if (args.config_path) {
     try {
       const { loadChainDocPaths } = await import("../lib/doc-staleness.js");
       const { extractVersionFromContent } = await import("../lib/changelog-manager.js");
       const docPaths = await loadChainDocPaths(args.config_path);
       const originPath = docPaths.get(cr.origin_doc);
       if (originPath) {
         const content = await readFile(originPath, "utf-8");
         originVersion = extractVersionFromContent(content);
       }
     } catch { /* non-blocking */ }
   }
   ```
   - Pass `originVersion` as `version` field

4. **Update `generate.ts` to extract version from `existing_content`**
   - At L355-366, replace `version: ""`:
   ```typescript
   if (existing_content && config_path) {
     try {
       const { extractVersionFromContent } = await import("../lib/changelog-manager.js");
       const version = extractVersionFromContent(existing_content);
       const workspacePath = dirname(config_path);
       await appendGlobalChangelog(workspacePath, {
         date: new Date().toISOString().slice(0, 10),
         docType: doc_type,
         version,
         changes: "Regenerated from upstream",
         author: "",
         crId: "",
       });
     } catch { /* non-blocking */ }
   }
   ```

5. **Add `readFile` import to `cr-actions.ts`** if not present
   - Check existing imports; `readFile` from `node:fs/promises` may need adding

6. **Write tests**
   - `extractVersionFromContent`: valid table -> "1.2"; empty table -> ""; no 改訂履歴 -> ""
   - `handleComplete` with propagation_steps: verify multiple changelog entries appended
   - `handleGenerateDocument` with existing_content: verify version extracted and logged

## Todo

- [x] Add `extractVersionFromContent()` to `changelog-manager.ts`
- [x] Update `handleComplete()` to log all propagated docs with version
- [x] Update `handleComplete()` origin doc logging with version extraction
- [x] Update `generate.ts` to extract version from `existing_content`
- [x] Add `readFile` import to `cr-actions.ts` if missing
- [x] Write unit tests for version extraction
- [x] Write integration-style test for multi-doc changelog logging
- [x] Verify existing CR flow tests pass

## Success Criteria

- CR completion produces N+1 CHANGELOG rows (1 origin + N propagated docs with status "done")
- Each row has correct version from 改訂履歴 (or empty if unavailable)
- `generate_document` regeneration logs with actual version
- All existing tests pass

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Many appends on large CR | Low | Each append is one file write; append-only pattern already proven |
| `config_path` not provided to handleComplete | None | Propagation logging silently skipped; origin-only logging preserved |
| File read failures during version extraction | None | Empty version, non-blocking |

## Security Considerations

- `config_path` validated via existing `requireConfigPath()` in `cr-actions.ts` L33-35
- File reads only from paths derived from config (no user-controlled paths)
- `readFile` calls bounded by config-resolved paths

## Next Steps

- Phase 4 updates skill documentation to reflect all new behaviors
