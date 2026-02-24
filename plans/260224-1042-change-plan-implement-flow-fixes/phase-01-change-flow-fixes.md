# Phase 1: Change Flow Fixes (C1-C7)

## Context Links
- Scout report: `plans/reports/Scout-260224-1023-change-flow.md`
- Brainstorm: `plans/reports/brainstorm-260224-1023-change-plan-implement-flows-review.md` §1

## Overview
- **Priority:** P2 (Medium)
- **Status:** Complete
- **Scope:** Fix 2 medium + 5 low severity bugs in existing change-request flow

## Key Insights
- Change flow is production-ready; all fixes are incremental improvements
- C1/C2 are medium severity (UX/safety). C3-C7 are low (edge cases, docs)
- No architectural changes needed — all fixes are localized

## Requirements

### C1 — Upstream propagation content suggestions (Medium)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-propagation-actions.ts` lines 100-104
- **Issue:** `propagate_next` returns only instruction text for upstream steps, no content snippet
- **Fix:** Add optional `suggest_content` param to `propagate_next`. When true + upstream step, read origin doc content, extract paragraphs containing changed IDs, return as `suggested_content` field in response
- **Implementation:**
  1. Add `suggest_content: z.boolean().optional()` to input schema in `change-request.ts`
  2. Add field to `ChangeRequestArgs` interface
  3. In `handlePropagateNext()`, when `step.direction === "upstream"` AND `args.suggest_content`:
     - Read origin doc from chain docs (need `config_path`)
     - Extract lines containing changed IDs from CR entity
     - Return as `suggested_content` string in JSON response
  4. Keep backward-compatible — omit field when not requested

### C2 — Git checkpoint rollback action (Medium)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-propagation-actions.ts` lines 74-86
- **Issue:** No way to rollback to pre-propagation checkpoint
- **Fix:** Add `rollback` action to `manage_change_request`
- **Implementation:**
  1. Add `"rollback"` to `CR_ACTIONS` array in `change-request.ts`
  2. Create `handleRollback()` in `cr-actions.ts`:
     - Require `cr_id` + `workspace_path`
     - Read CR, verify status is `PROPAGATING`
     - Run `git log --oneline -20` to find `chore: pre-{cr_id} checkpoint` commit
     - If found: `git reset --hard {sha}` to rollback
     - Transition CR to `APPROVED` (allows re-propagation)
     - Return `{ success: true, reverted_to: sha }`
     - If not found: return error "No checkpoint found for {cr_id}"
  3. Add to dispatch switch in `handleCRAction()`

### C3 — Document auto-detect limitation (Low)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-actions.ts` lines 41-58
- **Issue:** Line-by-line comparison may miss structural changes
- **Fix:** Documentation only — add comment explaining limitation in code + note in skill reference
- **Implementation:**
  1. Add JSDoc comment above auto-detect block in `cr-actions.ts`
  2. No code change needed

### C4 — Git checkpoint silent failure warning (Low)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-propagation-actions.ts` lines 74-86
- **Issue:** User doesn't know checkpoint failed
- **Fix:** Return `checkpoint_created: false` in response when git fails
- **Implementation:**
  1. Track checkpoint success in boolean variable
  2. Include `checkpoint_created` field in `propagate_next` JSON response

### C5 — Backfill multi-upstream suggestion (Low)
- **File:** `sekkei/packages/mcp-server/src/lib/cr-backfill.ts` line 66
- **Issue:** Only suggests first matching upstream doc
- **Fix:** Remove `break` statement, suggest all matching upstream docs
- **Implementation:**
  1. Remove the `break` after first matching upstream doc
  2. Add deduplication by `(id, target_doc)` pair

### C6 — Partial validation support (Low)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-propagation-actions.ts` lines 128-132
- **Issue:** Cannot validate chain mid-propagation
- **Fix:** Add `partial` param — when true, skip incomplete-steps check
- **Implementation:**
  1. Add `partial: z.boolean().optional()` to input schema
  2. In `handleValidate()`, skip incomplete check when `args.partial === true`
  3. Still run `validateChain()` and return results

### C7 — Conflict detection documentation (Low)
- **File:** `sekkei/packages/mcp-server/src/tools/cr-actions.ts` lines 66-88
- **Issue:** Conflicts are advisory but not clearly documented
- **Fix:** Add JSDoc comment clarifying advisory-only design
- **Implementation:**
  1. Add comment above `handleApprove()` explaining conflicts are non-blocking by design

## Related Code Files

| Action | File |
|--------|------|
| Modify | `sekkei/packages/mcp-server/src/tools/change-request.ts` (schema: add suggest_content, partial, rollback) |
| Modify | `sekkei/packages/mcp-server/src/tools/cr-actions.ts` (add handleRollback, dispatch, docs) |
| Modify | `sekkei/packages/mcp-server/src/tools/cr-propagation-actions.ts` (C1 suggest, C4 checkpoint flag, C6 partial) |
| Modify | `sekkei/packages/mcp-server/src/lib/cr-backfill.ts` (C5 remove break) |

## Implementation Steps

1. Add `rollback` to `CR_ACTIONS` in `change-request.ts`, add `suggest_content` + `partial` to schema
2. Implement `handleRollback()` in `cr-actions.ts`, add to dispatch switch
3. Modify `handlePropagateNext()` — add suggest_content logic + checkpoint_created flag
4. Modify `handleValidate()` — add partial flag bypass
5. Fix `cr-backfill.ts` — remove break, add dedup
6. Add JSDoc comments for C3, C7
7. Run `npm run lint` + `npm test` from `sekkei/packages/mcp-server/`

## Todo List
- [x] C1: Add suggest_content to propagate_next
- [x] C2: Implement rollback action
- [x] C3: Document auto-detect limitation
- [x] C4: Return checkpoint_created flag
- [x] C5: Fix backfill multi-upstream
- [x] C6: Add partial validation support
- [x] C7: Document advisory conflicts

## Success Criteria
- All existing tests still pass
- `rollback` action transitions PROPAGATING -> APPROVED
- `suggest_content` returns extracted paragraphs for upstream steps
- `partial` flag skips incomplete-steps check in validate
- Backfill returns suggestions for all matching upstream docs

## Risk Assessment
- **C2 rollback:** `git reset --hard` is destructive — must verify correct checkpoint SHA. Mitigate: validate commit message matches expected pattern before reset.
- **C1 suggest_content:** Requires `config_path` param which may not be passed. Mitigate: return error if suggest_content=true but no config_path.
