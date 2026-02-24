# Phase 3: Plan Engine Backend

## Context Links
- Scout: `plans/reports/Scout-260224-1023-plan-implement-flow.md` §2-§5
- Plan orchestrator spec: `sekkei/packages/skills/content/references/plan-orchestrator.md`
- CR state machine pattern: `sekkei/packages/mcp-server/src/lib/cr-state-machine.ts`

## Overview
- **Priority:** P1 (Critical)
- **Status:** Pending
- **Scope:** Backend logic for plan CRUD, phase file generation, active plan detection, survey persistence
- **Addresses:** P1, P2, P3 from brainstorm report

## Key Insights
- Follow `cr-state-machine.ts` YAML persistence pattern (readFile + parse frontmatter + writefile)
- Plan files stored at `sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/`
- Phase files use template from `plan-orchestrator.md` §4 (phase-XX-name.md with YAML frontmatter)
- Survey data persisted in plan.md frontmatter `survey` field (fixes P3 — session crash resilience)
- Active plan detection = glob `sekkei-docs/plans/*-{doc-type}-generation/plan.md` + check status != completed/cancelled

## Requirements

### File: `lib/plan-state.ts` (~180 lines)

YAML persistence layer mirroring `cr-state-machine.ts`.

**Functions:**

#### `getPlanDir(basePath: string): string`
- Returns `join(basePath, "sekkei-docs", "plans")`

#### `generatePlanId(docType: string): string`
- Format: `YYYYMMDD-{doc-type}-generation`
- e.g. `20260224-basic-design-generation`

#### `readPlan(planFilePath: string): Promise<GenerationPlan>`
- Read file, extract YAML frontmatter between `---` markers
- Parse with `yaml` package
- Validate status is in `PLAN_STATUSES`
- Return typed `GenerationPlan` object

#### `writePlan(planDir: string, plan: GenerationPlan): Promise<void>`
- Serialize plan to YAML frontmatter
- Generate markdown body: overview + phases table (match plan-orchestrator §3 format)
- Write to `{planDir}/plan.md`

#### `readPhase(phaseFilePath: string): Promise<PlanPhase & { scope?: string; survey_data?: Record<string,unknown> }>`
- Read phase file, parse YAML frontmatter
- Return phase metadata

#### `writePhaseFile(planDir: string, phase: PlanPhase, docType: string, splitConfig: Record<string,string[]>, feature?: PlanFeature): Promise<void>`
- Generate phase file from template (plan-orchestrator §4 format)
- Include: YAML frontmatter + generation command + scope + TODO checklist + success criteria
- For per-feature: include survey data (complexity, requirements) from feature object

#### `listPlans(basePath: string): Promise<GenerationPlan[]>`
- Glob `sekkei-docs/plans/*/plan.md`
- Read each, return sorted by created date

#### `findActivePlan(basePath: string, docType: string): Promise<GenerationPlan | null>`
- Glob `sekkei-docs/plans/*-{docType}-generation/plan.md`
- Read each, return first with status `pending` or `in_progress`
- Returns `null` if no active plan

#### `updatePhaseStatus(planDir: string, phaseNumber: number, status: PhaseStatus): Promise<void>`
- Read plan.md -> find phase by number -> update status -> write back
- Also update phase file frontmatter status

### Action Handler: `handleCreate` in `plan-actions.ts`

**Input:** `action: "create"`, `workspace_path`, `config_path`, `doc_type`, `features`, `survey_data`

**Logic:**
1. Validate `doc_type` is one of: `basic-design`, `detail-design`, `test-spec`
2. Read `sekkei.config.yaml` via `config_path` -> extract `split.{doc_type}` config
3. If no split config: return error "Split mode not configured for {doc_type}"
4. Check no active plan exists via `findActivePlan()`
5. Generate plan ID via `generatePlanId(doc_type)`
6. Create plan directory: `sekkei-docs/plans/{planId}/`
7. Build phases array from doc-type mapping:
   - If doc-type has shared sections (basic-design, detail-design): phase 01 = shared
   - Phase 02..N = per-feature (ordered by priority from `features` array)
   - Phase final = validation
   - test-spec: NO shared phase, all per-feature + final
8. Create `GenerationPlan` object with features, phases, survey_data
9. Write plan.md via `writePlan()`
10. Write each phase file via `writePhaseFile()`
11. Return `{ success: true, plan_id, plan_path, phases: [...] }`

### Action Handler: `handleStatus` in `plan-actions.ts`

**Input:** `action: "status"`, `workspace_path`, `plan_id`

**Logic:**
1. Resolve plan path: `sekkei-docs/plans/{plan_id}/plan.md`
2. Read plan via `readPlan()`
3. Return full plan JSON

### Action Handler: `handleList` in `plan-actions.ts`

**Input:** `action: "list"`, `workspace_path`

**Logic:**
1. Call `listPlans(workspace_path)`
2. Return summary array: `[{ plan_id, doc_type, status, feature_count, phases_completed, created }]`

### Action Handler: `handleDetect` in `plan-actions.ts`

**Input:** `action: "detect"`, `workspace_path`, `config_path`, `doc_type`

**Logic:**
1. Read config -> check `split.{doc_type}` exists
2. Read `functions-list.md` from workspace -> count 大分類 headers (regex: `^## .+` under `# 大分類`)
3. Check feature count >= 3
4. Check no active plan via `findActivePlan()`
5. Return `{ should_trigger: boolean, reason: string, feature_count: number, has_active_plan: boolean }`

### Action Handler: `handleUpdate` in `plan-actions.ts`

**Input:** `action: "update"`, `workspace_path`, `plan_id`, `phase_number`, `phase_status`

**Logic:**
1. Resolve plan path
2. Call `updatePhaseStatus(planDir, phase_number, phase_status)`
3. If all phases completed/skipped: auto-update plan status to `completed`
4. Return updated plan status

## Architecture

```
Skill Layer (/sekkei:plan)
  ↓ AskUserQuestion (survey)
  ↓ manage_plan(action="create", features=[...], survey_data={...})
MCP Tool (tools/plan.ts)
  → plan-actions.ts dispatch
    → lib/plan-state.ts (YAML persistence)
      → sekkei-docs/plans/{id}/plan.md + phase-XX-*.md
```

## Related Code Files

| Action | File |
|--------|------|
| Create | `sekkei/packages/mcp-server/src/lib/plan-state.ts` |
| Modify | `sekkei/packages/mcp-server/src/tools/plan-actions.ts` (replace stubs with real handlers) |

## Implementation Steps

1. Create `src/lib/plan-state.ts` with all persistence functions
2. Implement `handleCreate` — validate inputs, read config, build phases, write files
3. Implement `handleStatus` — read + return plan
4. Implement `handleList` — glob + read + summarize
5. Implement `handleDetect` — check split config + feature count + active plan
6. Implement `handleUpdate` — update phase/plan status
7. Run `npm run lint` to verify

## Todo List
- [x] Create lib/plan-state.ts (readPlan, writePlan, readPhase, writePhaseFile, listPlans, findActivePlan, updatePhaseStatus)
- [x] Create lib/plan-phase-template.ts (renderPhaseFile extracted helper — keeps plan-state.ts manageable)
- [x] Implement handleCreate (plan + phase file generation)
- [x] Implement handleStatus
- [x] Implement handleList
- [x] Implement handleDetect (auto-trigger check)
- [x] Implement handleUpdate (phase status tracking)
- [x] Verify lint passes

## Success Criteria
- `create` generates correct directory structure with plan.md + phase files
- `detect` accurately checks all 4 trigger conditions
- `findActivePlan` returns null when no active plan, returns plan when active
- Survey data persisted in plan.md frontmatter
- Phase status updates propagate to both plan.md and phase file
- All files use YAML frontmatter format consistent with CR pattern

## Risk Assessment
- **File size:** `plan-state.ts` may approach 200 lines. Mitigate: keep functions focused, extract phase-template generation to helper.
- **Config parsing:** Reading `sekkei.config.yaml` split config — must handle missing/malformed config gracefully with SekkeiError.
- **Feature count detection:** Parsing `functions-list.md` for 大分類 headers — regex must handle Japanese markdown headers correctly.
