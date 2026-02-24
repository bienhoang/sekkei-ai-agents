---
title: "Phase 07: Cross-Reference Integrity (ROADMAP 2.2) — MERGED INTO PHASE 04"
status: merged
priority: P2
effort: 0d
---

# Phase 07: Cross-Reference Integrity (ROADMAP 2.2)

> **MERGED:** This phase has been merged into [Phase 04](./phase-04-cross-ref-linker.md) per Validation Session 1 decision. All traceability matrix and full-chain validation scope is now in Phase 04.

## Context Links
- Work context: `sekkei/packages/mcp-server/`
- Parallel with: Phase 06 (Completeness Checker) — implement together
- Core file: `src/lib/validator.ts` — extend `validateCrossRefs()`; shares logic with Phase 04
- ID extractor: `src/lib/id-extractor.ts` — `extractIds`, `extractIdsByType`, `ID_TYPES`
- Types: `src/types/documents.ts` — `DocType`, `CrossRefReport`
- Validate tool: `src/tools/validate.ts` — add `chain_content` map param

## Overview
- **Priority:** P2
- **Status:** pending; implement in parallel with Phase 06
- **Goal:** Full V-model chain cross-reference check — detect upstream IDs that never appear downstream, generate traceability matrix data

## Key Insights
- Current `validateCrossRefs()` is pairwise (current doc vs one upstream doc)
- Phase 07 extends this to full chain: pass ordered map of all chain doc contents
- Traceability matrix: `F-xxx → REQ-xxx → SCR/TBL/API-xxx → UT/IT/ST-xxx` — all linkages in one pass
- Gap detection: F-001 in functions-list never appears in requirements = coverage gap; REQ-005 in requirements never appears in basic-design = design gap
- Shares `ChainRefReport` type with Phase 04 (cross-ref-linker) — define type once in `documents.ts`
- `generate_traceability_matrix` is a future tool; Phase 07 provides the data structure for it

## Requirements
- **Functional:**
  - `validate_document` accepts `chain_docs?: Record<DocType, string>` for full-chain validation
  - Build V-model trace graph: F → REQ → SCR/TBL/API → UT/IT/ST
  - Detect and report: coverage gaps per chain link
  - Generate traceability matrix data (structured, not rendered — raw `TraceabilityEntry[]`)
  - New `CrossRefReport` extended: add `traceability_matrix: TraceabilityEntry[]`
- **Non-functional:** all existing `upstream_content` pairwise checks unchanged; new chain mode opt-in

## Architecture

```
validator.ts (extend)
  ├─ CrossRefReport += traceability_matrix: TraceabilityEntry[]
  ├─ TraceabilityEntry = { id: string, doc_type: DocType, downstream_refs: string[] }
  ├─ validateFullChain(chainDocs: Map<DocType, string>): FullChainReport
  └─ buildTraceabilityMatrix(chainDocs): TraceabilityEntry[]

FullChainReport = {
  links: ChainLinkReport[],
  gaps: GapEntry[],
  traceability_matrix: TraceabilityEntry[],
}

Chain link pairs (same as Phase 04):
  functions-list → requirements → basic-design → detail-design → test-spec
```

ID flow tracking:
```
functions-list:  defines F-xxx
requirements:    defines REQ-xxx, references F-xxx   → gap if F-xxx not referenced
basic-design:    defines SCR/TBL/API-xxx, references REQ-xxx → gap if REQ-xxx not referenced
detail-design:   defines CLS/DD-xxx, references SCR/TBL/API-xxx
test-spec:       defines UT/IT/ST-xxx, references REQ-xxx and F-xxx
```

## Related Code Files

**Modify:**
- `src/lib/validator.ts` — add `TraceabilityEntry`, `FullChainReport` types; add `validateFullChain()`; add `buildTraceabilityMatrix()`; extend `CrossRefReport`
- `src/tools/validate.ts` — add `chain_docs?: z.record(z.enum(DOC_TYPES), z.string().max(500_000)).optional()` to inputSchema; call `validateFullChain` when provided
- `src/types/documents.ts` — add `TraceabilityEntry`, `FullChainReport` exported types (shared with Phase 04)

## Implementation Steps

1. Add `TraceabilityEntry` and `FullChainReport` to `documents.ts` (Phase 04 will import these)
2. Extend `CrossRefReport` in `validator.ts`: add optional `traceability_matrix?: TraceabilityEntry[]`
3. Implement `buildTraceabilityMatrix(chainDocs)`:
   - For each F-xxx ID: find matching REQ-xxx referencing it; find SCR/TBL/API-xxx in basic-design; find test IDs
   - Return array of `TraceabilityEntry` with full downstream chain
4. Implement `validateFullChain(chainDocs)`:
   - Call pairwise `validateCrossRefs()` for each adjacent pair
   - Detect IDs defined but never referenced downstream across full chain
   - Call `buildTraceabilityMatrix()` for matrix data
   - Return `FullChainReport`
5. Update `validate.ts` inputSchema: add `chain_docs` optional field
6. In handler: if `chain_docs` provided, call `validateFullChain()` and include matrix in response
7. Write unit tests: `tests/unit/cross-ref-integrity.test.ts`
   - Test gap detection: F-003 in functions-list but not in requirements
   - Test matrix: F-001 traces through REQ-002 → SCR-003
   - Test clean chain: no gaps

## Todo List

- [ ] Add `TraceabilityEntry`, `FullChainReport` to `documents.ts`
- [ ] Extend `CrossRefReport` with `traceability_matrix`
- [ ] Implement `buildTraceabilityMatrix()` in `validator.ts`
- [ ] Implement `validateFullChain()` in `validator.ts`
- [ ] Update `validate.ts` inputSchema (`chain_docs`)
- [ ] Wire handler to call `validateFullChain` when `chain_docs` present
- [ ] Write unit tests
- [ ] `npm run lint` — no errors
- [ ] `npm test` — 142+ pass

## Success Criteria
- `validate_document { chain_docs: { "functions-list": "...", "requirements": "..." } }` returns full chain report
- Gap: F-003 defined but not in requirements → reported in `gaps[]`
- Clean chain: no gaps → `gaps: []`, `traceability_matrix` populated with all IDs
- Existing pairwise tests unchanged (backward compat)

## Risk Assessment
- **Large chain doc content** — mitigate: each doc already limited to 500KB via Zod; chain_docs map of 5 × 500KB = 2.5MB well within memory
- **Shared type conflicts with Phase 04** — mitigate: define shared types in `documents.ts` first; both phases import from there
- **Partial chain (missing doc types in chain_docs)** — mitigate: undefined entries = skip that link; report as "not provided"

## Security Considerations
- `chain_docs` content: each value size-limited by `z.string().max(500_000)`
- Record keys constrained to `z.enum(DOC_TYPES)` — no arbitrary property injection
- Pure in-memory string analysis — no file I/O in this path

## Next Steps
- Phase 04 (Cross-Ref Linker) imports `TraceabilityEntry` from `documents.ts` for consistency
- Phase 01 CLI `sekkei validate --chain` combines Phase 04 (disk read) + Phase 07 (analysis)
- Future: `generate_traceability_matrix` tool renders `TraceabilityEntry[]` to `traceability-matrix` doc type
