# Code Review: RFP Flow State Machine Fixes

**Files:** `src/lib/rfp-state-machine.ts`, `src/tools/rfp-workspace.ts`,
`tests/unit/rfp-flow-fixes.test.ts`, `tests/unit/rfp-workspace-tool.test.ts`
**Tests:** 56 passed, 0 failed

---

## Overall Assessment

Solid fix. The five bugs (B1–B3, M1–M2) are all correctly addressed. Transition graph is
self-consistent. Logic is clean and the new `advanceTo` helper in tests eliminates significant
boilerplate. One medium issue worth fixing, a few low-priority notes.

---

## Critical

None.

---

## High Priority

None.

---

## Medium Priority

### M1 — `back` action skips content validation but also skips `validateTransition` check order

In `rfp-workspace.ts` line 116–121, `back` calls `validateTransition(cur.phase, prev)` then checks
`isBackwardTransition`. This is correct, but there's a subtle ordering issue: `getPreviousPhase`
returns the second-to-last entry in `phase_history`, which is not necessarily the
topological predecessor — it's the last visited phase. After multiple back/forward cycles, `prev`
could be a forward phase relative to `cur.phase`, and the `backward: true` in the response (line
135) would be wrong.

Example:
```
RFP_RECEIVED → ANALYZING → QNA_GENERATION → ANALYZING (back) → QNA_GENERATION
```
At this point `phase_history[-2] = ANALYZING`, and going `back` would try
`QNA_GENERATION → ANALYZING` which is correctly backward. Fine here.

But:
```
ANALYZING → QNA_GENERATION → ANALYZING (back) → QNA_GENERATION (forward again)
```
Now `phase_history[-2] = ANALYZING`, `back` sends to `ANALYZING` — correct.
Then next `back` sends `phase_history[-2] = QNA_GENERATION`, so `ANALYZING → QNA_GENERATION`.
`isBackwardTransition("ANALYZING","QNA_GENERATION")` is false, so it returns `backward: false`.
But `validateTransition` allows it (it's in ALLOWED_TRANSITIONS), so the transition succeeds
silently without `force` check — correct behavior, but the response payload says `backward: false`
when the intent was to go back. Low impact since it's metadata only.

The real risk: if history grows long, `getPreviousPhase` doesn't use topological order, only
recency. This is acceptable for a presales flow that isn't deeply cyclic, but worth a comment.

**Recommendation:** Add an inline comment above `getPreviousPhase` call in `back` action:
```typescript
// prev = last visited phase (not topological predecessor) — cycles may revisit forward phases
```

---

## Low Priority

### L1 — `DRAFTING → PROPOSAL_UPDATE` has no content guard

`PHASE_REQUIRED_CONTENT` does not include `DRAFTING` or `PROPOSAL_UPDATE` → `SCOPE_FREEZE` checks
`05_proposal.md` (correct), but `DRAFTING` entry has no guard. `DRAFTING` originates from either
`WAITING_CLIENT` or the QNA skip path. In the skip path (QNA → DRAFTING) there's no `03_questions.md`
written, but `draft` flow in `FLOW_FILE_MAP` reads `03_questions.md`. Not a bug in the state
machine (the flow is separate from the phase gate), but could mislead the user since the
phase transition succeeds with no questions file.

**Recommendation:** Either add `DRAFTING` to `PHASE_REQUIRED_CONTENT` with `["02_analysis.md"]`
(the minimum needed for drafting), or document the skip-path intentionally bypasses question review.

### L2 — `advanceTo` helper steps past `targetPhase`

In `rfp-flow-fixes.test.ts` lines 36–40, the loop returns `ws` when `step.phase === targetPhase`,
but if `targetPhase` is not in the steps list (e.g., a typo), the function silently falls through
and returns after the last step (SCOPE_FREEZE). No assertion or error is thrown. Consider:

```typescript
throw new Error(`advanceTo: targetPhase "${targetPhase}" not reachable from steps`);
```
after the loop.

### L3 — `PHASE_NEXT_ACTION` is exported but `PHASE_REQUIRED_CONTENT` is not

The asymmetry is intentional (`PHASE_REQUIRED_CONTENT` is private to the module), but
`validatePhaseContent` is exported. This is fine. Just confirming the design is deliberate.

### L4 — Pre-existing lint errors in `cr-backfill.ts` (out of scope)

Two TS2345/TS2322 errors in `src/lib/cr-backfill.ts` cause `npm run lint` to fail. These predate
this PR. They should be fixed separately to keep the lint gate meaningful.

---

## Positive Observations

- Transition graph is now a true directed graph — backward edges in `ALLOWED_TRANSITIONS` AND
  `BACKWARD_TRANSITIONS` set is the right two-layer design (one for reachability, one for intent guard).
- `force: true` requirement for backward transitions is correctly enforced in both `transition` and
  `back` actions.
- `QNA_GENERATION → DRAFTING` correctly classified as forward (not in `BACKWARD_TRANSITIONS`), so
  skip path requires no force. This is correct UX.
- `SCOPE_FREEZE` is no longer terminal — the single `→ PROPOSAL_UPDATE` escape with `force` is
  appropriately minimal.
- `validatePhaseContent` uses `getFileInventory` (already exists) rather than direct `stat` calls —
  good DRY reuse.
- `next_action` auto-set via `PHASE_NEXT_ACTION.get(phase) ?? current.next_action` is safe (nullish
  fallback preserves prior value if a phase is somehow missing from the map).
- `advanceTo` test helper is clean and correctly mirrors the content requirements for each forward
  step, making test intent readable.

---

## Recommended Actions

1. **Add comment to `back` action** about `getPreviousPhase` recency semantics (M1 above).
2. **Decide on `DRAFTING` content guard** — document the skip path or add `02_analysis.md` guard.
3. **Fix pre-existing `cr-backfill.ts` lint errors** in a separate commit to restore lint gate.
4. **Optional:** Add fallthrough guard to `advanceTo` test helper (L2).

---

## Unresolved Questions

- Is the `back` action intended to always go to the topologically previous phase, or just the
  last-visited phase? If the latter, the current design is correct but could confuse users who
  expect "back" to mean "undo" not "go to previous step in history".
- Should `WAITING_CLIENT → DRAFTING` (forward path, skips client answers) also require
  `03_questions.md` to be non-empty? Currently no content guard on this transition.
