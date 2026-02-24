# Phase 2: Version Command

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1 — Health Check](./phase-01-health-check-module.md)

## Overview
- **Priority**: High
- **Status**: pending
- **Description**: Add `sekkei version` CLI subcommand showing version + full health check output with ✓/✗ indicators.

## Key Insights
- citty supports `meta.version` but we need richer output than default `--version`
- Follow existing command pattern from `status.ts`: defineCommand + meta + args + run()
- Output to stdout (not stderr — this is a user-facing CLI command, not MCP server)

## Requirements

### Functional
- `sekkei version` prints version + grouped health check
- `sekkei version --json` outputs raw JSON (for scripting)
- Exit code 0 if all checks pass, 1 if any fail

### Non-functional
- Fast: health check completes in <5s total

## Architecture

```
sekkei version

sekkei v1.0.0

Environment:
  Node.js:      v20.10.0  ✓
  Python:        3.11.5   ✓
  Playwright:    chromium  ✓

Paths:
  Templates:     /path/to/templates/  ✓
  Config:        ./sekkei.config.yaml  ✗ (not found)
  Python venv:   /path/to/python/.venv/  ✓

Claude Code:
  Skill:         ~/.claude/skills/sekkei/  ✓
  MCP Server:    registered  ✓
  Commands:      20/20  ✓
```

## Related Code Files
- **New**: `sekkei/packages/mcp-server/src/cli/commands/version.ts`
- **Modify**: `sekkei/packages/mcp-server/src/cli/main.ts` (register subcommand)
- **Uses**: `src/cli/commands/health-check.ts` (Phase 1)
- **Pattern**: `src/cli/commands/status.ts` (citty command pattern)

## Implementation Steps

1. Create `src/cli/commands/version.ts`
2. Import `checkHealth`, `formatHealthReport` from `./health-check.js`
3. Define `versionCommand` with citty `defineCommand`:
   - meta: `{ name: "version", description: "Show version and environment health check" }`
   - args: `{ json: { type: "boolean", description: "Output as JSON", default: false } }`
4. In `run()`:
   - Call `checkHealth()`
   - If `--json`: `JSON.stringify(report, null, 2)` to stdout
   - Else: `formatHealthReport(report)` to stdout
   - Exit 1 if any item has `status: "fail"`
5. Modify `main.ts`:
   - Import `versionCommand` from `./commands/version.js`
   - Add to `subCommands`: `version: versionCommand`

## Todo List
- [ ] Create version.ts with defineCommand
- [ ] Implement --json flag for scripted usage
- [ ] Register in main.ts subCommands
- [ ] Verify `sekkei version` output format

## Success Criteria
- `sekkei version` shows formatted health report
- `sekkei version --json` outputs valid JSON
- Exit code reflects health status
- Compiles without errors

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| citty conflicts with built-in --version | Low | Named as subcommand, not flag — no conflict |

## Next Steps
- Phase 6 adds `/sekkei:version` SKILL.md sub-command
