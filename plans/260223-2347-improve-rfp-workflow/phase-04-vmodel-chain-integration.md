# Phase 4 — V-Model Chain Integration

## Context Links

- Chain handoff: `sekkei/packages/skills/content/references/rfp-manager.md` (SEKKEI CHAIN HANDOFF section)
- Config type: `sekkei/packages/mcp-server/src/types/documents.ts` (ProjectConfig)
- Chain status tool: `sekkei/packages/mcp-server/src/tools/chain-status.ts`
- Config example: `sekkei/sekkei.config.example.yaml`
- Structure validator: `sekkei/packages/mcp-server/src/lib/structure-validator.ts`

## Overview

- **Priority:** P2
- **Status:** complete
- **Description:** Strengthen handoff from RFP scope freeze to downstream V-model chain with auto-config generation, traceability seeding, and structured proposal output

## Key Insights

1. **Handoff is a text prompt, not structured data.** Current: "Ready for `/sekkei:functions-list`. Input: `05_proposal.md`." No machine-readable handoff.
2. **No auto-config generation.** After scope freeze, user must manually create `sekkei.config.yaml`. The RFP analysis already has project type, stack hints, feature list — should auto-generate config.
3. **Proposal output isn't optimized for downstream consumption.** `/sekkei:functions-list` needs structured feature list, but `05_proposal.md` has prose. Need a parseable section.
4. **No traceability seed.** V-model chain uses cross-reference IDs (F-xxx, REQ-xxx). RFP analysis could seed initial feature IDs for continuity.
5. **`02_analysis.md` system type classification maps to `project.type` config.** Currently lost at handoff.

## Requirements

### Functional

- FR1: Add `generate-config` action to `manage_rfp_workspace` — auto-generates `sekkei.config.yaml` from RFP analysis
- FR2: Add structured "Feature Seed" section to Flow 5 proposal template with parseable feature table
- FR3: Add "Traceability Seed" section to Flow 6 freeze template — initial F-xxx IDs for detected features
- FR4: Map system type from analysis to `project.type` enum in generated config
- FR5: On scope freeze with HIGH/MEDIUM confidence, auto-generate config and report next steps

### Non-Functional

- NF1: Generated config is a starting point, not final — user must review/edit
- NF2: Feature seed uses same `FeatureConfig` format as existing config
- NF3: Config generation is idempotent (regenerating overwrites cleanly)

## Architecture

### Config Generation Flow

```
06_scope_freeze.md (confidence: HIGH/MEDIUM)
  + 02_analysis.md (system type, complexity)
  + 05_proposal.md (features, stack, phases)
  ↓
generate-config action
  ↓
sekkei.config.yaml (in workspace parent dir)
  ↓
Ready for /sekkei:functions-list
```

### Feature Seed Table (in proposal template)

```markdown
## Feature Seed

| ID | Name | Display | Priority | Complexity |
|----|------|---------|----------|------------|
| SAL | sales-management | 販売管理 | P1 | M |
| INV | inventory-management | 在庫管理 | P2 | L |
```

This table is parseable by downstream tools and maps directly to `features[]` in config.

### Auto-Generated Config Shape

```yaml
# Auto-generated from RFP analysis. Review and edit before proceeding.
project:
  name: "{project-name}"
  type: "{detected-type}"   # from analysis system type
  stack: []                  # user fills
  team_size: 0               # user fills
  language: ja
  keigo: 丁寧語

output:
  directory: ./sekkei-docs

chain:
  rfp: "01-rfp/{project-name}/05_proposal.md"
  functions_list: { status: pending }
  requirements: { status: pending }
  # ... full chain with pending status

features:
  # From proposal feature seed table
  - id: SAL
    name: sales-management
    display: "販売管理"
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/tools/rfp-workspace.ts` — add `generate-config` action |
| Modify | `src/lib/rfp-state-machine.ts` — add config generation helper |
| Modify | `src/types/documents.ts` — add `generate-config` to RFP_ACTIONS |
| Modify | `templates/rfp/flow-proposal.md` — add Feature Seed section |
| Modify | `templates/rfp/flow-freeze.md` — add Traceability Seed, auto-config prompt |
| Modify | `skills/content/references/rfp-command.md` — update SCOPE_FREEZE handoff |
| Modify | `skills/content/references/rfp-manager.md` — document generate-config action |

## Implementation Steps

1. Add `"generate-config"` to `RFP_ACTIONS` in `rfp-workspace.ts`
2. Create `generateConfigFromWorkspace(wsPath)` in `rfp-state-machine.ts`:
   - Read `02_analysis.md` for system type
   - Read `05_proposal.md` for features and scope
   - Map system type string -> `ProjectType` enum value
   - Extract feature table if present
   - Generate YAML string from template
3. Add handler in `rfp-workspace.ts` for `generate-config`:
   - Call `generateConfigFromWorkspace()`
   - Write to `{workspace_path}/sekkei.config.yaml`
   - Return generated config path
4. Update `flow-proposal.md`: add "Feature Seed" section with table format
5. Update `flow-freeze.md`: add "Traceability Seed" with initial F-xxx IDs
6. Update `flow-freeze.md`: add instruction to call `generate-config` on HIGH/MEDIUM confidence
7. Update `rfp-command.md` SCOPE_FREEZE handoff prompt:
   - Show generated config path
   - List detected features
   - Prompt: "Review config, then run `/sekkei:functions-list`"
8. Update `rfp-manager.md` with `generate-config` action docs

## Todo List

- [x] Add generate-config action to RFP_ACTIONS
- [x] Implement generateConfigFromWorkspace helper
- [x] Add generate-config handler to rfp-workspace.ts
- [x] Add Feature Seed section to flow-proposal.md
- [x] Add Traceability Seed to flow-freeze.md
- [x] Update SCOPE_FREEZE handoff in rfp-command.md
- [x] Document generate-config in rfp-manager.md
- [x] System type -> ProjectType mapping table

## Success Criteria

- After scope freeze, `sekkei.config.yaml` auto-generated with correct project type
- Generated config has features from proposal's Feature Seed table
- Chain status (`rfp` entry) points to `05_proposal.md`
- User can run `/sekkei:functions-list` immediately after reviewing config
- Generated config validates against existing Zod config schema

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| System type detection inaccurate | Medium | Map conservatively; always mark as "review required" |
| Feature extraction from prose unreliable | Medium | Require structured Feature Seed table format |
| Config overwrites user edits | Low | Only generate if file doesn't exist; prompt otherwise |

## Security Considerations

- Config generation reads only workspace files (no external I/O)
- Generated config has no secrets (API keys, credentials)
- Path containment enforced by existing workspace_path validation

## Next Steps

- Phase 5 tests the generate-config action
- Downstream: `/sekkei:functions-list` consumes generated config
