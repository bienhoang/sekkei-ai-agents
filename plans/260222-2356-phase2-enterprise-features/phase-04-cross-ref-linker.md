---
title: "Phase 04: Cross-Reference Linker + Integrity (B4 + ROADMAP 2.2)"
status: complete
priority: P2
effort: 1.5d
---

# Phase 04: Cross-Reference Linker + Integrity (B4 + ROADMAP 2.2)
<!-- Updated: Validation Session 1 - Merged Phase 07 (Cross-Ref Integrity) into Phase 04 -->

## Context Links
- Work context: `sekkei/packages/mcp-server/`
- Depends on: Phase 06 (completeness checker — shares validation logic)
- ID extraction: `src/lib/id-extractor.ts` — `extractIds`, `extractIdsByType`, `extractAllIds`
- Validator: `src/lib/validator.ts` — `UPSTREAM_ID_TYPES` mapping, `validateCrossRefs()`
- Tool registry: `src/tools/index.ts` — new `validate_chain` tool registers here
- Config types: `src/types/documents.ts` → `ProjectConfig`, `ChainEntry`, `SplitChainEntry`

## Overview
- **Priority:** P2
- **Status:** pending; depends on Phase 06 (completeness checker)
- **Goal:** New `validate_chain` MCP tool that validates cross-references across the entire document chain, builds an ID graph, detects gaps, and generates traceability matrix data

## Key Insights
- Chain structure in `sekkei.config.yaml` maps doc-type → output paths — read these to find all docs
- ID flow: `F-xxx` (functions-list) → `REQ-xxx` (requirements) → `SCR/TBL/API-xxx` (basic-design) → test IDs
- Existing `validateCrossRefs()` is pairwise (current vs upstream) — chain linker builds full graph
- `extractAllIds()` already handles custom prefixes — reuse for chain graph nodes
- SplitChainEntry has `system_output` / `features_output` paths — must glob those directories

## Requirements
- **Functional:**
  - New MCP tool: `validate_chain` — reads all docs from sekkei.config.yaml chain paths
  - Build ID graph: each doc → { defined IDs, referenced IDs }
  - Detect: defined in doc A but never referenced downstream (orphaned)
  - Detect: referenced in doc B but never defined in any upstream doc (missing)
  - Report: traceability gaps per chain link
  - Suggest fixes: "F-003 defined in functions-list but not in requirements"
- **Non-functional:** reads docs from disk; config_path param required

## Architecture

```
tools/validate-chain.ts         ← new MCP tool registration
lib/cross-ref-linker.ts         ← core graph logic + traceability matrix

cross-ref-linker.ts:
  loadChainDocs(configPath)     → Map<DocType, string[]>   (content per doc)
  buildIdGraph(docs)            → IdGraph
  analyzeGraph(graph)           → ChainRefReport
  buildTraceabilityMatrix(docs) → TraceabilityEntry[]

IdGraph = Map<DocType, { defined: Set<string>, referenced: Set<string> }>
ChainRefReport = {
  links: ChainLinkReport[],           // per adjacent pair
  orphaned_ids: OrphanedId[],         // defined but unused downstream
  missing_ids: MissingId[],           // referenced but undefined upstream
  traceability_gaps: GapEntry[],
  traceability_matrix: TraceabilityEntry[],  // full chain trace data
}
TraceabilityEntry = { id: string, doc_type: DocType, downstream_refs: string[] }
```

Chain link pairs (ordered):
```
functions-list → requirements
requirements   → basic-design
basic-design   → detail-design
detail-design  → test-spec
```

## Related Code Files

**Create:**
- `src/lib/cross-ref-linker.ts` — graph builder and analyzer (~170 lines)
- `src/tools/validate-chain.ts` — MCP tool registration (~50 lines)

**Modify:**
- `src/tools/index.ts` — register `validate_chain` tool
- `src/types/documents.ts` — add `ChainRefReport`, `ChainLinkReport`, `OrphanedId`, `MissingId`, `TraceabilityEntry`, `FullChainReport` types

## Implementation Steps

1. Add types to `documents.ts`: `ChainRefReport`, `ChainLinkReport`, `OrphanedId`, `MissingId`, `TraceabilityEntry`, `FullChainReport`
2. Create `src/lib/cross-ref-linker.ts`:
   - `loadChainDocs(configPath)` — parse config yaml, read output files, return content map
   - Handle SplitChainEntry by globbing `system_output` and `features_output` dirs
   - `buildIdGraph(docs)` — for each doc, call `extractAllIds()` for defined IDs; scan for referenced IDs using `ID_PATTERN`
   - `analyzeGraph(graph)` — per chain link pair, compute orphaned + missing
   - `buildTraceabilityMatrix(docs)` — for each F-xxx: find REQ-xxx referencing it, find SCR/TBL/API-xxx, find test IDs; return TraceabilityEntry[]
   - `generateSuggestions(report)` — human-readable fix messages
3. Create `src/tools/validate-chain.ts` — Zod input: `{ config_path: string }`, call linker, return markdown report with traceability matrix
4. Register in `src/tools/index.ts`
5. Write unit tests: `tests/unit/cross-ref-linker.test.ts` with fixture markdown files
   - Test gap detection: F-003 in functions-list but not in requirements
   - Test traceability matrix: F-001 traces through REQ-002 → SCR-003
   - Test clean chain: no gaps, matrix populated
   - Test partial chain: missing doc types handled gracefully

## Todo List

- [x] Add new types to `documents.ts` (including TraceabilityEntry, FullChainReport)
- [x] Create `src/lib/cross-ref-linker.ts`
- [x] Implement `loadChainDocs`
- [x] Implement `buildIdGraph`
- [x] Implement `analyzeGraph`
- [x] Implement `buildTraceabilityMatrix`
- [x] Implement `generateSuggestions`
- [x] Create `src/tools/validate-chain.ts`
- [x] Register in `tools/index.ts`
- [x] Write unit tests with fixtures (gap detection, matrix, clean chain, partial chain)
- [x] `npm run lint` — no errors
- [x] `npm test` — all pass (209/209)

## Success Criteria
- `validate_chain { config_path }` reads all chain docs and returns full gap report + traceability matrix
- Correctly identifies F-003 defined but missing in requirements
- Correctly identifies REQ-005 in requirements but no downstream reference
- Traceability matrix: F-001 → REQ-002 → SCR-003 chain visible in output
- Missing config path → `SekkeiError("VALIDATION_FAILED")`
- Partial chain (missing docs) → skip gracefully, report as "not provided"
- Unit tests cover: orphaned detection, missing detection, matrix generation, clean chain, partial chain

## Risk Assessment
- **Partial chain (some docs not yet generated)** — mitigate: skip missing files gracefully, report as "not yet generated"
- **SplitChainEntry glob complexity** — mitigate: use `node:fs/promises` `readdir` with recursive flag (Node 20+)
- **Custom ID prefixes creating false positives** — mitigate: configurable ID prefix filter in input schema

## Security Considerations
- `config_path` validated: no `..`, resolved against CWD, must end in `.yaml`/`.yml`
- File reads use `readFile` not `execFile` — no shell injection
- Doc content size limited to 500KB per file read

## Next Steps
- Phase 01 CLI: `sekkei validate --chain` wraps this tool
- Output feeds traceability matrix generation (`crud-matrix`, `traceability-matrix` doc types)
