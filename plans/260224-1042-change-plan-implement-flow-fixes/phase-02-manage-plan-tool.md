# Phase 2: manage_plan Tool Definition

## Context Links
- Brainstorm: `plans/reports/brainstorm-260224-1023-change-plan-implement-flows-review.md` §5
- Scout: `plans/reports/Scout-260224-1023-plan-implement-flow.md` §6
- Reference pattern: `sekkei/packages/mcp-server/src/tools/change-request.ts`

## Overview
- **Priority:** P1 (Critical)
- **Status:** Completed
- **Scope:** New MCP tool `manage_plan` — schema, types, dispatch, registration

## Key Insights
- Follow exact `manage_change_request` pattern: schema + dispatch file + action handlers
- 6 actions: `create`, `status`, `list`, `execute`, `update`, `detect`
- Plan entity persisted as YAML frontmatter in `sekkei-docs/plans/` (same pattern as CR files)
- Plan statuses: `pending`, `in_progress`, `completed`, `cancelled`
- Phase statuses: `pending`, `in_progress`, `completed`, `skipped`

## Requirements

### New Type File: `types/plan.ts`

```typescript
export const PLAN_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PHASE_STATUSES = ["pending", "in_progress", "completed", "skipped"] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const PHASE_TYPES = ["shared", "per-feature", "validation"] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export interface PlanFeature {
  id: string;          // e.g. "sal" (kebab-case)
  name: string;        // e.g. "Sales Management"
  complexity: "simple" | "medium" | "complex";
  priority: number;    // 1-based
}

export interface PlanPhase {
  number: number;
  name: string;
  type: PhaseType;
  feature_id?: string;   // omit for shared/validation
  status: PhaseStatus;
  file: string;          // e.g. "phase-01-shared-sections.md"
}

export interface GenerationPlan {
  title: string;
  doc_type: string;       // basic-design | detail-design | test-spec
  status: PlanStatus;
  features: PlanFeature[];
  feature_count: number;
  split_mode: boolean;
  created: string;        // ISO date
  updated: string;        // ISO date
  phases: PlanPhase[];
  survey?: Record<string, unknown>;  // persisted survey data from Round 2
}
```

### New Tool File: `tools/plan.ts`

Follow `change-request.ts` pattern exactly.

```typescript
export const PLAN_ACTIONS = [
  "create", "status", "list", "execute", "update", "detect",
] as const;

const inputSchema = {
  action: z.enum(PLAN_ACTIONS).describe("Plan action"),
  workspace_path: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Project root path"),
  config_path: z.string().max(500).optional()
    .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml"),
  plan_id: z.string().max(100).optional()
    .describe("Plan directory name (e.g. 20260224-basic-design-generation)"),
  doc_type: z.string().max(30).optional()
    .describe("Document type for create/detect (basic-design, detail-design, test-spec)"),
  features: z.array(z.object({
    id: z.string().max(30),
    name: z.string().max(100),
    complexity: z.enum(["simple", "medium", "complex"]).default("medium"),
    priority: z.number().int().min(1).max(50),
  })).max(50).optional()
    .describe("Feature list with survey data (for create)"),
  phase_number: z.number().int().min(1).max(50).optional()
    .describe("Phase number (for execute/update)"),
  phase_status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional()
    .describe("New phase status (for update)"),
  survey_data: z.record(z.unknown()).optional()
    .describe("Survey Round 2 data to persist in plan frontmatter"),
};
```

### Registration in `tools/index.ts`

```typescript
import { registerPlanTool } from "./plan.js";
// In registerAllTools():
registerPlanTool(server);
```

### Dispatch File: `tools/plan-actions.ts`

```typescript
export async function handlePlanAction(args: PlanArgs): Promise<ToolResult> {
  switch (args.action) {
    case "create":  return handleCreate(args);
    case "status":  return handleStatus(args);
    case "list":    return handleList(args);
    case "execute": return handleExecute(args);
    case "update":  return handleUpdate(args);
    case "detect":  return handleDetect(args);
    default:        return err(`Unknown action: ${args.action}`);
  }
}
```

## Architecture

```
tools/plan.ts           — Schema + registration + ok/err helpers
tools/plan-actions.ts   — Action dispatch + simple handlers (status/list/update/detect)
tools/plan-engine.ts    — Complex handlers (create/execute) — Phase 3 & 4
lib/plan-state.ts       — YAML persistence, plan CRUD, phase parsing — Phase 3
types/plan.ts           — Type definitions
```

## Related Code Files

| Action | File |
|--------|------|
| Create | `sekkei/packages/mcp-server/src/types/plan.ts` |
| Create | `sekkei/packages/mcp-server/src/tools/plan.ts` |
| Create | `sekkei/packages/mcp-server/src/tools/plan-actions.ts` (stub — handlers in Phase 3/4) |
| Modify | `sekkei/packages/mcp-server/src/tools/index.ts` (add registration) |
| Modify | `sekkei/packages/mcp-server/src/lib/errors.ts` (add PLAN_ERROR code) |

## Implementation Steps

1. Create `src/types/plan.ts` with all type definitions
2. Add `"PLAN_ERROR"` to `SekkeiErrorCode` union in `src/lib/errors.ts`
3. Create `src/tools/plan.ts` with Zod schema, `PlanArgs` interface, `ok`/`err` re-exports, `handlePlan()`, `registerPlanTool()`
4. Create `src/tools/plan-actions.ts` with dispatch switch + stub handlers returning `err("not implemented")`
5. Add `registerPlanTool` import + call in `src/tools/index.ts`
6. Run `npm run lint` to verify type-checking passes

## Todo List
- [x] Create types/plan.ts
- [x] Add PLAN_ERROR to errors.ts
- [x] Create tools/plan.ts (schema + registration)
- [x] Create tools/plan-actions.ts (dispatch + stubs)
- [x] Register in tools/index.ts
- [x] Verify lint passes

## Success Criteria
- `npm run lint` passes with no errors
- Tool registers without runtime errors
- Schema validates correct inputs, rejects invalid
- All action stubs return error placeholder

## Risk Assessment
- **Schema size:** 10 params is moderate but matches CR pattern. No risk.
- **Action naming:** `execute` vs `execute_phase` — chose `execute` for brevity since `phase_number` param already scopes it.
