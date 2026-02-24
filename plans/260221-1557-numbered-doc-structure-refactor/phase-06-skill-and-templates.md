# Phase 06 — SKILL.md & Templates

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-02-skill-and-templates.md](./research/researcher-02-skill-and-templates.md) §1 (hardcoded paths), §5 (all paths needing updates)
- Depends on: [Phase 01](./phase-01-config-and-types.md), [Phase 02](./phase-02-init-scaffold.md), [Phase 03](./phase-03-generate-path-routing.md)
- Files to modify:
  - `sekkei/mcp-server/adapters/claude-code/SKILL.md`
  - `sekkei/templates/ja/basic-design.md` (split mode comment only — may already done in Phase 3)

## Overview

- **Date:** 2026-02-21
- **Priority:** P1
- **Status:** ✅ complete
- **Effort:** 1.5h
- **Description:** Update all sub-command output paths in SKILL.md from flat `./sekkei-docs/` to numbered structure paths. Add the `overview` sub-command. Update `validate` and `status` sub-commands to use new options. Ensure all path references read `output.directory` from `sekkei.config.yaml` dynamically rather than hardcoding `sekkei-docs/`.
- **Completed:** 2026-02-21

## Key Insights

- SKILL.md has 12 sub-commands. Every one that writes a file has a hardcoded `./sekkei-docs/` path. These must all change to `{output.directory}/NN-...` pattern where `{output.directory}` is read from `sekkei.config.yaml`.
- The SKILL layer must read `sekkei.config.yaml` at the start of every sub-command (step: "If `sekkei.config.yaml` exists, load project metadata") — this already happens for `functions-list`, `requirements`, `basic-design`. The loaded config provides `output.directory` and `features[]` for path resolution.
- `basic-design` workflow is the most complex: it must route shared sections → `03-system/` and feature sections → `05-features/{name}/`. Each shared section becomes its own file. The SKILL layer must iterate the sections list.
- `detail-design` and `test-spec` are always per-feature in the new structure — no shared split for detail-design (the spec puts system-wide concerns in `03-system/`). `test-spec` global strategy goes to `08-test/`.
- The `validate` sub-command gains a `--structure` flag for structural validation.
- Command files in `.claude/commands/sekkei/` are thin delegation wrappers — no changes needed there. All logic is in SKILL.md.
- `export` and `translate` path resolution: these operate on existing files. The SKILL layer should read the manifest (`_index.yaml`) to discover file paths rather than hardcoding them. For single-file docs (01, 02, 04, 10), path comes from `chain.{entry}.output` in config.

## Requirements

### Functional
- `init` sub-command: covered in Phase 2 — verify no conflicts
- `overview` sub-command added (new): generates `01-overview.md`
- `functions-list` saves to `{output.directory}/04-functions-list.md`
- `requirements` saves to `{output.directory}/02-requirements.md`
- `basic-design` (shared scope): generates each section as separate file in `03-system/`
- `basic-design` (feature scope): saves to `05-features/{name}/basic-design.md`, then regenerates that feature's `index.md`
- `detail-design` saves to `05-features/{name}/detail-design.md`, regenerates `index.md`
- `test-spec` (global): saves strategy to `08-test/`; (feature scope): saves to `05-features/{name}/test-spec.md`
- `validate --structure {dir}` calls `validate_document` with `structure_path`
- `status` reads new config schema (overview, glossary, features table)
- `export` resolves path from config `chain.{entry}.output` or manifest
- `translate` resolves source path from config
- `glossary` saves to `{output.directory}/10-glossary.md` (was `sekkei-docs/glossary.yaml`)

### Non-functional
- SKILL.md must stay readable — clear numbered steps, no prose bloat
- Each sub-command workflow max ~15 steps
- All path examples use `{output.directory}` placeholder, not hardcoded `docs/` or `sekkei-docs/`

## Architecture

```
SKILL.md sub-command routing:
  All sub-commands:
    Step 1: Load sekkei.config.yaml → get output.directory + features[]

  overview:      generate → save {output.directory}/01-overview.md
  requirements:  generate → save {output.directory}/02-requirements.md
  basic-design:
    if shared:   generate each section → save {output.directory}/03-system/{section}.md
    if feature:  generate → save {output.directory}/05-features/{name}/basic-design.md
                          → regenerate {output.directory}/05-features/{name}/index.md
  functions-list: generate → save {output.directory}/04-functions-list.md
  detail-design:  generate → save {output.directory}/05-features/{name}/detail-design.md
                           → regenerate {output.directory}/05-features/{name}/index.md
  test-spec:
    global:      generate → save {output.directory}/08-test/strategy.md
    feature:     generate → save {output.directory}/05-features/{name}/test-spec.md
                          → regenerate {output.directory}/05-features/{name}/index.md
  validate:
    --structure: validate_document { structure_path: {output.directory} }
    else:        validate_document { content, doc_type, manifest_path }
  glossary:      manage_glossary → save {output.directory}/10-glossary.md
```

## Related Code Files

| File | Action | Notes |
|------|--------|-------|
| `sekkei/mcp-server/adapters/claude-code/SKILL.md` | Modify | All sub-command sections — full rewrite of path references |
| `sekkei/templates/ja/basic-design.md` | Modify | Split mode comment (may be done in Phase 3) |

## Implementation Steps

### Step 1 — Add `/sekkei:overview` sub-command to SKILL.md

Insert after `/sekkei:init` section:

```markdown
### `/sekkei:overview @input`

1. Read the input (RFP, project brief, or free-text description)
2. Load `sekkei.config.yaml` — get `output.directory` and `project.name`
3. Call MCP tool `generate_document` with `doc_type: "overview"` and input content
4. Use returned template + instructions to generate the プロジェクト概要 document
5. Follow these rules:
   - 5 sections: プロジェクト概要, ビジネス目標, システムスコープ, ステークホルダー, アーキテクチャ概要
   - Include Mermaid C4 context diagram in section 5
   - Must NOT contain requirements or design decisions
6. Save output to `{output.directory}/01-overview.md`
7. Update `sekkei.config.yaml`: `chain.overview.status: complete`, `chain.overview.output: "01-overview.md"`
```

### Step 2 — Update `/sekkei:functions-list` save path (step 6)

```markdown
6. Save output to `{output.directory}/04-functions-list.md`
7. Update `sekkei.config.yaml`: `chain.functions_list.status: complete`, `chain.functions_list.output: "04-functions-list.md"`
```

### Step 3 — Update `/sekkei:requirements` save path (step 6)

```markdown
6. Save output to `{output.directory}/02-requirements.md`
7. Update `sekkei.config.yaml`: `chain.requirements.status: complete`, `chain.requirements.output: "02-requirements.md"`
```

### Step 4 — Rewrite `/sekkei:basic-design` (step 6 + new routing logic)

```markdown
**Additional interview questions:**
- Generating shared system design or a specific feature? (shared / feature)
- If feature: which feature? (select from `features[]` in config)

6. Route by scope:

   **If scope = shared (03-system/):**
   Generate shared sections as separate files:
   - `03-system/system-architecture.md` — overall architecture + Mermaid diagram
   - `03-system/database-design.md` — ER diagram + table definitions (TBL-xxx IDs)
   - `03-system/external-interface.md` — external system interface specs (API-xxx IDs)
   - `03-system/non-functional-design.md` — NFRs: performance, security, availability
   - `03-system/technology-rationale.md` — technology selection rationale
   For each file: call `generate_document` with `doc_type: "basic-design", scope: "shared"`.
   Update `03-system/index.md` table to reflect all generated files.
   Update config: `chain.basic_design.status: in-progress, system_output: "03-system/"`

   **If scope = feature:**
   Ask: which feature? → get `name` and `display` from `features[]` in config.
   Call `generate_document` with `doc_type: "basic-design", scope: "feature", feature_name: {name}`.
   Save to `{output.directory}/05-features/{name}/basic-design.md`.
   Regenerate `{output.directory}/05-features/{name}/index.md`:
     - Update status row for `basic-design.md` to ✅
   Update config: `chain.basic_design.features_output: "05-features/"`
```

### Step 5 — Update `/sekkei:detail-design` (step 6)

```markdown
**Additional interview questions:**
- Which feature? (select from `features[]` in config)

6. Ask which feature → get `name` from config `features[]`
   Call `generate_document` with `doc_type: "detail-design", scope: "feature", feature_name: {name}`
   Save to `{output.directory}/05-features/{name}/detail-design.md`
   Regenerate `{output.directory}/05-features/{name}/index.md` — update detail-design.md row to ✅
   Update config: `chain.detail_design.status: complete` (or `in-progress` if more features remain)
               `chain.detail_design.features_output: "05-features/"`
```

### Step 6 — Update `/sekkei:test-spec` (step 6)

```markdown
**Additional interview questions:**
- Global test strategy or feature-specific test cases? (global / feature)
- If feature: which feature?

6. Route by scope:

   **If scope = global (08-test/):**
   Generate global test strategy document.
   Save to `{output.directory}/08-test/strategy.md`
   Update `08-test/index.md` to link strategy.md.
   Update config: `chain.test_spec.global_output: "08-test/"`

   **If scope = feature:**
   Ask which feature → get `name` from config `features[]`
   Call `generate_document` with `doc_type: "test-spec", scope: "feature", feature_name: {name}`
   Save to `{output.directory}/05-features/{name}/test-spec.md`
   Regenerate `{output.directory}/05-features/{name}/index.md` — update test-spec.md row to ✅
   Update config: `chain.test_spec.features_output: "05-features/"`
```

### Step 7 — Update `/sekkei:validate` to support `--structure`

```markdown
### `/sekkei:validate [@doc | --structure]`

**If `--structure` flag or no doc provided:**
1. Load `sekkei.config.yaml` — get `output.directory`
2. Call MCP tool `validate_document` with `structure_path: {output.directory}`
3. Display structural validation results (missing files, non-kebab folders, missing index.md)
4. Suggest fixes for each issue

**If `@doc` provided (content validation — existing behavior):**
1–6. [unchanged from current workflow]
```

### Step 8 — Update `/sekkei:glossary` path

```markdown
1. Locate `{output.directory}/10-glossary.md` (create if not exists — was `sekkei-docs/glossary.yaml`)
   Note: glossary is now Markdown, not YAML. The `manage_glossary` MCP tool handles both formats.
```

### Step 9 — Update `/sekkei:export` path resolution

```markdown
3. Resolve source path:
   - Load `sekkei.config.yaml`
   - For single-file docs: use `chain.{doc_type}.output` (e.g., `02-requirements.md`)
   - For split docs: locate `_index.yaml` in `{output.directory}/` and pass `manifest_path` to export tool
   Set output path: `{output.directory}/{doc-type}.{format}`
```

### Step 10 — Update `/sekkei:translate` path resolution

```markdown
2. Resolve source path from `sekkei.config.yaml` chain entry (same as export)
6. Save translated output to `{output.directory}/{doc-type}.{target_lang}.md`
```

### Step 11 — Update Document Chain diagram in SKILL.md footer

```markdown
## Document Chain

```
RFP → /sekkei:overview → /sekkei:functions-list → /sekkei:requirements
     → /sekkei:basic-design (shared) → /sekkei:basic-design (per feature)
     → /sekkei:detail-design (per feature) → /sekkei:test-spec
```

Output structure:
```
{output.directory}/
  01-overview.md           ← /sekkei:overview
  02-requirements.md       ← /sekkei:requirements
  03-system/               ← /sekkei:basic-design --shared
  04-functions-list.md     ← /sekkei:functions-list
  05-features/{name}/      ← /sekkei:basic-design, detail-design, test-spec
  06-data/                 ← /sekkei:migration-design
  07-operations/           ← /sekkei:operation-design
  08-test/                 ← /sekkei:test-spec --global
  09-ui/                   ← (manual or future sub-command)
  10-glossary.md           ← /sekkei:glossary
```
```

## Todo

- [ ] Add `/sekkei:overview` sub-command section to SKILL.md
- [ ] Update `/sekkei:functions-list` step 6-7 paths
- [ ] Update `/sekkei:requirements` step 6-7 paths
- [ ] Rewrite `/sekkei:basic-design` step 6 with shared/feature routing
- [ ] Update `/sekkei:detail-design` step 6 with feature routing + index.md regeneration
- [ ] Update `/sekkei:test-spec` step 6 with global/feature routing
- [ ] Update `/sekkei:validate` to support `--structure` flag
- [ ] Update `/sekkei:glossary` path from `glossary.yaml` to `10-glossary.md`
- [ ] Update `/sekkei:export` path resolution from config
- [ ] Update `/sekkei:translate` path resolution from config
- [ ] Update Document Chain diagram at SKILL.md footer
- [ ] Confirm `basic-design.md` split mode comment updated (Phase 3 check)

## Success Criteria

- SKILL.md contains `/sekkei:overview` sub-command with correct path `01-overview.md`
- All sub-commands reference `{output.directory}/NN-...` paths, zero references to `sekkei-docs/`
- `/sekkei:basic-design` workflow clearly splits into shared (03-system/) and feature (05-features/) routing
- Feature sub-commands include step to regenerate `index.md`
- `/sekkei:validate --structure` workflow described
- Document Chain diagram reflects 10-section numbered output

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| SKILL.md line count grows beyond manageable (currently ~217 lines) | Medium | Keep each sub-command to ≤15 steps; ruthlessly cut prose |
| `basic-design` shared routing generates 5 separate MCP tool calls — slow | Low | This is the correct behavior; document that shared generation takes multiple calls |
| `10-glossary.md` format change (YAML → Markdown) may break `manage_glossary` tool | Medium | Check `glossary.ts` tool to see if it supports Markdown format; note in todo if not |
| Command files have hardcoded user-local SKILL.md absolute path | Low | Pre-existing issue, out of scope for this refactor |

## Security Considerations

- Path references in SKILL.md are instructions to Claude, not executable code — no direct security risk
- `{output.directory}` is read from `sekkei.config.yaml` which is user-controlled; SKILL layer must not pass it to shell commands without sanitization (existing concern, not new)

## Next Steps

- Phase 7 (Tests) does not test SKILL.md directly (it is a prompt file), but tests the MCP tools that SKILL.md calls
- After all phases complete: manual end-to-end test of `/sekkei:init` → `/sekkei:overview` → `/sekkei:functions-list` chain
