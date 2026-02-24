# Phase 3: MCP Tool Handler

## Context Links

- Pattern: `src/tools/rfp-workspace.ts` (195 LOC — action dispatch, Zod schema, ok/err helpers)
- Pattern: `src/tools/simulate-impact.ts` (114 LOC — config_path param, impact analysis call)
- Pattern: `src/tools/index.ts` (tool registration)
- Phase 1: cr-state-machine.ts — createCR, readCR, writeCR, transitionCR, listCRs, getCRDir
- Phase 2: cr-propagation.ts, cr-backfill.ts, cr-conflict-detector.ts

## Overview

- **Priority:** P1
- **Status:** pending
- **Description:** Single MCP tool `manage_change_request` with 9 actions, wiring state machine + propagation engine

## Key Insights

- Follow rfp-workspace.ts pattern exactly: action enum, Zod schema per param, switch/case dispatch, ok()/err() helpers, typed args interface
- Tool must accept both `workspace_path` (for CR dir) and `config_path` (for chain docs when analyzing impact)
- `analyze` action reuses existing `findAffectedSections` + `buildImpactReport` from impact-analyzer
- `propagate_next` advances one step at a time (semi-automatic) — returns next step info

## Requirements

### Functional

9 actions for `manage_change_request`:

| Action | Params | Description |
|--------|--------|-------------|
| `create` | workspace_path, origin_doc, description, changed_ids?, old_content?, new_content? | Create CR file. IDs from explicit list OR auto-extracted from old/new content diff |
<!-- Updated: Validation Session 1 - Optional auto-detect changed_ids via diff -->
| `analyze` | workspace_path, cr_id, config_path | Run impact analysis, populate impact_summary + propagation_steps |
| `approve` | workspace_path, cr_id | Check conflicts, transition to APPROVED |
| `propagate_next` | workspace_path, cr_id, config_path, note? | Advance one propagation step, return instruction |
| `validate` | workspace_path, cr_id, config_path | Validate all propagation steps done, chain refs intact |
| `complete` | workspace_path, cr_id | Transition to COMPLETED |
| `status` | workspace_path, cr_id | Return full CR state |
| `list` | workspace_path, status_filter? | List all CRs, optionally filtered |
| `cancel` | workspace_path, cr_id, reason? | Transition to CANCELLED |

### Non-Functional
- Tool handler < 200 LOC (split helpers if needed)
- Register in tools/index.ts
- JSON output for structured data

## Architecture

```
src/tools/change-request.ts     — Zod schema + action dispatch (~100 LOC)
src/tools/cr-actions.ts         — Action handler implementations (~150 LOC)
src/tools/index.ts              — Add registration call (1 line)
```
<!-- Updated: Validation Session 1 - Proactive split into schema+dispatch and action handlers -->

### Action Flow Detail

**create:**
1. Call `createCR(workspace_path, origin_doc, description, changed_ids)`
2. Return `{ success: true, cr_id, status: "INITIATED" }`

**analyze:**
1. Read CR via `readCR`
2. Validate status is INITIATED (transition to ANALYZING)
3. Load chain docs via `loadChainDocs(config_path)`
4. Run `findAffectedSections(cr.changed_ids, docs)` + `buildImpactReport`
5. Compute `computePropagationOrder(cr.origin_doc)` + `generateBackfillSuggestions`
6. Save impact_summary + propagation_steps to CR
7. Transition to IMPACT_ANALYZED
8. Return impact report JSON

**approve:**
1. Read CR, validate IMPACT_ANALYZED status
2. Run `detectConflicts(cr, listCRs(active))`
3. If conflicts: save warnings to CR, return warnings (do NOT block — user decides)
4. Transition to APPROVED
5. Return `{ success: true, conflicts: [...] }`

**propagate_next:**
1. Read CR, validate APPROVED or PROPAGATING
2. On first call: create git commit checkpoint (`chore: pre-{CR-ID} checkpoint`) for rollback safety
3. Transition to PROPAGATING if not already
4. Get current step from `propagation_steps[propagation_index]`
<!-- Updated: Validation Session 1 - Git checkpoint before first propagation -->
4. If current step is upstream: return backfill suggestion text
5. If current step is downstream: return regeneration instruction (which doc to regenerate)
6. Mark step as "done", increment propagation_index, save CR
7. Return `{ step, total, direction, doc_type, instruction }`
8. If all steps done, return `{ all_steps_complete: true }`

**validate:**
1. Read CR, validate PROPAGATING
2. Check all propagation_steps have status "done" or "skipped"
3. Run `validateChain(config_path)` to verify cross-refs still intact
4. Transition to VALIDATED
5. Return validation report

**complete:**
1. Read CR, validate VALIDATED
2. Transition to COMPLETED
3. Return `{ success: true }`

**status:**
1. Read CR, return full JSON representation

**list:**
1. Call `listCRs(workspace_path)`, optionally filter by status
2. Return summary array `[{ id, status, origin_doc, changed_ids, updated }]`

**cancel:**
1. Read CR, transition to CANCELLED with reason
2. Return `{ success: true }`

## Related Code Files

### Files to Create
- `sekkei/packages/mcp-server/src/tools/change-request.ts` — schema + dispatch
- `sekkei/packages/mcp-server/src/tools/cr-actions.ts` — action handler implementations

### Files to Edit
- `sekkei/packages/mcp-server/src/tools/index.ts` — add import + register call

## Implementation Steps

### Step 1: Define Zod schema

```typescript
const CR_ACTIONS = [
  "create", "analyze", "approve", "propagate_next",
  "validate", "complete", "status", "list", "cancel",
] as const;

const inputSchema = {
  action: z.enum(CR_ACTIONS).describe("CR action"),
  workspace_path: z.string().max(500)
    .refine(p => !p.includes(".."), { message: "no path traversal" })
    .describe("Project root path"),
  cr_id: z.string().max(20).optional()
    .describe("CR ID (e.g. CR-260224-001). Required for all actions except create/list"),
  config_path: z.string().max(500).optional()
    .refine(p => !p || /\.ya?ml$/i.test(p), { message: "must be .yaml/.yml" })
    .describe("Path to sekkei.config.yaml (required for analyze/propagate_next/validate)"),
  origin_doc: z.string().max(50).optional()
    .describe("Origin doc type (required for create)"),
  description: z.string().max(2000).optional()
    .describe("Change description (required for create)"),
  changed_ids: z.array(z.string().max(20)).max(50).optional()
    .describe("Changed IDs (for create — OR provide old_content/new_content for auto-detect)"),
  old_content: z.string().max(500_000).optional()
    .describe("Previous doc content (for create auto-detect mode)"),
  new_content: z.string().max(500_000).optional()
    .describe("Updated doc content (for create auto-detect mode)"),
<!-- Updated: Validation Session 1 - Added old/new content params for auto-detect -->
  status_filter: z.string().max(20).optional()
    .describe("Filter for list action"),
  reason: z.string().max(500).optional()
    .describe("Reason for cancel"),
  note: z.string().max(2000).optional()
    .describe("Note for propagate_next step"),
};
```

### Step 2: Implement action handlers

Follow rfp-workspace.ts switch/case pattern. Each case:
1. Validate required params
2. Call state machine / engine functions
3. Return ok(JSON.stringify(result)) or err(message)

### Step 3: Register tool

```typescript
export function registerChangeRequestTool(server: McpServer): void {
  server.tool(
    "manage_change_request",
    "Manage change requests: create, analyze impact, approve, propagate changes, validate, complete",
    inputSchema,
    async (args) => handleChangeRequest(args as ChangeRequestArgs),
  );
}
```

### Step 4: Wire in tools/index.ts

```typescript
import { registerChangeRequestTool } from "./change-request.js";
// In registerAllTools():
registerChangeRequestTool(server);
```

## Todo List

- [ ] Define CR_ACTIONS enum and Zod input schema
- [ ] Implement handleChangeRequest with switch/case dispatch
- [ ] Implement create action
- [ ] Implement analyze action (wire impact-analyzer + propagation engine)
- [ ] Implement approve action (wire conflict detector)
- [ ] Implement propagate_next action (step-by-step propagation)
- [ ] Implement validate action (wire cross-ref validation)
- [ ] Implement complete action
- [ ] Implement status action
- [ ] Implement list action (with optional filter)
- [ ] Implement cancel action
- [ ] Add ok()/err() helpers
- [ ] Register in tools/index.ts
- [ ] Verify `npm run build` passes

## Success Criteria

- Tool registered as `manage_change_request` on MCP server
- All 9 actions dispatch correctly
- create returns valid CR ID
- analyze populates impact_summary and propagation_steps
- approve detects conflicts and warns (non-blocking)
- propagate_next advances one step per call
- validate checks all steps done + chain refs
- complete transitions to COMPLETED
- list returns array of CR summaries
- cancel transitions from any state

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tool exceeds 200 LOC | High | Extract action handlers to separate helper file if needed |
| analyze action is slow (loads all chain docs) | Medium | Acceptable for MCP; add logging for debug |
| config_path not provided for analyze | Medium | Zod optional + runtime check with clear error |

## Security Considerations

- workspace_path validated: no `..` allowed
- config_path validated: must end in .yaml/.yml
- CR IDs validated against pattern before file access
- All errors use SekkeiError.toClientMessage() (no stack leaks)

## Next Steps

Phase 4 creates the skill command that orchestrates this tool interactively.
