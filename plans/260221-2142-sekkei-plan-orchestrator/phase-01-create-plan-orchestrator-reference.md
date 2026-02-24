# Phase 01: Create plan-orchestrator.md Reference

## Context Links
- [Plan overview](./plan.md)
- [Brainstorm report](../reports/brainstorm-260221-2142-sekkei-plan-orchestrator.md)
- [Current SKILL.md](../../sekkei/skills/sekkei/SKILL.md)
- [Existing references](../../sekkei/skills/sekkei/references/)

## Overview
**Status:** Complete

- **Priority:** P1
- **Status:** Pending
- **Description:** Create `sekkei/skills/sekkei/references/plan-orchestrator.md` containing all orchestration logic for plan creation, survey, generation, and execution.

## Key Insights
- Reference file pattern already used by skill (doc-standards.md, v-model-guide.md)
- SKILL.md workflow sections will reference this file for detailed logic
- Follows same pattern as cook's `references/workflow-steps.md` and planning's `references/plan-organization.md`

## Requirements

### Functional
- Auto-trigger detection logic (doc-type list + split config + feature count)
- Survey flow (2 rounds: scope → per-feature detail)
- Plan directory creation with YAML frontmatter
- Flexible phase mapping per doc-type
- Implementation execution with delegation to existing sub-commands
- Progress tracking via checkboxes and status updates

### Non-functional
- File under 200 lines (concise but complete)
- Clear section headers for SKILL.md to reference

## Architecture

Reference file sections:
```
1. Auto-Trigger Detection
2. Survey Flow
3. Plan Generation
4. Phase Mapping Templates
5. Implementation Execution
```

## Related Code Files

### Files to Create
- `sekkei/skills/sekkei/references/plan-orchestrator.md`

### Files to Read (for context)
- `sekkei/skills/sekkei/SKILL.md` — understand current sub-command patterns
- `sekkei/skills/sekkei/references/doc-standards.md` — reference file pattern
- `sekkei/skills/sekkei/references/v-model-guide.md` — reference file pattern

## Implementation Steps

1. Create `sekkei/skills/sekkei/references/plan-orchestrator.md`
2. Write Section 1 — **Auto-Trigger Detection**:
   - Define hardcoded doc-types list: `[basic-design, detail-design, test-spec]`
   - Define trigger conditions: split config exists for doc-type AND feature count >= 3 AND no active plan
   - Define plan discovery: scan `sekkei-docs/plans/` for dirs matching `*-{doc-type}-generation/plan.md` with status != completed
   - Define user prompt template
3. Write Section 2 — **Survey Flow**:
   - Round 1: Parse functions-list.md → extract 大分類 → present via AskUserQuestion (multiSelect) → priority ordering
   - Round 2: Per selected feature → AskUserQuestion for complexity (simple/medium/complex), constraints, dependencies, custom instructions
4. Write Section 3 — **Plan Generation**:
   - Directory naming: `sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/`
   - plan.md YAML frontmatter schema (title, doc_type, status, features, feature_count, split_mode, created, phases)
   - plan.md body template (overview + phases table + dependencies)
5. Write Section 4 — **Phase Mapping Templates**:
   - basic-design: phase-01 shared sections (architecture, DB, external-interface, non-functional, tech-rationale) → phase-02..N per-feature (basic-design.md + screen-design.md) → phase-final validation
   - detail-design: phase-01 shared (architecture, DB) → phase-02..N per-feature (module/class/API) → phase-final validation
   - test-spec: phase-01..N per-feature (UT/IT/ST/UAT, no shared) → phase-final traceability matrix
   - Phase file template: overview, generation command, scope params, TODO checklist, success criteria
6. Write Section 5 — **Implementation Execution**:
   - Read plan.md → validate status (pending or in_progress)
   - Build ordered queue from phase files (sort by phase number)
   - Per-phase loop: display summary → AskUserQuestion [Proceed/Skip/Stop] → delegate to sekkei sub-command with scope → mark checkboxes → update plan.md
   - Delegation mapping: which sekkei sub-command + args for each phase type
   - Final: run `/sekkei:validate` → update plan status to completed

## Todo List

- [x] Create references/plan-orchestrator.md file
- [x] Write auto-trigger detection section
- [x] Write survey flow section (2 rounds)
- [x] Write plan generation section (directory + frontmatter + body)
- [x] Write phase mapping templates (3 doc-types)
- [x] Write implementation execution section (delegation + tracking)

## Success Criteria
- File exists at `sekkei/skills/sekkei/references/plan-orchestrator.md`
- Under 200 lines
- All 5 sections present with actionable instructions
- Phase mapping covers all 3 doc-types
- Delegation commands reference correct sekkei sub-commands

## Risk Assessment
- Reference file too long → mitigate by using concise bullet points, no verbose prose
- Missing edge cases (e.g., partial plan exists) → mitigate by defining status check in auto-trigger

## Security Considerations
- No sensitive data — skill reference file only
- Plan files in user project dir, not skill dir

## Next Steps
- Phase 02: Update SKILL.md with sub-commands and workflow sections
