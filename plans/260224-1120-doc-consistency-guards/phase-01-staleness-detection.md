# Phase 01: Staleness Detection in Validator (Guard A)

## Context

- Parent: [plan.md](plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260224-1120-doc-consistency-gaps.md) — Solution 1, Guard A
- Related: `staleness-detector.ts` (feature-level staleness, different concern)

## Overview

- **Priority**: P2
- **Status**: completed
- **Description**: Add document-level staleness detection to `validate_document` and `validate_chain`. Compare git last-modified timestamps of upstream doc vs downstream doc. If upstream is newer, emit WARNING.

## Key Insights

- `CHAIN_PAIRS` in `cross-ref-linker.ts` L13-53 defines all upstream/downstream relationships -- reuse for staleness pairs
- `loadChainDocs()` in `cross-ref-linker.ts` L124-197 already loads all docs from config -- extend to return file paths alongside content
- `validateDocument()` in `validator.ts` L389-425 is the core validation function -- needs new `config_path` param for git lookups
- `handleValidateChain()` in `validate-chain.ts` L13-81 calls `validateChain()` which returns `ChainRefReport` -- extend report type
- `validate.ts` tool handler L42-227 formats output -- add staleness section
- Existing `simple-git` usage in `staleness-detector.ts` L125 provides import pattern

## Requirements

### Functional
- FR1: New function `checkDocStaleness(configPath)` returns per-pair staleness warnings
- FR2: `validate_chain` tool includes staleness section in output
- FR3: `validate_document` with `config_path` + `doc_type` checks staleness for that doc's upstream
- FR4: Staleness = upstream file's git last-modified > downstream file's git last-modified

### Non-Functional
- NFR1: WARNING severity only, never blocks validation
- NFR2: Git operations must not fail validation if repo unavailable (graceful fallback)
- NFR3: New `ValidationIssue.type` value: `"staleness"` (add to union type at `validator.ts` L13)

## Architecture

```
validate_chain(configPath)
  └── validateChain(configPath)           # cross-ref-linker.ts
       ├── loadChainDocs(configPath)       # existing
       ├── buildIdGraph(docs) + analyzeGraph()  # existing
       └── checkChainStaleness(configPath) # NEW
            ├── loadChainDocPaths(configPath)   # NEW helper
            └── for each CHAIN_PAIR:
                 git log -1 --format=%aI -- {upstream_path}
                 git log -1 --format=%aI -- {downstream_path}
                 if upstream_date > downstream_date → warning
```

## Related Code Files

### Modify
- `sekkei/packages/mcp-server/src/lib/validator.ts` — add `"staleness"` to `ValidationIssue.type` union (L13)
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — add `loadChainDocPaths()`, add staleness to `ChainRefReport`
- `sekkei/packages/mcp-server/src/tools/validate-chain.ts` — render staleness warnings in output (L30-81)
- `sekkei/packages/mcp-server/src/tools/validate.ts` — accept optional `config_path`, call staleness check (L42-227)
- `sekkei/packages/mcp-server/src/types/documents.ts` — extend `ChainRefReport` with `staleness_warnings`

### Create
- `sekkei/packages/mcp-server/src/lib/doc-staleness.ts` — new module: `checkChainStaleness()`, `checkDocStaleness()`
- `sekkei/packages/mcp-server/tests/unit/doc-staleness.test.ts` — unit tests

## Implementation Steps

1. **Add `"staleness"` to ValidationIssue type union**
   - File: `validator.ts` L13
   - Change: `type: "missing_section" | "missing_id" | ... | "staleness"`

2. **Create `doc-staleness.ts`**
   ```typescript
   // Exports:
   export interface StalenessWarning {
     upstream: string;      // doc type
     downstream: string;    // doc type
     upstreamModified: string;  // ISO date
     downstreamModified: string; // ISO date
     message: string;
   }

   export async function checkChainStaleness(configPath: string): Promise<StalenessWarning[]>
   export async function checkDocStaleness(configPath: string, docType: string): Promise<StalenessWarning[]>
   ```

3. **Implement `loadChainDocPaths()` helper**
   - Either add to `cross-ref-linker.ts` or inline in `doc-staleness.ts`
   - Same logic as `loadChainDocs()` but returns `Map<string, string>` (docType -> filePath) instead of content
   - Reuse config parsing logic

4. **Implement `checkChainStaleness()`**
   - Load doc paths via `loadChainDocPaths()`
   - Import `simpleGit` (pattern from `staleness-detector.ts` L125)
   - For each `CHAIN_PAIR` where both paths exist:
     - `git log -1 --format=%aI -- {path}` for upstream and downstream
     - Compare dates; if upstream > downstream, create `StalenessWarning`
   - Wrap all git ops in try/catch — return `[]` on failure

5. **Implement `checkDocStaleness()`**
   - Filter `CHAIN_PAIRS` to only pairs where downstream matches `docType`
   - Call same git timestamp logic
   - Return warnings for that doc's upstreams only

6. **Extend `ChainRefReport` type**
   - File: `types/documents.ts`
   - Add: `staleness_warnings?: StalenessWarning[]`

7. **Integrate into `validateChain()`**
   - File: `cross-ref-linker.ts` L328-332
   - After `analyzeGraph()`, call `checkChainStaleness(configPath)`
   - Attach result to `ChainRefReport.staleness_warnings`

8. **Update `handleValidateChain()` output**
   - File: `validate-chain.ts` L30-81
   - After traceability matrix section, add staleness warnings section:
     ```
     ## Staleness Warnings
     | Upstream | Downstream | Upstream Modified | Downstream Modified |
     ```

9. **Add `config_path` param to `validate_document` tool**
   - File: `validate.ts` L12-29 — add `config_path` to inputSchema (optional)
   - File: `validate.ts` L42-227 — in content validation branch, if `config_path` + `doc_type`, call `checkDocStaleness()` and append to output

10. **Write tests**
    - Mock `simple-git` to return controlled dates
    - Test: upstream newer than downstream -> warning
    - Test: downstream newer -> no warning
    - Test: git unavailable -> empty array (graceful)

## Todo

- [x] Add `"staleness"` to `ValidationIssue.type` union
- [x] Create `doc-staleness.ts` with `checkChainStaleness()` and `checkDocStaleness()`
- [x] Add `loadChainDocPaths()` helper
- [x] Extend `ChainRefReport` with `staleness_warnings`
- [x] Integrate staleness into `validateChain()` in `cross-ref-linker.ts`
- [x] Update `validate-chain.ts` output to render staleness
- [x] Add `config_path` to `validate_document` tool schema
- [x] Call `checkDocStaleness()` from `validate.ts` handler
- [x] Write unit tests for `doc-staleness.ts`
- [x] Verify all existing tests pass

## Success Criteria

- `validate_chain` output includes "Staleness Warnings" section when drift detected
- `validate_document` with `config_path` reports staleness for individual docs
- Zero regression in existing validation behavior
- Git failures are silently handled (empty warnings)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Git unavailable in CI/test envs | Low | Wrap in try/catch, return empty |
| Performance: many git log calls | Medium | One call per doc (not per pair); cache results |
| `simple-git` dynamic import overhead | Low | Same pattern as existing `staleness-detector.ts` |

## Security Considerations

- Config path validated via existing `validateConfigPath()` in `cross-ref-linker.ts`
- Git operations are read-only (`git log`)
- No user input flows into git arguments directly (path from config only)

## Next Steps

- Phase 2 reuses `checkDocStaleness()` for pre-generate advisory
- Phase 3 reuses version extraction helper
