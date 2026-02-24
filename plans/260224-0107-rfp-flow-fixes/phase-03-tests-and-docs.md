# Phase 3: Tests and Docs Update

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 2](./phase-02-tool-handler-improvements.md)
- Test file: `sekkei/packages/mcp-server/tests/unit/rfp-flow-fixes.test.ts` (new, ~120 LOC)
- Doc file: `sekkei/packages/skills/content/references/rfp-manager.md`

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Add tests for new transitions, fix broken existing test, update rfp-manager.md phase diagram

## Key Insights
- Existing test file is 199 LOC — cannot add tests there
- New test file covers all bug fixes and improvements
- Existing test at line 76 (forward transition RFP_RECEIVED→ANALYZING) will break due to M2 content validation — needs fix
- rfp-manager.md phase diagram doesn't show all backward edges

## Requirements
1. All new transitions have test coverage
2. Content validation blocking has test coverage
3. next_action auto-set has test coverage
4. Existing test suite still passes
5. rfp-manager.md reflects new backward edges

## Implementation Steps

### Step 1: Fix existing test (line 75-83)

In `rfp-workspace-tool.test.ts`, the transition test at line 75 advances RFP_RECEIVED→ANALYZING without writing content to 01_raw_rfp.md. Add a write before the transition:

```typescript
it("transition: advances phase with valid transition", async () => {
  // Write required content before transitioning
  await callTool(server, "manage_rfp_workspace", {
    action: "write", workspace_path: wsPath,
    filename: "01_raw_rfp.md", content: "# RFP\nTest RFP content",
  });
  const result = await callTool(server, "manage_rfp_workspace", {
    action: "transition", workspace_path: wsPath, phase: "ANALYZING",
  });
  // ... rest unchanged
});
```

Also fix backward transition test setup (lines 144-148) — add content writes for each required file before transitions.

### Step 2: Create rfp-flow-fixes.test.ts

New test file with these test groups:

**B1: Back action tests**
- WAITING_CLIENT back to QNA_GENERATION (with force)
- QNA_GENERATION back to ANALYZING (with force)
- ANALYZING back to RFP_RECEIVED (with force)
- DRAFTING back to WAITING_CLIENT (with force)

**B2: QNA_GENERATION → DRAFTING skip**
- Direct transition QNA_GENERATION→DRAFTING succeeds
- Not marked as backward transition

**B3: SCOPE_FREEZE escape**
- SCOPE_FREEZE→PROPOSAL_UPDATE with force succeeds
- SCOPE_FREEZE→PROPOSAL_UPDATE without force fails (backward)

**M1: next_action auto-set**
- After transition, next_action matches PHASE_NEXT_ACTION map
- After back navigation, next_action updates to target phase

**M2: Content validation**
- RFP_RECEIVED→ANALYZING blocked when 01_raw_rfp.md empty
- Backward transitions skip content validation
- After writing content, transition succeeds

### Step 3: Update rfp-manager.md phase diagram

Update the phase diagram (lines 59-70) to show all backward edges:

```
RFP_RECEIVED ⇄ ANALYZING ⇄ QNA_GENERATION ⇄ WAITING_CLIENT
                                  ↓ (skip)       ⇄
                               DRAFTING ──────────┘
                                  ↓
  CLIENT_ANSWERED → PROPOSAL_UPDATE ⇄ SCOPE_FREEZE
       ↕ ↗              ↕
    ANALYZING    QNA_GENERATION
    QNA_GENERATION  CLIENT_ANSWERED

Backward transitions (require force: true):
  ANALYZING → RFP_RECEIVED
  QNA_GENERATION → ANALYZING
  WAITING_CLIENT → QNA_GENERATION
  DRAFTING → WAITING_CLIENT
  CLIENT_ANSWERED → ANALYZING
  CLIENT_ANSWERED → QNA_GENERATION
  PROPOSAL_UPDATE → QNA_GENERATION
  PROPOSAL_UPDATE → CLIENT_ANSWERED
  SCOPE_FREEZE → PROPOSAL_UPDATE
```

## Todo
- [ ] Fix existing forward transition test (add content write)
- [ ] Fix existing backward transition test setup (add content writes)
- [ ] Create rfp-flow-fixes.test.ts with all new test cases
- [ ] Update rfp-manager.md phase diagram
- [ ] Run `npm run lint && npm test`
- [ ] Verify all tests pass

## Success Criteria
- `npm test` passes with 0 failures
- All 5 bug/improvement scenarios have dedicated tests
- rfp-manager.md accurately reflects the new transition graph
- No test file exceeds 200 LOC

## Risk Assessment
- **Medium:** Backward transition test setup (lines 139-149) chains forward transitions without content writes — need to add writes for 01_raw_rfp.md, 02_analysis.md, 04_client_answers.md at minimum
- **Low:** New test file is independent, can't break existing tests

## Next Steps
→ Run full validation: `cd sekkei/packages/mcp-server && npm run lint && npm test`
→ Commit with message: `fix: repair RFP flow state machine — back action, skip QNA, scope freeze escape`
