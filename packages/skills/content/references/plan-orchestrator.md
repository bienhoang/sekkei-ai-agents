# Plan Orchestrator Reference

Orchestration logic for `sekkei:plan` and `sekkei:implement` sub-commands.

## §1 Auto-Trigger Detection

**Trigger conditions** (ALL must be true):
1. Doc-type is one of: `basic-design`, `detail-design`, `test-spec`
2. `sekkei.config.yaml` has `split.{doc-type}` section enabled
3. Feature count (大分類 in `functions-list.md`) >= 3
4. No active plan exists for this doc-type

**Plan discovery:** Scan `sekkei-docs/plans/` for dirs matching `*-{doc-type}-generation/plan.md`. If found with `status: pending` or `status: in_progress` → active plan exists.

**User prompt when triggered:**
> "Detected {N} features in split mode. Create a generation plan first? [Y/n]"
- If Y → run `/sekkei:plan {doc-type}` → run `/sekkei:implement @{returned-plan-path}`
- If N → continue with normal generation flow

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
sekkei-docs/plans/YYYYMMDD-{doc-type}-generation/
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

1. Read `plan.md` → parse YAML → validate `status` is `pending` or `in_progress`
2. Update plan status to `in_progress`
3. Glob `phase-*.md` files → sort by phase number → build execution queue
4. **Per-phase loop:**
   a. Read phase file → display summary (name, type, scope, feature)
   b. Ask: "Proceed with Phase {N}: {name}? [Proceed / Skip / Stop]"
   c. **Proceed:** delegate to sekkei sub-command per §4 mapping → mark TODOs done → update plan.md phase status to `completed`
   d. **Skip:** mark phase status as `skipped`, continue next
   e. **Stop:** save progress, exit loop
5. After all phases: run `/sekkei:validate` on manifest
6. Update plan.md status to `completed`
7. Report: phases completed/skipped/remaining, files generated, validation results

### Delegation Mapping

| Phase Type | Command | Key Args |
|------------|---------|----------|
| shared | `/sekkei:{doc-type}` | `scope: "shared"` |
| per-feature | `/sekkei:{doc-type}` | `scope: "feature", feature_id: "{ID}"`, survey data as input |
| validation | `/sekkei:validate` | manifest path |

### Progress Tracking

After each phase completes:
1. Check off `- [ ]` → `- [x]` in phase file TODOs
2. Update phase status in `plan.md` frontmatter: `pending` → `completed`
3. Update phases table in plan.md body: `Pending` → `Complete`
