# Phase 2: Propagation Engine

## Context Links

- Pattern: `src/lib/cross-ref-linker.ts` — CHAIN_PAIRS, loadChainDocs, buildTraceabilityMatrix, ID_ORIGIN
- Pattern: `src/lib/impact-analyzer.ts` — findAffectedSections, buildImpactReport
- Phase 1: `src/types/change-request.ts` — PropagationStep, PropagationDirection

## Overview

- **Priority:** P1 (core logic for change propagation)
- **Status:** pending
- **Description:** Three modules: propagation order computation, upstream backfill suggestions, parallel CR conflict detection

## Key Insights

- CHAIN_PAIRS in cross-ref-linker.ts defines 14 upstream->downstream pairs; reuse directly
- Upstream propagation = walk CHAIN_PAIRS backwards (find pairs where origin is downstream)
- Downstream propagation = walk CHAIN_PAIRS forwards (find pairs where origin is upstream)
- Upstream = "suggest additions" (safe); Downstream = "cascade regeneration" (semi-auto)
- Conflict detection: scan active CRs for overlapping changed_ids or overlapping doc_types in propagation_steps

## Requirements

### Functional

1. **cr-propagation.ts**: Given origin doc type, compute ordered PropagationStep[] (upstream first, then downstream)
2. **cr-backfill.ts**: Given modified doc content + origin doc type, detect new/changed IDs and suggest upstream additions
3. **cr-conflict-detector.ts**: Given a CR about to be approved, scan active CRs for doc overlap

### Non-Functional
- Each module < 200 LOC
- Import CHAIN_PAIRS/ID_ORIGIN from cross-ref-linker (re-export if needed)
- Pure functions where possible (testability)

## Architecture

```
src/lib/cr-propagation.ts       — computePropagationOrder() (~100 LOC)
src/lib/cr-backfill.ts          — generateBackfillSuggestions() (~120 LOC)
src/lib/cr-conflict-detector.ts — detectConflicts() (~80 LOC)
```

### Data Flow

```
CR (origin_doc + changed_ids)
  -> cr-propagation.ts
     -> PropagationStep[] (upstream suggestions + downstream cascade)

CR (modified doc content)
  -> cr-backfill.ts
     -> BackfillSuggestion[] (upstream IDs to add)

CR (about to approve)
  -> cr-conflict-detector.ts
     -> ConflictResult[] (overlapping CRs)
```

## Related Code Files

### Files to Create
- `sekkei/packages/mcp-server/src/lib/cr-propagation.ts`
- `sekkei/packages/mcp-server/src/lib/cr-backfill.ts`
- `sekkei/packages/mcp-server/src/lib/cr-conflict-detector.ts`

### Files to Read (dependencies)
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — CHAIN_PAIRS, ID_ORIGIN, buildTraceabilityMatrix, loadChainDocs
- `sekkei/packages/mcp-server/src/lib/impact-analyzer.ts` — findAffectedSections
- `sekkei/packages/mcp-server/src/types/change-request.ts` — PropagationStep, ChangeRequest

### Exports to Add

CHAIN_PAIRS and ID_ORIGIN are module-level `const` in cross-ref-linker.ts but NOT currently exported. Two options:
1. **Preferred**: Export them from cross-ref-linker.ts (add `export` keyword — 2-char edit each)
2. **Alternative**: Duplicate the data (violates DRY)

**Decision: Export CHAIN_PAIRS and ID_ORIGIN from cross-ref-linker.ts.**

## Implementation Steps

### Step 0: Export CHAIN_PAIRS and ID_ORIGIN (cross-ref-linker.ts)

Add `export` keyword to both:
```typescript
export const CHAIN_PAIRS: [string, string][] = [ ... ];
export const ID_ORIGIN: Record<string, string> = { ... };
```

### Step 1: cr-propagation.ts

```typescript
import { CHAIN_PAIRS } from "./cross-ref-linker.js";
import type { PropagationStep } from "../types/change-request.js";

/**
 * Compute propagation order given origin doc type.
 * Returns upstream steps first (reverse direction), then downstream (forward).
 * Deduplicates and topologically sorts within each direction.
 */
export function computePropagationOrder(originDoc: string): PropagationStep[]
```

Algorithm:
1. **Upstream**: BFS backwards through CHAIN_PAIRS
   - Find all pairs `[X, originDoc]` — X is upstream neighbor
   - Recursively find pairs `[Y, X]` — Y is further upstream
   - Return in reverse order (furthest upstream first)
2. **Downstream**: BFS forwards through CHAIN_PAIRS
   - Find all pairs `[originDoc, X]` — X is downstream neighbor
   - Recursively find pairs `[X, Y]` — Y is further downstream
   - Return in forward order (nearest downstream first)
3. Merge: upstream steps (direction="upstream") + downstream steps (direction="downstream")
4. All steps start with status="pending"

Example for `originDoc = "basic-design"`:
- Upstream: `["requirements"]` (basic-design's parent)
- Downstream: `["security-design", "detail-design", "it-spec", "st-spec", "ut-spec", "migration-design"]`

### Step 2: cr-backfill.ts

```typescript
import { ID_ORIGIN } from "./cross-ref-linker.js";
import type { DocType } from "../types/documents.js";

export interface BackfillSuggestion {
  id: string;           // the new/changed ID (e.g., "F-012")
  target_doc: string;   // upstream doc that should define it (e.g., "functions-list")
  action: "add" | "update";
  reason: string;       // human-readable explanation
}

/**
 * Compare old and new content for a doc, find IDs that reference
 * upstream docs but don't exist upstream yet.
 */
export function generateBackfillSuggestions(
  originDoc: string,
  oldContent: string,
  newContent: string,
  upstreamDocs: Map<string, string>,
): BackfillSuggestion[]
```

Algorithm:
1. Extract all standard IDs from newContent (using ID_PATTERN regex)
2. Extract all standard IDs from oldContent
3. Compute new IDs = in new but not in old
4. For each new ID:
   - Look up prefix in ID_ORIGIN to find which doc type defines it
   - If that doc type is upstream and the ID doesn't exist in upstream content → suggest "add"
   - If ID exists in upstream but content changed → suggest "update" (only if we detect meaningful diff)
5. Return BackfillSuggestion[]

### Step 3: cr-conflict-detector.ts

```typescript
import type { ChangeRequest } from "../types/change-request.js";

export interface ConflictResult {
  cr_id: string;            // conflicting CR
  overlap_type: "changed_ids" | "propagation_docs";
  overlapping: string[];    // the IDs or doc types that overlap
}

/**
 * Check if a CR conflicts with any active CRs.
 * Active = APPROVED or PROPAGATING status.
 */
export function detectConflicts(
  candidate: ChangeRequest,
  activeCRs: ChangeRequest[],
): ConflictResult[]
```

Algorithm:
1. Filter activeCRs to APPROVED or PROPAGATING status
2. For each active CR:
   a. Check changed_ids overlap: intersection of candidate.changed_ids and active.changed_ids
   b. Check propagation_docs overlap: intersection of doc_types in both propagation_steps
   c. If any overlap found, add to results
3. Return ConflictResult[]

## Todo List

- [ ] Export CHAIN_PAIRS and ID_ORIGIN from cross-ref-linker.ts
- [ ] Implement computePropagationOrder with BFS upstream + downstream
- [ ] Implement generateBackfillSuggestions with ID diff detection
- [ ] Implement detectConflicts for parallel CR overlap check
- [ ] Verify propagation order against full CHAIN_PAIRS graph

## Success Criteria

- `computePropagationOrder("basic-design")` returns correct upstream (requirements) + downstream (security-design, detail-design, it-spec, st-spec, migration-design) steps
- `computePropagationOrder("requirements")` returns no upstream, full downstream chain
- Backfill detects new IDs referencing upstream prefixes
- Conflict detector finds overlapping CRs by changed_ids and propagation docs

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CHAIN_PAIRS graph has cycles | None | V-model is a DAG by definition |
| BFS misses transitive deps | Medium | Unit test with full chain |
| ID_ORIGIN missing a prefix | Low | Prefix list is comprehensive (24 prefixes) |

## Security Considerations

- No file writes in this phase (pure computation modules)
- No user-supplied paths processed

## Next Steps

Phase 3 wires these modules into the MCP tool handler.
