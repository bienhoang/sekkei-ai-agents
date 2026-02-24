# Phase 01: RFP State Machine Library

## Context
- Parent: [plan.md](./plan.md)
- Source: [rfp-manager.md](../../sekkei/packages/skills/content/references/rfp-manager.md) — current prompt-based state logic
- Pattern: Follow existing lib/ modules (e.g., `glossary-native.ts`, `manifest-manager.ts`)

## Overview
- **Priority:** P1 (blocks Phase 02)
- **Status:** ✅ Complete
- **Description:** Extract deterministic state management from rfp-manager.md into a TypeScript library

## Key Insights
- 8-phase state machine with directed transitions (not arbitrary)
- File write rules are per-file (append-only vs rewrite vs checklist)
- Recovery logic reconstructs phase from file existence — deterministic, perfect for code
- Status file uses YAML frontmatter in 00_status.md

## Requirements
- Phase enum with 8 states
- Transition map: which phases can transition to which
- File write rules: enforce append-only (01, 04, 07), rewrite (02, 03, 05), checklist (06)
- Status file parser/writer (YAML in 00_status.md)
- Workspace creation (7 files with initial content)
- Phase recovery from file inventory
- Flow-to-file mapping (which flow reads/writes which files)

## Architecture

```
rfp-state-machine.ts
├── RFP_PHASES (enum)
├── TRANSITIONS (Map<Phase, Phase[]>)
├── FILE_RULES (Map<filename, "append" | "rewrite" | "checklist">)
├── WORKSPACE_FILES (list of 7 filenames)
├── FLOW_FILE_MAP (flow → {reads: string[], writes: string[]})
├── validateTransition(from, to) → boolean
├── createWorkspace(basePath, projectName) → void
├── readStatus(workspacePath) → RfpStatus
├── writeStatus(workspacePath, status) → void
├── writeFile(workspacePath, filename, content, mode) → void
├── recoverPhase(workspacePath) → Phase
└── getFileInventory(workspacePath) → FileInventory
```

## Related Code Files
- **Create:** `sekkei/packages/mcp-server/src/lib/rfp-state-machine.ts`
- **Modify:** `sekkei/packages/mcp-server/src/types/documents.ts` — add RFP types

## Implementation Steps

1. Add RFP types to `types/documents.ts`:
   ```typescript
   export const RFP_PHASES = [
     "RFP_RECEIVED", "ANALYZING", "QNA_GENERATION", "WAITING_CLIENT",
     "DRAFTING", "CLIENT_ANSWERED", "PROPOSAL_UPDATE", "SCOPE_FREEZE"
   ] as const;
   export type RfpPhase = (typeof RFP_PHASES)[number];
   ```

2. Create `lib/rfp-state-machine.ts` with:
   - `ALLOWED_TRANSITIONS` map (from rfp-manager.md phase enum)
   - `FILE_WRITE_RULES` map (from rfp-manager.md file write rules table)
   - `WORKSPACE_FILES` array (00 through 07)
   - `FLOW_FILE_MAP` (from rfp-manager.md flow-to-file mapping table)

3. Implement `createWorkspace(basePath, projectName)`:
   - Create dir `{basePath}/sekkei-docs/rfp/{projectName}/`
   - Write 7 empty template files
   - Write `00_status.md` with initial YAML (phase: RFP_RECEIVED)

4. Implement `readStatus(workspacePath)`:
   - Read `00_status.md`, parse YAML frontmatter
   - Return `RfpStatus` object (project, phase, last_update, next_action, blocking_issues, assumptions)

5. Implement `writeStatus(workspacePath, status)`:
   - Serialize RfpStatus to YAML, write to `00_status.md`

6. Implement `validateTransition(from, to)`:
   - Check `ALLOWED_TRANSITIONS[from].includes(to)`
   - Return boolean

7. Implement `writeFile(workspacePath, filename, content)`:
   - Check `FILE_WRITE_RULES[filename]`
   - If append-only: read existing, append content
   - If rewrite: overwrite entirely
   - If checklist: merge checklist fields (never remove)

8. Implement `recoverPhase(workspacePath)`:
   - Check which files exist
   - Apply priority ordering (06 > 05+04 > 05 > 03 > 02 > 01)
   - Return reconstructed phase

9. Implement `getFileInventory(workspacePath)`:
   - List all files, return existence map + sizes

## Todo List
- [ ] Add RFP types to documents.ts
- [ ] Create rfp-state-machine.ts skeleton
- [ ] Implement ALLOWED_TRANSITIONS map
- [ ] Implement FILE_WRITE_RULES map
- [ ] Implement createWorkspace()
- [ ] Implement readStatus() / writeStatus()
- [ ] Implement validateTransition()
- [ ] Implement writeFile() with rule enforcement
- [ ] Implement recoverPhase()
- [ ] Implement getFileInventory()
- [ ] Verify `npm run lint` passes

## Success Criteria
- All 8 phases defined as const enum
- All valid transitions encoded (no invalid transitions possible)
- File write rules enforced programmatically
- Recovery logic deterministic (same files → same phase)
- Under 200 LOC

## Risk Assessment
- **YAML parsing:** Use existing `yaml` package (already in deps)
- **File system ops:** Use `fs/promises` for async I/O
- **Path safety:** Validate project names (kebab-case only, no path traversal)

## Security Considerations
- Project name validation: `/^[a-z0-9][a-z0-9-]*$/` (prevent path traversal)
- Workspace path must be under project root (containment check)

## Next Steps
→ Phase 02 uses this library in the MCP tool handler
