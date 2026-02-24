# Phase 02: Update SKILL.md with Sub-Commands and Auto-Trigger

## Context Links
- [Plan overview](./plan.md)
- [Phase 01](./phase-01-create-plan-orchestrator-reference.md)
- [Current SKILL.md](../../sekkei/skills/sekkei/SKILL.md)

## Overview
**Status:** Complete

- **Priority:** P1 (depends on Phase 01)
- **Status:** Pending
- **Description:** Update SKILL.md to add `sekkei:plan` and `sekkei:implement` sub-commands, their workflow sections, auto-trigger Step 0 injection into 3 existing workflows, and reference link.

## Key Insights
- SKILL.md is currently 460 lines with 16 sub-commands
- Sub-commands listed at lines 13-29
- Workflow Router at line 31
- basic-design workflow at line 130, detail-design at line 177, test-spec at line 213
- References section at line 457-460
- Keep SKILL.md additions concise — reference plan-orchestrator.md for detailed logic

## Requirements

### Functional
- Add 2 new sub-commands to the list
- Add 2 new workflow sections (sekkei:plan, sekkei:implement)
- Inject auto-trigger Step 0 into 3 existing workflows
- Add reference link to plan-orchestrator.md

### Non-functional
- SKILL.md growth: ~80-100 lines max
- Workflow sections concise, reference plan-orchestrator.md for details
- Maintain existing formatting style (numbered steps, bold headers)

## Related Code Files

### Files to Modify
- `sekkei/skills/sekkei/SKILL.md`

### Files to Read
- `sekkei/skills/sekkei/references/plan-orchestrator.md` (created in Phase 01)

## Implementation Steps

### Step 1: Update YAML frontmatter description (line 3)
Add `plan, implement` to the commands list in the description field:
```yaml
description: "Generate Japanese specification documents (設計書) following V-model chain. Commands: init, functions-list, requirements, basic-design, detail-design, test-spec, validate, status, export, translate, glossary, update, preview, plan, implement"
```

### Step 2: Add sub-commands to list (after line 29, before `/sekkei:preview`)
Insert:
```markdown
- `/sekkei:plan @doc-type` — Create generation plan for large documents (auto-triggered in split mode)
- `/sekkei:implement @plan-path` — Execute a generation plan phase by phase
```

### Step 3: Inject auto-trigger Step 0 into `/sekkei:basic-design` (before current step 1, ~line 138)
Insert before "1. Read the input":
```markdown
0. **Plan trigger check** (see `references/plan-orchestrator.md` §1):
   - Read `sekkei.config.yaml` → check `split.basic-design` exists
   - Count 大分類 features from `functions-list.md`
   - If split enabled AND features >= 3 AND no active plan for `basic-design` in `sekkei-docs/plans/`:
     → Ask: "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
     → If Y: run `/sekkei:plan basic-design`, then `/sekkei:implement` on the result path
     → If N: continue with step 1 below
```

### Step 4: Inject same Step 0 into `/sekkei:detail-design` (~line 185)
Same pattern as Step 3, replacing `basic-design` with `detail-design` and `split.basic-design` with `split.detail-design`.

### Step 5: Inject same Step 0 into `/sekkei:test-spec` (~line 221)
Same pattern, replacing with `test-spec` and `split.test-spec`.

### Step 6: Add `/sekkei:plan` workflow section (before `## Document Chain`, ~line 417)
```markdown
### `/sekkei:plan @doc-type`

Plan large document generation with user survey and phased execution strategy.
See `references/plan-orchestrator.md` for detailed logic.

1. Determine doc-type from `@doc-type` argument or current chain status (next incomplete doc)
2. Load `sekkei.config.yaml` → verify split config exists for this doc-type
3. Read `functions-list.md` → extract 大分類 feature groups with IDs
4. **Survey Round 1 — Scope**: Present features via `AskUserQuestion` (multiSelect). User selects features to include and sets priority order.
5. **Survey Round 2 — Detail**: For each selected feature, ask via `AskUserQuestion`: complexity (simple/medium/complex), special requirements, external dependencies, custom instructions.
6. **Generate plan**: Create `sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/` directory with:
   - `plan.md` — YAML frontmatter (title, doc_type, status, features, feature_count, split_mode, created, phases) + overview + phases table
   - Phase files per mapping in `references/plan-orchestrator.md` §4
7. Display plan summary table → ask user to review
8. Report: "Plan created at `sekkei-docs/plans/{dir}/`. Run `/sekkei:implement {path}` to execute."
```

### Step 7: Add `/sekkei:implement` workflow section (after sekkei:plan)
```markdown
### `/sekkei:implement @plan-path`

Execute a generation plan phase by phase, delegating to existing sekkei sub-commands.
See `references/plan-orchestrator.md` for detailed logic.

1. Read `plan.md` from `@plan-path` → parse YAML frontmatter → validate status is `pending` or `in_progress`
2. Update plan status to `in_progress`
3. Parse all `phase-XX-*.md` files → build ordered execution queue (sort by phase number)
4. **Per-phase execution loop**:
   a. Display phase summary (name, scope, estimated sections)
   b. Ask user: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   c. If Proceed: delegate to the sekkei sub-command specified in the phase file (e.g., `/sekkei:basic-design` with feature scope)
   d. If Skip: mark phase as skipped, continue to next
   e. If Stop: save progress, exit loop
   f. After delegation completes: mark phase TODO checkboxes as done, update plan.md phases table status
5. After all phases complete: run `/sekkei:validate` on generated documents
6. Update plan.md status to `completed`
7. Report: generation summary (phases completed, files generated, validation results)
```

### Step 8: Update References section (line ~458)
Add:
```markdown
- `references/plan-orchestrator.md` — Plan orchestration logic for large document generation
```

## Todo List

- [x] Update YAML frontmatter description with new commands
- [x] Add sekkei:plan and sekkei:implement to sub-commands list
- [x] Inject auto-trigger Step 0 into basic-design workflow
- [x] Inject auto-trigger Step 0 into detail-design workflow
- [x] Inject auto-trigger Step 0 into test-spec workflow
- [x] Add sekkei:plan workflow section
- [x] Add sekkei:implement workflow section
- [x] Add plan-orchestrator.md to References section

## Success Criteria
- SKILL.md has 18 sub-commands listed (16 existing + 2 new)
- Auto-trigger Step 0 present in basic-design, detail-design, test-spec workflows
- sekkei:plan and sekkei:implement workflow sections present before Document Chain section
- References section lists plan-orchestrator.md
- Total SKILL.md growth under 100 lines

## Risk Assessment
- Line number drift if SKILL.md edited before implementation → mitigate by using content anchors not line numbers
- Auto-trigger Step 0 too verbose → mitigate by referencing plan-orchestrator.md for details
- Renumbering existing steps after inserting Step 0 → keep as Step 0 (no renumber needed)

## Security Considerations
- No sensitive data — skill definition file only

## Next Steps
- After both phases: test by running `/sekkei:plan basic-design` in a project with split mode enabled
