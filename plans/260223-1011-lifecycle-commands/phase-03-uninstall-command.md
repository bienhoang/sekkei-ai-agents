# Phase 3: Uninstall Command

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1 — Health Check](./phase-01-health-check-module.md)
- Reference: `sekkei/install.sh` (install logic to reverse)

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: Add `sekkei uninstall` CLI subcommand. Removes skill files, commands, and MCP entry from `~/.claude/`. Keeps build artifacts and Python venv.

## Key Insights
- Reverse of install.sh steps 3-4 (skill copy + MCP registration)
- Must confirm before deleting — interactive prompt
- `--force` flag to skip confirmation (for scripts)
- settings.json edit: remove `mcpServers.sekkei` key, preserve rest of file

## Requirements

### Functional
- Confirm prompt: "Remove Sekkei from Claude Code? (skills, commands, MCP) [y/N]"
- Remove `~/.claude/skills/sekkei/` directory (recursive)
- Remove `~/.claude/commands/sekkei.md` (symlink)
- Remove `~/.claude/commands/sekkei/` directory (recursive)
- Remove `sekkei` key from `~/.claude/settings.json` → `mcpServers`
- Print summary of what was removed
- Print: "Package remains. Run `npm uninstall -g sekkei-mcp-server` to fully remove."
- `--force` flag skips confirmation

### Non-functional
- Idempotent: already-removed items logged as "skipped" not errors
- Never touch files outside `~/.claude/`

## Architecture

```typescript
// src/cli/commands/uninstall.ts
export const uninstallCommand = defineCommand({
  meta: { name: "uninstall", description: "Remove Sekkei skill and MCP from Claude Code" },
  args: {
    force: { type: "boolean", description: "Skip confirmation prompt", default: false },
  },
  async run({ args }) { ... }
});
```

## Related Code Files
- **New**: `sekkei/packages/mcp-server/src/cli/commands/uninstall.ts`
- **Modify**: `sekkei/packages/mcp-server/src/cli/main.ts` (register)
- **Reference**: `sekkei/install.sh` lines 103-154 (what to reverse)
- **Reference**: `sekkei/install.sh` lines 156-183 (MCP JSON merge to reverse)

## Implementation Steps

1. Create `src/cli/commands/uninstall.ts`
2. Import `@clack/prompts` for confirm, `fs`, `os`, `path`
3. Define paths:
   - `CLAUDE_DIR = path.join(os.homedir(), ".claude")`
   - `SKILL_DIR = path.join(CLAUDE_DIR, "skills", "sekkei")`
   - `CMD_LINK = path.join(CLAUDE_DIR, "commands", "sekkei.md")`
   - `CMD_DIR = path.join(CLAUDE_DIR, "commands", "sekkei")`
   - `SETTINGS = path.join(CLAUDE_DIR, "settings.json")`
4. If not `--force`: confirm with `@clack/prompts`
5. Remove skill dir: `fs.rmSync(SKILL_DIR, { recursive: true, force: true })`
6. Remove command symlink: `fs.rmSync(CMD_LINK, { force: true })`
7. Remove command dir: `fs.rmSync(CMD_DIR, { recursive: true, force: true })`
8. Edit settings.json:
   - Read + JSON.parse
   - `delete settings.mcpServers?.sekkei`
   - Write back with `JSON.stringify(settings, null, 2)`
9. Print summary with ✓ for each removed item, "skipped" for already-gone
10. Register in `main.ts`

## Todo List
- [ ] Create uninstall.ts with defineCommand
- [ ] Implement confirmation prompt (skip with --force)
- [ ] Remove skill directory
- [ ] Remove command symlink + directory
- [ ] Remove MCP entry from settings.json
- [ ] Print summary + npm uninstall hint
- [ ] Register in main.ts

## Success Criteria
- `sekkei uninstall` prompts then removes all 4 targets
- `sekkei uninstall --force` skips prompt
- Running twice is safe (idempotent)
- settings.json remains valid JSON after edit
- Other mcpServers entries untouched

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Deletes wrong directory | High | Hardcode exact paths, never use user input in paths |
| settings.json corruption | Medium | Read → parse → modify → write atomically. Backup before edit. |
| Symlink vs file mismatch | Low | `fs.rmSync` with `force: true` handles both |

## Security Considerations
- Only touches `~/.claude/` paths — hardcoded, not user-supplied
- settings.json: parse + reconstruct, no eval or string replacement

## Next Steps
- Phase 6 adds `/sekkei:uninstall` SKILL.md sub-command
