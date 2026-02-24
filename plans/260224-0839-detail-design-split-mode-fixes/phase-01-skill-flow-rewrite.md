# Phase 1: Rewrite Detail-Design Skill Flow

**Parent:** [plan.md](./plan.md)
**Brainstorm:** [brainstorm report](../reports/brainstorm-260224-0839-detail-design-split-mode-review.md)
**Reference pattern:** basic-design split flow at `phase-design.md:6-91`

## Overview

- **Priority:** P1
- **Status:** Complete
- **Covers:** BUG-1, BUG-2, BUG-3, BUG-5, BUG-6, IMP-1, IMP-2, IMP-3

## Key Insights

- basic-design split flow is correctly implemented — use as exact pattern
- `loadChainDocs()` already supports `system_output` + `features_output` for detail-design
- Prerequisite check needs 3-tier logic: chain status → feature scan → monolithic fallback
- Per-feature upstream must include: shared/ + feature basic-design + feature screen-design + global context

## Related Code Files

**Modify:**
1. `sekkei/packages/skills/content/references/phase-design.md` — lines 128-189 (primary)
2. `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md` — lines 224-285 (mirror)

**Reference (read-only):**
- `sekkei/packages/skills/content/references/phase-design.md` — lines 6-91 (basic-design pattern)
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — lines 152-169 (loadChainDocs split logic)

## Implementation Steps

### Step 1: Rewrite prerequisite check (BUG-1, IMP-2)

Replace `phase-design.md` lines 130-137 with unified 3-tier check:

```markdown
**Prerequisite check (MUST run before interview):**
1. Check basic-design exists (3-tier check):
   a. If `sekkei.config.yaml` exists → check `chain.basic_design.status == "complete"` (preferred)
   b. Else if split config active → check at least one `{output.directory}/features/*/basic-design.md` exists
   c. Else → check `{output.directory}/03-system/basic-design.md` exists
   - If ALL checks fail → ABORT: "Basic design not found. Run `/sekkei:basic-design` first."
2. **Load upstream (mode-aware):**
   a. Read `sekkei.config.yaml` → check `split.detail-design` exists
   b. **If split mode:**
      - Read ALL `{output.directory}/shared/*.md` → shared_content
      - Read `{output.directory}/02-requirements/requirements.md` → req_content (if exists)
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - global_upstream = shared_content + "\n\n" + req_content + "\n\n" + fl_content
      - (Per-feature upstream assembled in §4 below)
   c. **If monolithic:**
      - Read `{output.directory}/03-system/basic-design.md` → bd_content
      - Read `{output.directory}/02-requirements/requirements.md` → req_content (if exists)
      - Read `{output.directory}/04-functions-list/functions-list.md` → fl_content (if exists)
      - upstream_content = bd_content + "\n\n" + req_content + "\n\n" + fl_content
```

### Step 2: Rewrite split mode §4 (BUG-2, BUG-3, BUG-6, IMP-1)

Replace `phase-design.md` lines 155-165 with per-feature upstream assembly:

```markdown
4. **If split enabled:**
   a. Read `functions-list.md` → extract feature groups (大分類)
   b. Create output directories: `shared/`, `features/{feature-id}/`
   c. For each shared section in `split.detail-design.shared` config:
      - Call `generate_document` with `doc_type: "detail-design"`, `scope: "shared"`, `upstream_content: global_upstream`
      - Save to `shared/{section-name}.md`
   d. For each feature from functions-list:
      i. **Assemble per-feature upstream:**
         - Read `features/{feature-id}/basic-design.md` → feature_bd
         - Read `features/{feature-id}/screen-design.md` → feature_scr (if exists)
         - feature_upstream = global_upstream + "\n\n" + feature_bd + "\n\n" + feature_scr
      ii. Generate feature detail-design:
         - Call `generate_document(doc_type: "detail-design", scope: "feature", feature_id: "{ID}", language: from config, input_content: {feature_input}, upstream_content: feature_upstream)`
         - Save output to `features/{feature-id}/detail-design.md`
      iii. Update `_index.yaml` manifest entry
   e. Create/update `_index.yaml` manifest via manifest-manager
```

### Step 3: Rewrite chain status update (BUG-5)

Replace `phase-design.md` lines 181-182 with split-aware chain status:

```markdown
6. Call MCP tool `update_chain_status` with `config_path`, `doc_type: "detail_design"`:
   - **If split mode:** `status: "complete"`, `system_output: "03-system/"`, `features_output: "05-features/"`
   - **If monolithic:** `status: "complete"`, `output: "03-system/detail-design.md"`
```

### Step 4: Mirror changes to adapter SKILL.md

Copy the exact same changes to `adapters/claude-code/SKILL.md` lines 224-285.

**Note:** `packages/skills/content/SKILL.md` (164 lines) only references `phase-design.md` — no detailed workflow to mirror. Only the adapter SKILL.md (826 lines) has the full inline workflow.

## Todo

- [x] Rewrite prerequisite check in phase-design.md (BUG-1, IMP-2)
- [x] Rewrite upstream loading in phase-design.md (BUG-2, BUG-6)
- [x] Rewrite split §4 with per-feature upstream (BUG-3, IMP-1)
- [x] Add shared sections config reference (IMP-3)
- [x] Rewrite chain status update (BUG-5)
- [x] Mirror all changes to adapter SKILL.md

## Success Criteria

- Prerequisite check passes in split mode when features/*/basic-design.md exist
- Each feature gets focused upstream (shared + own basic-design + own screen-design)
- Chain status correctly records system_output + features_output
- Monolithic flow unchanged
- Adapter SKILL.md matches phase-design.md exactly

## Risk Assessment

- **LOW:** Skill files are AI instructions (markdown), not code. Changes are directive, not executable.
- **LOW:** Monolithic flow (§5) unchanged — regression risk minimal.
