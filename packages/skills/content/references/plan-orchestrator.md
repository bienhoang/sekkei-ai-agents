> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# Plan Orchestrator Reference

Orchestration logic for `sekkei:plan` and `sekkei:implement` sub-commands.

## §1 Auto-Trigger Detection

Call MCP tool `manage_plan(action="detect", workspace_path, config_path, doc_type)`.

Response shape: `{ should_trigger: bool, reason: string, feature_count: N, has_active_plan: bool, plan_path?: string }`

- If `should_trigger=false` → continue with normal generation flow
- If `should_trigger=true` and `has_active_plan=true` → ask user: "An active plan exists for {doc-type}. Resume it or start fresh? [Resume / Create New / Skip Plan]"
  - If Resume → report `plan_path` → run `/sekkei:implement @{plan_path}`
  - If Create New → run `/sekkei:plan {doc-type}` → run `/sekkei:implement @{returned-plan-path}`
  - If Skip Plan → continue with normal generation flow
- If `should_trigger=true` and `has_active_plan=false` → prompt user:
  > "Detected {feature_count} features in split mode. Create a generation plan first? [Y/n]"
  - If Y → run `/sekkei:plan {doc-type}` → run `/sekkei:implement @{returned-plan-path}`
  - If N → continue with normal generation flow

**Trigger conditions evaluated by detect action** (for reference):
1. Doc-type is one of: `basic-design`, `detail-design`, `test-spec`
2. `sekkei.config.yaml` has `split.{doc-type}` section enabled
3. Feature count (大分類 in `functions-list.md`) >= 3
4. No active plan exists for this doc-type (when `has_active_plan=false`)

## §2 Survey Flow

Two-round interview to scope the generation plan.

### Round 1 — Scope Selection

1. Parse `functions-list.md` → extract all 大分類 groups with IDs
2. Present via `AskUserQuestion` (multiSelect):
   - Question: "Select features to include in this generation plan:"
   - Options: each 大分類 with its feature ID and function count
3. After selection → ask for priority order (drag-rank or numbered list)

### Round 2 — Per-Feature Detail

For each selected feature, ask via `AskUserQuestion`:

| Field | Type | Options |
|-------|------|---------|
| Complexity | single-select | simple / medium / complex |
| Special requirements | free-text | constraints, business rules |
| External dependencies | free-text | APIs, services, data sources |
| Custom instructions | free-text | generation hints for AI |

Skip Round 2 for features where user selects "Use defaults" (complexity=medium, no special requirements).

## §3 Plan Generation

### Directory Structure

```
workspace-docs/plans/YYYYMMDD-{doc-type}-generation/
├── plan.md
├── phase-01-shared-sections.md    (if doc-type has shared)
├── phase-02-{feature-id}.md
├── phase-03-{feature-id}.md
├── ...
└── phase-final-validation.md
```

### plan.md YAML Frontmatter

```yaml
---
title: "{Doc-Type} Generation Plan"
doc_type: "{doc-type}"
status: pending          # pending → in_progress → completed
features: [{id, name, complexity, priority}]
feature_count: N
split_mode: true
created: "YYYY-MM-DD"
phases:
  - {number: 1, name: "Shared Sections", status: pending, file: "phase-01-shared-sections.md"}  # omit for test-spec (no shared phase)
  - {number: 2, name: "{Feature Name}", status: pending, file: "phase-02-{feature-id}.md"}
  # ...
  - {number: N, name: "Validation", status: pending, file: "phase-final-validation.md"}
---
```

### plan.md Body

```markdown
# {Doc-Type} Generation Plan

## Overview
- **Doc type:** {doc-type}
- **Features:** {count} selected
- **Split mode:** enabled
- **Created:** {date}

## Phases

| # | Phase | Feature | Status | File |
|---|-------|---------|--------|------|
| 1 | Shared Sections | — | Pending | [phase-01](./phase-01-shared-sections.md) |
| 2 | {Feature Name} | {ID} | Pending | [phase-02](./phase-02-{feature-id}.md) |
| ... | | | | |
| N | Validation | — | Pending | [phase-final](./phase-final-validation.md) |

## Dependencies
- functions-list.md (upstream)
- requirements.md (upstream)
- sekkei.config.yaml (split config)
```

## §4 Phase Mapping Templates

### basic-design

| Phase | Type | Scope | Sekkei Command |
|-------|------|-------|----------------|
| 01 | shared | system-architecture, database-design, external-interface, non-functional-design, technology-rationale | `/sekkei:basic-design` with `scope: "shared"` |
| 02..N | per-feature | basic-design.md + screen-design.md | `/sekkei:basic-design` with `scope: "feature", feature_id: "{ID}"` |
| final | validation | all generated files | `/sekkei:validate` with manifest |

### detail-design

| Phase | Type | Scope | Sekkei Command |
|-------|------|-------|----------------|
| 01 | shared | system-architecture, database-design | `/sekkei:detail-design` with `scope: "shared"` |
| 02..N | per-feature | module-design, class-design, api-detail, processing-flow | `/sekkei:detail-design` with `scope: "feature", feature_id: "{ID}"` |
| final | validation | all generated files | `/sekkei:validate` with manifest |

### test-spec

| Phase | Type | Scope | Sekkei Command |
|-------|------|-------|----------------|
| 01..N | per-feature | unit-test, integration-test, system-test, acceptance-test | `/sekkei:test-spec` with `scope: "feature", feature_id: "{ID}"` |
| final | validation | traceability matrix | `/sekkei:validate` with manifest |

Note: test-spec has NO shared phase — all phases are per-feature.

### Phase File Template

```markdown
---
phase: {number}
name: "{Phase Name}"
type: shared | per-feature | validation
feature_id: "{ID}"          # omit for shared/validation
status: pending
---

# Phase {number}: {Phase Name}

## Generation Command
`/sekkei:{doc-type}` with scope params from §4 mapping table above.

## Scope
- Sections: {list from split config}
- Feature: {ID} — {name} (if per-feature)
- Survey data: complexity={val}, requirements={val}

## TODO
- [ ] Generate document
- [ ] Review output
- [ ] Validate cross-references

## Success Criteria
- All sections present per template
- Cross-reference IDs valid (F-xxx, REQ-xxx, etc.)
- No placeholder content
```

## §5 Implementation Execution

### Execution Flow

1. Call `manage_plan(action="status", workspace_path, plan_id)` → validate `status` is `pending` or `in_progress`
2. **Per-phase loop** — for each phase where `status != "completed"` and `status != "skipped"`:
   a. Call `manage_plan(action="execute", workspace_path, config_path, plan_id, phase_number)` → returns phase summary + `generate_document` args
   b. Display phase summary (name, type, scope, feature)
   c. Ask: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   d. **Proceed:** call `generate_document(...)` with args from execute response → call `manage_plan(action="update", workspace_path, plan_id, phase_number, phase_status="completed")`
   e. **Skip:** call `manage_plan(action="update", workspace_path, plan_id, phase_number, phase_status="skipped")`
   f. **Stop:** exit loop (progress persisted by prior update calls)
3. After all phases: final execute response triggers `/sekkei:validate` on manifest automatically
4. Call `manage_plan(action="status", workspace_path, plan_id)` → display final report (phases completed/skipped/remaining, files generated, validation results)

### Delegation Mapping

| Phase Type | `execute` Response Key | Downstream Call |
|------------|------------------------|----------------|
| shared | `generate_args` with `scope: "shared"` | `generate_document(...)` |
| per-feature | `generate_args` with `scope: "feature", feature_id` + survey data | `generate_document(...)` |
| validation | `validate_args` with manifest path | `validate_document(...)` |

### Progress Tracking

Progress is persisted server-side via `manage_plan(action="update")` after each phase. No manual file writes needed — `execute` and `update` calls maintain plan state atomically.
