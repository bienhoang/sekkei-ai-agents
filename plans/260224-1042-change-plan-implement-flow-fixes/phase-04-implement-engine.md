# Phase 4: Implement Engine Backend

## Context Links
- Scout: `plans/reports/Scout-260224-1023-plan-implement-flow.md` §5, §7
- Plan orchestrator spec: `sekkei/packages/skills/content/references/plan-orchestrator.md` §5
- Brainstorm: `plans/reports/brainstorm-260224-1023-change-plan-implement-flows-review.md` §3

## Overview
- **Priority:** P1 (Critical)
- **Status:** Completed
- **Scope:** Phase execution support in `manage_plan` tool — `execute` action + upstream assembly helper
- **Addresses:** I1, I2, I3, I4 from brainstorm report

## Key Insights
- `execute` action reads phase file, assembles upstream context, returns instructions for skill layer to delegate
- Backend does NOT call `generate_document` directly — returns structured execution plan for skill to dispatch
- Upstream assembly is the complex part: shared + requirements + functions-list + feature-specific BD/screens
- Progress tracking via `updatePhaseStatus()` from Phase 3
- Retry = skill layer re-calls `execute` with same `phase_number` (idempotent re-read)

## Requirements

### Action Handler: `handleExecute` in `plan-actions.ts`

**Input:** `action: "execute"`, `workspace_path`, `config_path`, `plan_id`, `phase_number`

**Logic:**
1. Read plan via `readPlan()` — validate status is `pending` or `in_progress`
2. If plan status is `pending`: update to `in_progress`
3. Find phase by `phase_number` in plan.phases array
4. If phase not found: return error
5. If phase status is `completed` or `skipped`: return `{ already_done: true, status }`
6. Read phase file for full details (scope, feature_id, survey data)
7. Assemble upstream context via `assembleUpstream()`
8. Update phase status to `in_progress`
9. Return execution instructions:

```json
{
  "phase": { "number": 1, "name": "...", "type": "shared", "feature_id": null },
  "command": {
    "tool": "generate_document",
    "args": {
      "doc_type": "basic-design",
      "scope": "shared",
      "feature_name": null,
      "upstream_content": "<assembled upstream>"
    }
  },
  "survey_data": { "complexity": "medium", "requirements": "..." },
  "total_phases": 5,
  "completed_phases": 1
}
```

### Upstream Assembly Helper: `assembleUpstream()` in `lib/plan-state.ts`

**Signature:**
```typescript
export async function assembleUpstream(
  workspacePath: string,
  docType: string,
  phaseType: PhaseType,
  featureId?: string,
): Promise<string>
```

**Logic by phase type:**

#### `shared` phase
- Read `requirements.md` from sekkei-docs output dir
- Read `functions-list.md` from sekkei-docs output dir
- Concatenate: `requirements + "\n\n" + functions-list`

#### `per-feature` phase
- Start with shared upstream (same as above)
- Read all files in `sekkei-docs/shared/` dir -> concat as shared_content
- For detail-design: also read `features/{featureId}/basic-design.md` + `features/{featureId}/screen-design.md`
- For test-spec: also read `features/{featureId}/detail-design.md` + basic-design
- Concatenate all: `shared_content + requirements + functions-list + feature_docs`

#### `validation` phase
- No upstream needed — return empty string
- Execute action returns `{ tool: "validate_document", args: { manifest_path } }` instead

**Error handling:**
- Missing files: log warning, continue with available content (graceful degradation)
- Use `readFile` with try/catch per file — append `[FILE NOT FOUND: {path}]` marker if missing

### Output Path Resolution

Include `output_path` in execute response based on phase type:
- shared: `sekkei-docs/shared/{section-name}.md`
- per-feature: `sekkei-docs/features/{feature-id}/{doc-type}.md`
- validation: N/A

Use existing `resolveOutputPath()` from `lib/resolve-output-path.ts` where applicable.

## Architecture

```
Skill Layer (/sekkei:implement)
  ↓ manage_plan(action="execute", plan_id, phase_number)
MCP Tool
  → plan-actions.ts handleExecute
    → plan-state.ts readPlan + readPhase
    → plan-state.ts assembleUpstream (reads sekkei-docs/)
    ← Returns { command, args, upstream_content }
  ↓ Skill calls generate_document(args) directly
  ↓ manage_plan(action="update", phase_number, phase_status="completed")
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `sekkei/packages/mcp-server/src/tools/plan-actions.ts` (implement handleExecute) |
| Modify | `sekkei/packages/mcp-server/src/lib/plan-state.ts` (add assembleUpstream) |
| Reference | `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts` |
| Reference | `sekkei/packages/mcp-server/src/tools/generate.ts` (scope/feature_name params) |

## Implementation Steps

1. Add `assembleUpstream()` to `lib/plan-state.ts`
2. Implement `handleExecute` in `plan-actions.ts`:
   - Read plan + phase
   - Call assembleUpstream
   - Build command args matching `generate_document` schema
   - Return structured execution instructions
3. Add output path resolution to execute response
4. Handle validation phase separately (returns validate_document command)
5. Run `npm run lint`

## Todo List
- [x] Implement assembleUpstream() in plan-state.ts
- [x] Implement handleExecute in plan-actions.ts
- [x] Add output path resolution
- [x] Handle validation phase
- [x] Verify lint passes

## Success Criteria
- `execute` returns correct `generate_document` args for shared phase
- `execute` returns correct args with assembled upstream for per-feature phase
- `execute` returns `validate_document` command for validation phase
- Missing upstream files handled gracefully (warning, not error)
- Phase status updated to `in_progress` on execute call
- Re-calling execute on completed phase returns `already_done: true`

## Risk Assessment
- **Upstream assembly complexity:** Reading multiple files from different dirs. Mitigate: fail gracefully per-file, log warnings.
- **Output path assumptions:** Assumes standard sekkei-docs directory structure. Mitigate: read output dir from config if available, fallback to `sekkei-docs/`.
- **File size:** assembleUpstream may produce large strings for projects with many shared sections. Mitigate: document max upstream content limit (~500KB, matching generate_document schema).
