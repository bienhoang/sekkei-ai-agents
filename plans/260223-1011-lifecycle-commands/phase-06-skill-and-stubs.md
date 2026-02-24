# Phase 6: SKILL.md Sub-commands + install.sh Stubs

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Phases 2-5 (commands must exist first)

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: Add 3 new sub-commands to SKILL.md (`/sekkei:version`, `/sekkei:uninstall`, `/sekkei:update`) and add corresponding stubs to install.sh.

## Key Insights
- SKILL.md sub-commands are AI workflows — they instruct Claude to run CLI commands
- install.sh stubs use a `create_subcmd` function (line 123-135) — just add 3 more calls
- Update SKILL.md description frontmatter to include new commands
- Sub-command count increases from 20 to 23 — update health check expected count

## Requirements

### Functional
- `/sekkei:version` — Run `sekkei version` CLI, display output
- `/sekkei:uninstall` — Confirm with user → run `sekkei uninstall`
- `/sekkei:update` — Run `sekkei update`, report results
- install.sh creates stubs for all 3 new commands
- Health check expected sub-command count updated

### Non-functional
- SKILL.md sub-command descriptions match CLI behavior
- Stubs follow existing format exactly

## Related Code Files
- **Modify**: `sekkei/packages/skills/content/SKILL.md` (add 3 workflows)
- **Modify**: `sekkei/install.sh` (add 3 create_subcmd calls)
- **Modify**: `src/cli/commands/health-check.ts` (update expected count to 23)

## Implementation Steps

### SKILL.md Changes

1. Add to Sub-Commands list (after `/sekkei:preview`):
   ```
   - `/sekkei:version` — Show version and environment health check
   - `/sekkei:uninstall` — Remove Sekkei from Claude Code
   - `/sekkei:update` — Rebuild and re-install Sekkei skill + MCP
   ```

2. Add workflow sections before `## Document Chain`:

   **`/sekkei:version`**:
   ```
   1. Run CLI: `npx sekkei version` (or `node <path>/dist/cli/main.js version`)
   2. Display the health check output to the user
   3. If any items show ✗, suggest remediation steps
   ```

   **`/sekkei:uninstall`**:
   ```
   1. Confirm with user: "This will remove Sekkei skill, commands, and MCP entry from Claude Code. Proceed?"
   2. If confirmed: run `npx sekkei uninstall --force`
   3. Display removal summary
   4. Note: "Package remains installed. Run `npm uninstall -g sekkei-mcp-server` to fully remove."
   ```

   **`/sekkei:update`**:
   ```
   1. Run CLI: `npx sekkei update`
   2. Display build + copy progress
   3. Show post-update health check
   4. If health check passes: "Update complete. Restart Claude Code to activate."
   ```

3. Update frontmatter description to include new commands

### install.sh Changes

4. Add after line 153 (after `create_subcmd "preview" ...`):
   ```bash
   create_subcmd "version" "Show version and health check" ""
   create_subcmd "uninstall" "Remove Sekkei from Claude Code" "[--force]"
   create_subcmd "update" "Rebuild and re-install skill + MCP" "[--skip-build]"
   ```

5. Update count in `ok` message: "Created 20 sub-commands" → "Created 23 sub-commands"

### Health Check Update

6. Update expected sub-command count in `health-check.ts` from 20 to 23

## Todo List
- [ ] Add 3 sub-commands to SKILL.md Sub-Commands list
- [ ] Add 3 workflow sections to SKILL.md
- [ ] Update SKILL.md frontmatter description
- [ ] Add 3 create_subcmd calls to install.sh
- [ ] Update sub-command count in install.sh ok message
- [ ] Update expected count in health-check.ts

## Success Criteria
- `/sekkei:version`, `/sekkei:uninstall`, `/sekkei:update` appear in SKILL.md
- install.sh creates 23 stubs (no errors)
- Health check reports correct count

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| SKILL.md gets too long | Low | These are short workflows (3-4 steps each) |

## Next Steps
- Phase 7 verifies everything end-to-end
