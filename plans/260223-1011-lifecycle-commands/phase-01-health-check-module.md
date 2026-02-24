# Phase 1: Shared Health Check Module

## Context Links
- Parent: [plan.md](./plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260223-1011-lifecycle-commands.md)
- Reference: `sekkei/install.sh` (verification section lines 220-238)

## Overview
- **Priority**: High (foundation for phases 2-5)
- **Status**: pending
- **Description**: Create shared health check module that detects environment status (Node, Python, Playwright, MCP, skills). Returns structured data reusable by version, init, and update commands.

## Key Insights
- install.sh already has verification logic (lines 220-238) — port to TypeScript
- Health checks must work regardless of install method (npm global, npx, local dev)
- Playwright detection: check `npx playwright --version` or cache dir existence
- MCP registration: parse `~/.claude/settings.json` → check `mcpServers.sekkei`
- Sub-command count: glob `~/.claude/commands/sekkei/*.md`

## Requirements

### Functional
- Detect Node.js version (≥20 = pass)
- Detect Python3 availability + version
- Detect Playwright chromium installation
- Check template directory exists + has files
- Check `sekkei.config.yaml` in CWD (optional, not an error if missing)
- Check Python venv exists + has required packages
- Check `~/.claude/skills/sekkei/` exists
- Check `~/.claude/settings.json` has sekkei MCP entry
- Count sub-commands in `~/.claude/commands/sekkei/`

### Non-functional
- All checks must be non-throwing (catch errors, return status)
- Each check ≤ 2s timeout (prevent hanging on missing binaries)
- Return structured `HealthReport` object, not formatted strings

## Architecture

```typescript
// src/cli/commands/health-check.ts

interface HealthItem {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string; // e.g. "v20.10.0" or "not found"
}

interface HealthReport {
  version: string;           // from package.json
  environment: HealthItem[]; // Node, Python, Playwright
  paths: HealthItem[];       // templates, config, venv
  claudeCode: HealthItem[];  // skill, MCP, commands
}

export function checkHealth(): Promise<HealthReport>;
export function formatHealthReport(report: HealthReport): string;
```

## Related Code Files
- **New**: `sekkei/packages/mcp-server/src/cli/commands/health-check.ts`
- **Reference**: `sekkei/install.sh` lines 42-67 (prerequisites), 220-238 (verify)
- **Reference**: `sekkei/packages/mcp-server/package.json` (version source)

## Implementation Steps

1. Create `src/cli/commands/health-check.ts`
2. Define `HealthItem`, `HealthReport` interfaces
3. Implement `getPackageVersion()` — read version from package.json using `import.meta.url` to resolve path
4. Implement `checkNodeVersion()` — `process.version`, parse major ≥ 20
5. Implement `checkPython()` — `execFileSync("python3", ["--version"])` with try/catch
6. Implement `checkPlaywright()` — check `~/.cache/ms-playwright/chromium-*` existence (macOS/Linux) or try `npx playwright --version`
7. Implement `checkTemplatedir()` — resolve from `import.meta.url` → `../../templates/`, check `ja/` has `.md` files
8. Implement `checkConfig()` — check `sekkei.config.yaml` in `process.cwd()`
9. Implement `checkPythonVenv()` — check `python/.venv/bin/python3` exists relative to package root
10. Implement `checkClaudeSkill()` — check `~/.claude/skills/sekkei/SKILL.md` exists
11. Implement `checkMcpRegistration()` — parse `~/.claude/settings.json`, check `mcpServers.sekkei`
12. Implement `checkSubCommands()` — glob `~/.claude/commands/sekkei/*.md`, count vs expected (20)
13. Compose `checkHealth()` — run all checks, build `HealthReport`
14. Implement `formatHealthReport()` — format with ✓/✗/⚠ indicators, grouped sections

## Todo List
- [ ] Create health-check.ts with interfaces
- [ ] Implement environment checks (Node, Python, Playwright)
- [ ] Implement path checks (templates, config, venv)
- [ ] Implement Claude Code checks (skill, MCP, commands)
- [ ] Implement formatHealthReport() with colored output
- [ ] Export checkHealth + formatHealthReport

## Success Criteria
- `checkHealth()` returns complete `HealthReport` with all 9 checks
- Each check handles missing binaries/files gracefully (no throws)
- `formatHealthReport()` produces readable CLI output with ✓/✗/⚠
- Module compiles with `tsc --noEmit`

## Risk Assessment
| Risk | Severity | Mitigation |
|------|----------|------------|
| Playwright path differs per OS | Medium | Check common paths: `~/.cache/ms-playwright/` (Linux/macOS) |
| execFileSync hangs | Low | Set timeout: 3000ms |
| settings.json malformed | Low | JSON.parse in try/catch |

## Security Considerations
- Read-only operations only — no file modifications
- No command injection — use `execFileSync` not `execSync`
- Validate file paths before reading

## Next Steps
- Phase 2 uses `checkHealth()` for version command
- Phase 5 uses `checkHealth()` for post-init verification
