---
title: "Phase 3: Plan Management Fixes"
status: complete
priority: P1
effort: 1.5h
covers: [P1.1, P1.2]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 3: Plan Management Fixes

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-02-plan-cr-staleness.md](./research/researcher-02-plan-cr-staleness.md)
- Audit: [brainstorm-260224-1400-vmodel-chain-audit.md](../reports/brainstorm-260224-1400-vmodel-chain-audit.md)
- Blocked by: none (independent of Phases 1 and 2)
- Blocks: none

## Overview

- **Date:** 2026-02-24
- **Description:** Fix the `plan_id` listing bug (always generates today's date) and add a `cancel` action that was declared in `PlanStatus` but never implemented.
- **Priority:** P1 — plan listing is broken for plans created on any prior day
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

From researcher-02:

**Bug — `handleList` line 211:**
```typescript
plan_id: generatePlanId(p.doc_type), // BUG: uses Date.now(), not plan creation date
```
`generatePlanId(docType)` always stamps today's date. Plans created yesterday return wrong IDs. The canonical `plan_id` is the directory name set once in `handleCreate` (line 142). Best fix: persist `plan_id` in the YAML frontmatter during `handleCreate` (Option B from research), then read it back.

**Gap — no cancel action:**
`PLAN_STATUSES = ["pending", "in_progress", "completed", "cancelled"]` but the switch in `handlePlanAction` (line 410) has no `"cancel"` case. `findActivePlan` checks `status !== "completed" && status !== "cancelled"` — cancel semantics already understood by state machine; just no handler.

**`listPlans` in plan-state.ts** currently returns `GenerationPlan[]` only — directory names not exposed. Adding `plan_id` to `GenerationPlan` type (Option B) is self-contained and doesn't require changing `listPlans`'s return type.

## Requirements

### Functional
- `GenerationPlan` interface gains optional `plan_id?: string` field
- `writePlan` persists `plan_id` in YAML frontmatter (alongside title, doc_type, etc.)
- `readPlan` reads `plan_id` back from frontmatter
- `handleCreate` stores `planId` in plan object before calling `writePlan`
- `handleList` uses `p.plan_id ?? "unknown"` instead of `generatePlanId(p.doc_type)`
- New `"cancel"` case in `handlePlanAction` switch calls `handleCancel`
- `handleCancel` transitions `pending` or `in_progress` → `cancelled`; rejects if already `completed` or `cancelled`
- Plan schema Zod enum in `plan.ts` (the tool schema) adds `"cancel"` to valid actions

### Non-Functional
- Backward compatible: plans written before this fix lack `plan_id` in YAML → fall back to `"unknown"` in list output, no crash
- `handleCancel` writes updated plan via `writePlan` and returns confirmation JSON
- No changes to phase files or phase-level status handling

## Architecture

```
types/plan.ts
  GenerationPlan.plan_id?: string   ← add optional field

lib/plan-state.ts
  writePlan()   ← serialize plan_id in frontmatter
  readPlan()    ← deserialize plan_id from frontmatter

tools/plan-actions.ts
  handleCreate()  ← set plan.plan_id = planId before writePlan
  handleList()    ← use p.plan_id instead of generatePlanId()
  handleCancel()  ← new handler function
  handlePlanAction() switch ← add "cancel" case

tools/plan.ts (Zod schema)
  action enum  ← add "cancel"
```

## Related Code Files

### Modify
- `packages/mcp-server/src/types/plan.ts` — add `plan_id?: string` to `GenerationPlan`
- `packages/mcp-server/src/lib/plan-state.ts` — serialize/deserialize `plan_id` in `writePlan`/`readPlan`
- `packages/mcp-server/src/tools/plan-actions.ts` — fix `handleList`, add `handleCancel`, update switch
- `packages/mcp-server/src/tools/plan.ts` — add `"cancel"` to action Zod enum

### Create
- none

## Implementation Steps

### Step 1 — Add `plan_id` to GenerationPlan (types/plan.ts)

```typescript
export interface GenerationPlan {
  plan_id?: string;      // ← add as first optional field
  title: string;
  // ... rest unchanged
}
```

### Step 2 — Persist `plan_id` in writePlan (lib/plan-state.ts)

In `writePlan`, add `plan_id` to the `stringify({...})` call:
```typescript
const frontmatter = stringify({
  plan_id: plan.plan_id ?? null,   // ← add before title
  title: plan.title,
  // ... rest unchanged
});
```

### Step 3 — Read `plan_id` back in readPlan (lib/plan-state.ts)

In the returned object from `readPlan`:
```typescript
return {
  plan_id: (data.plan_id as string) ?? undefined,   // ← add
  title: (data.title as string) ?? "",
  // ... rest unchanged
};
```

### Step 4 — Set plan_id in handleCreate (tools/plan-actions.ts)

Find where `writePlan(planDir, plan)` is called in `handleCreate`. Before that call, ensure the plan object has `plan_id`:
```typescript
const plan: GenerationPlan = {
  plan_id: planId,      // ← add
  title: `${doc_type} Generation Plan`,
  // ... rest of existing fields
};
```

### Step 5 — Fix handleList (tools/plan-actions.ts)

Replace line 211:
```typescript
// Before:
plan_id: generatePlanId(p.doc_type),

// After:
plan_id: p.plan_id ?? "unknown",
```

### Step 6 — Add handleCancel (tools/plan-actions.ts)

Add before the `// --- Dispatch ---` comment:
```typescript
async function handleCancel(args: PlanArgs): Promise<ToolResult> {
  const { workspace_path, plan_id } = args;
  if (!plan_id) return err("plan_id is required for cancel");

  const plansDir = getPlanDir(workspace_path);
  const planDir = join(plansDir, plan_id);
  const planFile = join(planDir, "plan.md");

  let plan: GenerationPlan;
  try {
    plan = await readPlan(planFile);
  } catch (e) {
    const msg = e instanceof SekkeiError ? e.toClientMessage() : `Plan not found: ${plan_id}`;
    return err(msg);
  }

  if (plan.status === "completed") {
    return err(`Cannot cancel a completed plan: ${plan_id}`);
  }
  if (plan.status === "cancelled") {
    return err(`Plan already cancelled: ${plan_id}`);
  }

  plan.status = "cancelled";
  plan.updated = new Date().toISOString().slice(0, 10);
  await writePlan(planDir, plan);

  return ok(JSON.stringify({ plan_id, status: "cancelled" }, null, 2));
}
```

### Step 7 — Add cancel to dispatch switch (tools/plan-actions.ts)

```typescript
case "cancel":  return handleCancel(args);
```

### Step 8 — Add cancel to Zod schema (tools/plan.ts)

Locate the `action` enum in the Zod input schema and add `"cancel"`:
```typescript
action: z.enum(["create", "status", "list", "execute", "update", "detect", "cancel"])
```

### Step 9 — Type-check and test

```bash
cd packages/mcp-server
npm run lint
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs \
  tests/unit/plan-state.test.ts \
  tests/unit/plan-tool.test.ts
```

## Todo List

- [ ] Add `plan_id?: string` to `GenerationPlan` interface
- [ ] Serialize `plan_id` in `writePlan`
- [ ] Deserialize `plan_id` in `readPlan`
- [ ] Set `plan_id = planId` in `handleCreate` before `writePlan`
- [ ] Fix `handleList` to use `p.plan_id ?? "unknown"`
- [ ] Implement `handleCancel` function
- [ ] Add `"cancel"` case to dispatch switch
- [ ] Add `"cancel"` to Zod action enum in plan.ts
- [ ] Run lint — no errors
- [ ] Run plan-state and plan-tool tests — pass

## Success Criteria

- `handleList` returns the directory-name `plan_id` for plans created on any date
- `handleCancel` transitions pending/in_progress → cancelled; rejects completed/already-cancelled
- Existing plans without `plan_id` in YAML return `"unknown"` (no crash)
- Zod schema accepts `"cancel"` action without throwing
- All existing plan tests pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Plans created before fix lack plan_id in YAML → list shows "unknown" | Certain | Acceptable degraded output; no crash. Document in changelog. |
| handleCreate plan object construction differs from actual code structure | Low | Verify exact construction site before editing |
| Zod enum change breaks clients sending old schema | Low | Additive enum change; existing actions unaffected |

## Security Considerations

- `plan_id` is used to construct a filesystem path (`join(plansDir, plan_id)`). Existing `handleStatus` already does this pattern — verify path traversal guard exists upstream or add one: `plan_id` must match `\d{8}-[a-z-]+-generation` pattern. Add regex guard in `handleCancel` before joining.

## Next Steps

- Phase 6 (tests) should add test cases for `cancel` action (success, already-cancelled, completed rejection).
- Consider adding `plan_id` to `handleStatus` output as well for consistency.
