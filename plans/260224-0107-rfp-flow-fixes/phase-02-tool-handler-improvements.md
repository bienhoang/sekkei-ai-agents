# Phase 2: Tool Handler Improvements (M1, M2)

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-state-machine-fixes.md)
- File: `sekkei/packages/mcp-server/src/tools/rfp-workspace.ts` (194 LOC → stay under 200)

## Overview
- **Priority:** P2 (Medium)
- **Status:** pending
- **Description:** Auto-set next_action on transitions, add content validation before forward transitions

## Key Insights
- rfp-workspace.ts is at 194 LOC — only 6 lines headroom
- Content validation logic should live in rfp-state-machine.ts (state layer), tool just calls it
- next_action auto-set replaces the `...current` spread pattern for that field

## Requirements
1. Transition handler auto-sets `next_action` from PHASE_NEXT_ACTION map
2. Forward transitions validate required source files have content
3. Backward transitions skip content validation (intentionally permissive)
4. Clear error messages when content validation fails

## Implementation Steps

### Step 1: Add content validation helper to rfp-state-machine.ts

Add new exported function (~10 lines):

```typescript
/** Required non-empty files before entering a phase (forward only) */
const PHASE_REQUIRED_CONTENT: ReadonlyMap<RfpPhase, readonly string[]> = new Map([
  ["ANALYZING", ["01_raw_rfp.md"]],
  ["QNA_GENERATION", ["02_analysis.md"]],
  ["CLIENT_ANSWERED", ["04_client_answers.md"]],
  ["PROPOSAL_UPDATE", ["02_analysis.md"]],
  ["SCOPE_FREEZE", ["05_proposal.md"]],
]);

export async function validatePhaseContent(
  workspacePath: string, targetPhase: RfpPhase
): Promise<string | null> {
  const required = PHASE_REQUIRED_CONTENT.get(targetPhase);
  if (!required) return null;
  for (const file of required) {
    const inv = await getFileInventory(workspacePath);
    if (!inv.files[file]?.exists || inv.files[file]?.size === 0) {
      return `Cannot enter ${targetPhase}: ${file} is empty. Write content first.`;
    }
  }
  return null;
}
```

### Step 2: Update transition handler in rfp-workspace.ts

In the `case "transition"` block (lines 69-100):

```typescript
// After validateTransition check, before backward check:
// Content validation for forward transitions only
if (!isBackwardTransition(current.phase, args.phase)) {
  const contentErr = await validatePhaseContent(args.workspace_path, args.phase);
  if (contentErr) return err(contentErr);
}

// Replace next_action in writeStatus:
await writeStatus(args.workspace_path, {
  ...current,
  phase: args.phase,
  last_update: now,
  next_action: PHASE_NEXT_ACTION.get(args.phase) ?? current.next_action,
  qna_round: qnaRound,
  phase_history: [...current.phase_history, historyEntry],
});
```

### Step 3: Update `back` action handler

Same pattern — auto-set next_action:

```typescript
await writeStatus(args.workspace_path, {
  ...cur,
  phase: prev,
  last_update: now,
  next_action: PHASE_NEXT_ACTION.get(prev) ?? cur.next_action,
  qna_round: qnaRound,
  phase_history: [...cur.phase_history, historyEntry],
});
```

### Step 4: Update imports in rfp-workspace.ts

Add `PHASE_NEXT_ACTION, validatePhaseContent` to imports from rfp-state-machine.

## LOC Impact
- rfp-state-machine.ts: +15 lines (map + validation function)
- rfp-workspace.ts: +4 lines (content validation call + import change), net ~198 LOC

## Todo
- [ ] Add PHASE_REQUIRED_CONTENT map to state machine
- [ ] Add validatePhaseContent function to state machine
- [ ] Update transition handler with content validation + next_action auto-set
- [ ] Update back handler with next_action auto-set
- [ ] Update imports
- [ ] Run `npm run lint`

## Success Criteria
- Transitioning RFP_RECEIVED→ANALYZING with empty 01_raw_rfp.md returns error
- Transitioning with force backward skips content check
- After transition, `next_action` matches target phase's default text
- rfp-workspace.ts stays under 200 LOC

## Risk Assessment
- **Low:** Content validation could break existing tests that transition without writing content first
  - Mitigation: Check existing tests — they DO write content for some files but not all. May need to update existing test setup to write required content, OR skip validation in tests.
  - Actually: existing backward transition tests transition freely without content. But backward transitions skip validation, so those are fine. The forward transition test (RFP_RECEIVED→ANALYZING at line 76) does NOT write 01_raw_rfp.md first. **This test will break.** Fix: write content to 01_raw_rfp.md before that transition in the existing test.

## Next Steps
→ Phase 3: Add new tests, update docs
