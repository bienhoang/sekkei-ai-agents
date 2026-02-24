# Phase 1: State Machine Fixes (B1, B2, B3, M1)

## Context
- Parent: [plan.md](./plan.md)
- File: `sekkei/packages/mcp-server/src/lib/rfp-state-machine.ts`

## Overview
- **Priority:** P1 (Critical)
- **Status:** pending
- **Description:** Fix ALLOWED_TRANSITIONS, BACKWARD_TRANSITIONS, add PHASE_NEXT_ACTION map

## Key Insights
- ALLOWED_TRANSITIONS only has forward edges → `back` action fails for natural reverse paths
- QNA_GENERATION→DRAFTING skip path documented but missing from transition graph
- SCOPE_FREEZE is terminal (empty array) but docs promise BACK for LOW confidence
- `next_action` is preserved from previous state on transition (never auto-updated)

## Requirements
1. All documented BACK navigation paths must work with `force: true`
2. SKIP_QNA / BUILD_NOW from QNA_GENERATION must reach DRAFTING directly
3. SCOPE_FREEZE must allow backward to PROPOSAL_UPDATE
4. `next_action` auto-updates on every phase transition
5. No existing forward transitions broken

## Implementation Steps

### Step 1: Update ALLOWED_TRANSITIONS (B1, B2, B3)

```typescript
// BEFORE:
["RFP_RECEIVED", ["ANALYZING"]],
["ANALYZING", ["QNA_GENERATION"]],
["QNA_GENERATION", ["WAITING_CLIENT"]],
["WAITING_CLIENT", ["DRAFTING", "CLIENT_ANSWERED"]],
["DRAFTING", ["PROPOSAL_UPDATE"]],
["CLIENT_ANSWERED", ["PROPOSAL_UPDATE", "ANALYZING", "QNA_GENERATION"]],
["PROPOSAL_UPDATE", ["SCOPE_FREEZE", "QNA_GENERATION"]],
["SCOPE_FREEZE", []],

// AFTER:
["RFP_RECEIVED", ["ANALYZING"]],
["ANALYZING", ["QNA_GENERATION", "RFP_RECEIVED"]],
["QNA_GENERATION", ["WAITING_CLIENT", "DRAFTING", "ANALYZING"]],
["WAITING_CLIENT", ["DRAFTING", "CLIENT_ANSWERED", "QNA_GENERATION"]],
["DRAFTING", ["PROPOSAL_UPDATE", "WAITING_CLIENT"]],
["CLIENT_ANSWERED", ["PROPOSAL_UPDATE", "ANALYZING", "QNA_GENERATION"]],
["PROPOSAL_UPDATE", ["SCOPE_FREEZE", "QNA_GENERATION", "CLIENT_ANSWERED"]],
["SCOPE_FREEZE", ["PROPOSAL_UPDATE"]],
```

### Step 2: Update BACKWARD_TRANSITIONS (B1, B3)

```typescript
// BEFORE:
"CLIENT_ANSWERED->ANALYZING",
"CLIENT_ANSWERED->QNA_GENERATION",
"PROPOSAL_UPDATE->QNA_GENERATION",

// AFTER (add 6 new entries):
"ANALYZING->RFP_RECEIVED",
"QNA_GENERATION->ANALYZING",
"WAITING_CLIENT->QNA_GENERATION",
"DRAFTING->WAITING_CLIENT",
"CLIENT_ANSWERED->ANALYZING",
"CLIENT_ANSWERED->QNA_GENERATION",
"PROPOSAL_UPDATE->QNA_GENERATION",
"PROPOSAL_UPDATE->CLIENT_ANSWERED",
"SCOPE_FREEZE->PROPOSAL_UPDATE",
```

### Step 3: Add PHASE_NEXT_ACTION map (M1)

Add after FLOW_FILE_MAP (~line 57):

```typescript
export const PHASE_NEXT_ACTION: ReadonlyMap<RfpPhase, string> = new Map([
  ["RFP_RECEIVED", "Paste RFP content into 01_raw_rfp.md"],
  ["ANALYZING", "Run deep analysis on RFP"],
  ["QNA_GENERATION", "Review questions, send to client or BUILD_NOW"],
  ["WAITING_CLIENT", "Paste client answers or BUILD_NOW"],
  ["DRAFTING", "Draft proposal with assumptions"],
  ["CLIENT_ANSWERED", "Analyze client answers impact"],
  ["PROPOSAL_UPDATE", "Generate/update proposal"],
  ["SCOPE_FREEZE", "Review scope freeze checklist"],
]);
```

### Step 4: Export PHASE_NEXT_ACTION

Add to exports so rfp-workspace.ts can import it.

## Todo
- [ ] Update ALLOWED_TRANSITIONS with backward edges
- [ ] Update BACKWARD_TRANSITIONS set
- [ ] Add PHASE_NEXT_ACTION map
- [ ] Export new map

## Success Criteria
- `validateTransition("WAITING_CLIENT", "QNA_GENERATION")` returns true
- `validateTransition("QNA_GENERATION", "DRAFTING")` returns true
- `validateTransition("SCOPE_FREEZE", "PROPOSAL_UPDATE")` returns true
- `isBackwardTransition("SCOPE_FREEZE", "PROPOSAL_UPDATE")` returns true
- All new backward edges are in BACKWARD_TRANSITIONS
- All existing forward transitions still work
- `npm run lint` passes

## Risk Assessment
- **Low:** Adding edges to transition graph is additive, won't break existing forward paths
- **Medium:** Ensure PHASE_NEXT_ACTION strings match what SKILL.md expects (cosmetic)

## Next Steps
→ Phase 2: Use PHASE_NEXT_ACTION in transition handler, add content validation
