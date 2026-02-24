# Phase 5: Skill Flow Updates

## Context Links
- Plan orchestrator spec: `sekkei/packages/skills/content/references/plan-orchestrator.md`
- Utilities spec: `sekkei/packages/skills/content/references/utilities.md` lines 162-195
- Phase test spec: `sekkei/packages/skills/content/references/phase-test.md`
- Phase design spec: `sekkei/packages/skills/content/references/phase-design.md`

## Overview
- **Priority:** P2 (High)
- **Status:** Completed
- **Scope:** Update skill references to use new `manage_plan` tool instead of manual file I/O
- **Addresses:** P4 (test-spec auto-trigger), skill-backend integration

## Key Insights
- Skill references are instruction docs for Claude Code — they describe workflows
- Currently specs say "parse YAML", "scan dirs", "create files" — must change to "call manage_plan tool"
- Test-spec missing auto-trigger in `phase-test.md` — inconsistent with basic/detail design
- No code changes to MCP server in this phase — only markdown skill reference updates

## Requirements

### Update `utilities.md` — `/sekkei:plan` section (lines 162-176)

Replace manual file I/O steps with MCP tool calls:

**Before (current):**
- Steps 2-6 describe manual YAML parsing, dir creation, file writing

**After (updated):**
```
1. Determine doc-type from @doc-type argument
2. Call `manage_plan(action="detect", workspace_path, config_path, doc_type)` — check if plan needed
3. If detect returns has_active_plan=true: ask user to resume or create new
4. Survey Round 1 — Scope: Present features via AskUserQuestion (multiSelect)
5. Survey Round 2 — Detail: Per-feature AskUserQuestion (complexity, requirements, dependencies, instructions)
6. Call `manage_plan(action="create", workspace_path, config_path, doc_type, features=[...], survey_data={...})`
7. Display plan summary from create response
8. Report: "Plan created. Run /sekkei:implement @{plan_path} to execute."
```

### Update `utilities.md` — `/sekkei:implement` section (lines 178-195)

**After (updated):**
```
1. Call `manage_plan(action="status", workspace_path, plan_id)` — read plan
2. Validate status is pending or in_progress
3. For each phase in plan.phases where status != completed/skipped:
   a. Call `manage_plan(action="execute", workspace_path, config_path, plan_id, phase_number)`
   b. Display phase summary from response
   c. Ask user: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   d. If Proceed: call `generate_document(...)` with args from execute response → call `manage_plan(action="update", plan_id, phase_number, phase_status="completed")`
   e. If Skip: call `manage_plan(action="update", plan_id, phase_number, phase_status="skipped")`
   f. If Stop: save progress (already persisted), exit loop
4. After all phases: validation phase auto-runs via execute response
5. Display report from final plan status
```

### Update `plan-orchestrator.md` — §1 Auto-Trigger Detection

Replace manual scan logic with:
```
Call `manage_plan(action="detect", workspace_path, config_path, doc_type)`
Response: { should_trigger, reason, feature_count, has_active_plan }
```

### Update `plan-orchestrator.md` — §5 Implementation Execution

Replace manual file I/O with `execute` + `update` tool calls.

### Add test-spec auto-trigger to `phase-test.md` (P4)

Add auto-trigger block matching basic-design/detail-design pattern:

```markdown
### Split Mode Detection
Before generating test specs, check for split mode:
1. Call `manage_plan(action="detect", workspace_path, config_path, doc_type="test-spec")`
2. If should_trigger=true: prompt user "Detected {N} features in split mode. Create a test-spec generation plan first? [Y/n]"
3. If Y: run /sekkei:plan test-spec → /sekkei:implement @{plan-path}
4. If N: continue with normal generation
```

### Update `change-request-command.md` (minor)

Add `rollback` to the available actions list and resume routing table.

## Related Code Files

| Action | File |
|--------|------|
| Modify | `sekkei/packages/skills/content/references/utilities.md` |
| Modify | `sekkei/packages/skills/content/references/plan-orchestrator.md` |
| Modify | `sekkei/packages/skills/content/references/phase-test.md` |
| Modify | `sekkei/packages/skills/content/references/phase-design.md` (minor: reference manage_plan detect) |
| Modify | `sekkei/packages/skills/content/references/change-request-command.md` (add rollback) |

## Implementation Steps

1. Update `utilities.md` — rewrite `/sekkei:plan` section to use manage_plan tool calls
2. Update `utilities.md` — rewrite `/sekkei:implement` section to use manage_plan tool calls
3. Update `plan-orchestrator.md` §1 — replace manual scan with detect action
4. Update `plan-orchestrator.md` §5 — replace manual execution with execute/update actions
5. Add split mode detection block to `phase-test.md`
6. Update `phase-design.md` — reference detect action for auto-trigger
7. Update `change-request-command.md` — add rollback action

## Todo List
- [x] Update utilities.md /sekkei:plan section
- [x] Update utilities.md /sekkei:implement section
- [x] Update plan-orchestrator.md §1 (detect)
- [x] Update plan-orchestrator.md §5 (execute/update)
- [x] Add test-spec auto-trigger to phase-test.md
- [x] Update phase-design.md auto-trigger references
- [x] Update change-request-command.md (rollback)

## Success Criteria
- All skill references use `manage_plan` tool calls instead of manual file I/O
- No references to "parse YAML", "scan dirs", "create files" for plan operations
- Test-spec has auto-trigger block consistent with basic/detail design
- Change-request command docs include rollback action
- All doc types (basic-design, detail-design, test-spec) have consistent split-mode detection

## Risk Assessment
- **Skill reference correctness:** Updated instructions must match actual tool schema. Mitigate: cross-reference with Phase 2 schema.
- **Backward compatibility:** Existing users following old instructions. Mitigate: tool not yet released, so no backward compat needed.
