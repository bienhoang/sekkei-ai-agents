# Phase 4: Update Command

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1 — Health Check](./phase-01-health-check-module.md)
- Reference: `sekkei/install.sh` (re-copy logic)

## Overview
- **Priority**: Medium
- **Status**: pending
- **Description**: Add `sekkei update` CLI subcommand. Rebuilds MCP server and re-copies skill files to `~/.claude/`.

## Key Insights
- Primary flow: npm update → build → re-copy skills → re-register MCP
- Re-copy skill logic mirrors install.sh step 3 (lines 103-154)
- Sub-command stubs should be regenerated to catch new commands
- After update, show version + health check summary

## Requirements

### Functional
- Run `npm run build` in package directory
- Re-copy `packages/skills/content/` → `~/.claude/skills/sekkei/`
- Re-create sub-command stubs in `~/.claude/commands/sekkei/`
- Update MCP entry in `~/.claude/settings.json` (paths may change)
- Print new version + health check summary
- `--skip-build` flag to skip npm build (just re-copy)

### Non-functional
- Show progress spinners for each step
- Non-destructive: preserve user customizations in settings.json (only update sekkei entry)

## Architecture

```typescript
// src/cli/commands/update.ts
export const updateCommand = defineCommand({
  meta: { name: "update", description: "Rebuild and re-install Sekkei skill + MCP" },
  args: {
    skipBuild: { type: "boolean", description: "Skip npm build step", default: false },
  },
  async run({ args }) { ... }
});
```

Steps in run():
1. Resolve package root via `import.meta.url`
2. If !skipBuild: `execSync("npm run build", { cwd: mpcDir, stdio: "inherit" })`
3. Copy skill files (fs.cpSync)
4. Regenerate sub-command stubs
5. Update settings.json MCP entry
6. Run `checkHealth()` → `formatHealthReport()`

## Related Code Files
- **New**: `sekkei/packages/mcp-server/src/cli/commands/update.ts`
- **Modify**: `sekkei/packages/mcp-server/src/cli/main.ts` (register)
- **Uses**: `src/cli/commands/health-check.ts` (Phase 1)
- **Reference**: `sekkei/install.sh` lines 69-84 (build), 103-154 (copy + stubs), 156-183 (MCP)

## Implementation Steps

1. Create `src/cli/commands/update.ts`
2. Import `execSync`, `fs`, `os`, `path`, `@clack/prompts` (spinner)
3. Resolve paths from `import.meta.url`:
   - `PKG_ROOT` = mcp-server package root
   - `SKILL_SRC` = `../../packages/skills/content/` relative to mcp-server
   - `TEMPLATES_DIR`, `PYTHON_DIR`, `MCP_ENTRY` same as install.sh
4. Build step: `execSync("npm run build", { cwd: PKG_ROOT, stdio: "inherit" })`
5. Copy skills: `fs.cpSync(SKILL_SRC, SKILL_DEST, { recursive: true })`
6. Re-create sub-command stubs (extract helper function for reuse with install.sh):
   - Same list of 20 sub-commands as install.sh + 3 new (version, uninstall, update)
   - Write stub `.md` files to `~/.claude/commands/sekkei/`
7. Symlink SKILL.md → `~/.claude/commands/sekkei.md`
8. Update MCP entry in settings.json (same JSON merge as install.sh)
9. Run `checkHealth()` → print `formatHealthReport()`
10. Register in `main.ts`

## Todo List
- [ ] Create update.ts with defineCommand
- [ ] Implement build step with spinner
- [ ] Implement skill file copy
- [ ] Implement sub-command stub regeneration
- [ ] Implement MCP entry update in settings.json
- [ ] Show post-update health check
- [ ] Register in main.ts

## Success Criteria
- `sekkei update` rebuilds + re-copies + shows health check
- `sekkei update --skip-build` skips build, still re-copies
- New sub-commands automatically appear after update
- settings.json preserved except sekkei MCP entry

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Build fails mid-update | Medium | Build first, only proceed to copy if build succeeds |
| Skill source path wrong | Medium | Resolve relative to import.meta.url, verify exists before copy |
| Stale dist/ after update | Low | Always rebuild unless --skip-build |

## Security Considerations
- `execSync` for npm build only — no user input in command string
- File copy uses resolved paths, no user input

## Next Steps
- Phase 6 adds `/sekkei:update` SKILL.md sub-command
