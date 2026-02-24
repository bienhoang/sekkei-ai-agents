# Phase 5: Update SKILL.md + References

## Context
- Parent: [plan.md](./plan.md)
- Depends on: Phases 2–3 (flag working)

## Overview
- **Priority:** Low
- **Status:** complete
- **Description:** Update skill documentation to reflect new `--guide` flag

## Related Code Files
- **Modify:** `packages/skills/content/SKILL.md`
- **Modify:** `packages/mcp-server/adapters/claude-code/SKILL.md`
- **Modify:** `packages/skills/content/references/utilities.md`

## Implementation Steps

### SKILL.md (both copies)
1. Update command list — add `--guide` to preview description:
   ```
   - `/sekkei:preview` — Start VitePress docs preview server
   - `/sekkei:preview --guide` — Preview user guide documentation
   ```

### utilities.md — `/sekkei:preview` section (line 171+)
1. Add `--guide` flag to commands list:
   ```
   - `npx sekkei-preview --guide` — open user guide
   - `npx sekkei-preview --guide --edit` — open user guide with WYSIWYG editing
   - `npx sekkei-preview --guide --port 3001` — custom port for user guide
   ```
2. Add note: "Without `--guide`, preview serves V-model spec docs from `sekkei-docs/`."

## Todo
- [x] Update `packages/skills/content/SKILL.md` preview entry
- [x] Update `packages/mcp-server/adapters/claude-code/SKILL.md` preview section
- [x] Update `packages/skills/content/references/utilities.md` preview section

## Success Criteria
- `/sekkei:preview --guide` documented in all 3 skill files
- Usage examples include --guide flag
- Existing preview docs unchanged for default mode
