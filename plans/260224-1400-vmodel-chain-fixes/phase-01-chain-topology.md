---
title: "Phase 1: Chain Topology Fixes"
status: complete
priority: P1
effort: 1h
covers: [P1.3, P2.3, P4.2, P4.4]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 1: Chain Topology Fixes

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-01-chain-topology-ids.md](./research/researcher-01-chain-topology-ids.md)
- Audit: [brainstorm-260224-1400-vmodel-chain-audit.md](../reports/brainstorm-260224-1400-vmodel-chain-audit.md)
- Blocked by: none
- Blocks: Phase 2 (UPSTREAM_ID_TYPES derivation depends on updated CHAIN_PAIRS)

## Overview

- **Date:** 2026-02-24
- **Description:** Add missing V-model chain pairs and update display order for meta-docs. All changes are additive — no existing pairs removed.
- **Priority:** P1 (P1.3 is a bug; others are medium/low gaps)
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

- `CHAIN_PAIRS` is the single DAG source of truth consumed by: `analyzeGraph` (cross-ref-linker), BFS in `cr-propagation.ts`, and staleness checks in `doc-staleness.ts`.
- `nfr → basic-design` is absent despite NFR shaping system architecture. NFR → security-design and NFR → test-plan already exist.
- `screen-design` and `interface-spec` have templates and DOC_TYPES entries but zero chain integration (no staleness, no CR propagation, no validation graph coverage).
- `functions-list → test-plan` missing; test planning uses function inventory for scope estimation.
- `CHAIN_DISPLAY_ORDER` in `chain-status.ts` has a `supplementary` group that omits `test-evidence`, `meeting-minutes`, `decision-record` — those doc types exist in `DOC_TYPES` but `chain_status` tool silently skips them.
- `CHAIN_DISPLAY_ORDER` keys use `snake_case` matching YAML config; `doc_type` output converts via `.replace(/_/g, "-")`.

## Requirements

### Functional
- Add `["nfr", "basic-design"]` to CHAIN_PAIRS (P1.3)
- Add `["basic-design", "screen-design"]`, `["basic-design", "interface-spec"]`, `["requirements", "interface-spec"]` to CHAIN_PAIRS (P2.3)
<!-- Updated: Validation Session 1 - Removed screen-design self-referential pair per user decision -->
- Add `["functions-list", "test-plan"]` to CHAIN_PAIRS (P4.2)
- Add `test_evidence`, `meeting_minutes`, `decision_record` to `supplementary` group in CHAIN_DISPLAY_ORDER (P4.4)

### Non-Functional
- No removal of existing pairs (additive only)
- All downstream consumers (cr-propagation, doc-staleness) benefit automatically since they iterate CHAIN_PAIRS
- Must pass existing `cross-ref-linker.test.ts` and `chain-status-tool.test.ts`

## Architecture

`CHAIN_PAIRS` lives in `cross-ref-linker.ts` lines 13–53. All consumers import it via named export. Adding pairs is sufficient — no interface changes needed.

`CHAIN_DISPLAY_ORDER` in `chain-status.ts` lines 77–82 is a module-private const. Adding keys to the `supplementary` group is the only change needed. The rendering loop at line 108 already handles the `replace(/_/g, "-")` conversion.

## Related Code Files

### Modify
- `packages/mcp-server/src/lib/cross-ref-linker.ts` — add 5 chain pairs to CHAIN_PAIRS array
- `packages/mcp-server/src/tools/chain-status.ts` — add 3 keys to CHAIN_DISPLAY_ORDER supplementary group

### Create
- none

## Implementation Steps

1. **Open `cross-ref-linker.ts`**. Locate the `CHAIN_PAIRS` array (lines 13–53).

2. **Add after the design phase block** (after line 27, `["requirements", "detail-design"]`):
   ```typescript
   ["nfr", "basic-design"],
   ```

3. **Add after the supplementary block** (after line 52, `["functions-list", "sitemap"]`):
   ```typescript
   // screen-design and interface-spec chain integration (no self-ref pair)
   ["basic-design", "screen-design"],
   ["basic-design", "interface-spec"],
   ["requirements", "interface-spec"],
   <!-- Updated: Validation Session 1 - Removed ["screen-design","screen-design"] self-loop -->
   // functions-list feeds test planning scope
   ["functions-list", "test-plan"],
   ```

4. **Open `chain-status.ts`**. Locate `CHAIN_DISPLAY_ORDER` (lines 77–82).

5. **Update the supplementary entry** to include meta-doc keys:
   ```typescript
   { phase: "supplementary", label: "補足", keys: [
     "operation_design", "migration_design", "glossary",
     "test_evidence", "meeting_minutes", "decision_record",
   ]},
   ```

6. **Run type-check** from `packages/mcp-server/`:
   ```bash
   npm run lint
   ```

7. **Run affected tests:**
   ```bash
   node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs tests/unit/cross-ref-linker.test.ts tests/unit/chain-status-tool.test.ts
   ```

## Todo List

- [ ] Add `["nfr", "basic-design"]` to CHAIN_PAIRS
- [ ] Add screen-design chain pair (1 entry — no self-ref)
- [ ] Add interface-spec chain pairs (2 entries)
- [ ] Add `["functions-list", "test-plan"]`
- [ ] Add meta-docs to CHAIN_DISPLAY_ORDER supplementary group
- [ ] Run lint — no errors
- [ ] Run cross-ref-linker and chain-status tests — pass

## Success Criteria

- CHAIN_PAIRS has 4 new entries (total ~57 pairs)
- CHAIN_DISPLAY_ORDER supplementary group shows 6 keys
- `npm run lint` exits 0
- Existing cross-ref and chain-status tests still pass
- `cr-propagation.ts` BFS traversal will automatically include new pairs (no code change needed there)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `screen-design` self-referential pair causes BFS cycle | Low | BFS in cr-propagation uses visited set — cycles safe |
| New pairs trigger unexpected staleness warnings on existing projects | Low | Staleness only triggers if doc files exist on disk |
| test-plan gaining a new upstream (functions-list) changes validator behavior | Medium | Phase 2 will update UPSTREAM_ID_TYPES derivation; check if `F` prefix should be added to test-plan's upstream list |

## Security Considerations

None — additive data changes only, no auth/IO surface.

## Next Steps

- Phase 2 (ID System Unification) must re-derive UPSTREAM_ID_TYPES after this phase completes, as new CHAIN_PAIRS affect which prefixes are considered upstream for each doc type.
- Verify that `analyzeGraph` in cross-ref-linker handles the new pairs correctly in integration run.
