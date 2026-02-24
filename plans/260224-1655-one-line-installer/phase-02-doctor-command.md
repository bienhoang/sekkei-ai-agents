---
title: "Phase 02 — sekkei doctor CLI Subcommand"
status: completed
effort: 1h
---

## Overview

- **Priority:** P1 (blocking Phase 3 — setup.sh runs `sekkei doctor`)
- New `doctor` subcommand in the citty CLI that wraps `health-check.ts`
- Adds: per-item fix suggestions, overall pass/fail banner, exit code 1 on failures
- `version` command keeps its existing health output unchanged

## Requirements

- New file: `packages/mcp-server/src/cli/commands/doctor.ts`
- Registered in `main.ts` subCommands as `doctor`
- Reuses `checkHealth()` + `formatHealthReport()` from `health-check.ts`
- Enhances output with fix suggestions table (no duplication — suggestions are additive)
- Exit code 0 if all items are `ok` or `warn`; exit code 1 if any `fail`
- Supports `--json` flag (same as version command) for scripting
- Supports `--fix` flag stub (prints suggestions only, no auto-fix in this iteration)

## Related Code Files

**Create:**
- `packages/mcp-server/src/cli/commands/doctor.ts`

**Modify:**
- `packages/mcp-server/src/cli/main.ts` — add `doctor` import + subCommands entry
- `install.sh` — no change needed (uses local script, not `sekkei doctor`)

## Fix Suggestions Map

| Check name | status=fail suggestion | status=warn suggestion |
|-----------|----------------------|----------------------|
| Node.js | Install Node.js 20+ from nodejs.org | — |
| Python | Install Python 3.9+ (optional, needed for Excel/PDF export) | same |
| Playwright | Run: `npx playwright install chromium` (optional, for PDF export) | same |
| Templates | Re-run installer: `~/.sekkei/install.sh` | — |
| Config | Run `sekkei init` in your project folder | — |
| Python venv | Run: `cd ~/.sekkei/packages/mcp-server && python3 -m venv python/.venv && python/.venv/bin/pip install -r python/requirements.txt` | — |
| Skill | Re-run installer: `~/.sekkei/install.sh` | — |
| MCP Server | Re-run installer: `~/.sekkei/install.sh`, then restart Claude Code | — |
| Commands | Run: `sekkei update` | — |

## Implementation Steps

1. Create `doctor.ts`:
   ```ts
   import { defineCommand } from "citty";
   import { checkHealth, formatHealthReport, HealthItem } from "./health-check.js";

   const FIX_SUGGESTIONS: Record<string, { fail?: string; warn?: string }> = { ... };

   function formatSuggestions(items: HealthItem[]): string { ... }

   export const doctorCommand = defineCommand({
     meta: { name: "doctor", description: "Check installation health and show fix suggestions" },
     args: {
       json: { type: "boolean", description: "Output as JSON", default: false },
     },
     async run({ args }) {
       const report = await checkHealth();
       const allItems = [...report.environment, ...report.paths, ...report.claudeCode];
       const failures = allItems.filter(i => i.status === "fail");

       if (args.json) {
         process.stdout.write(JSON.stringify({ ...report, ok: failures.length === 0 }, null, 2) + "\n");
       } else {
         process.stdout.write(formatHealthReport(report));
         process.stdout.write(formatSuggestions(allItems));
         const banner = failures.length === 0
           ? "\nAll checks passed.\n"
           : `\n${failures.length} check(s) failed. See suggestions above.\n`;
         process.stdout.write(banner);
       }

       if (failures.length > 0) process.exit(1);
     },
   });
   ```

2. In `main.ts` add:
   ```ts
   import { doctorCommand } from "./commands/doctor.js";
   // in subCommands:
   doctor: doctorCommand,
   ```

3. Run `npm run build` — confirm no errors.

4. Smoke test: `node dist/cli/main.js doctor` — verify output and exit code.

## Success Criteria

- `sekkei doctor` prints health report + suggestions + banner
- Exits 1 when any item is `fail`, 0 otherwise
- `sekkei doctor --json` outputs valid JSON with `ok` boolean
- `sekkei --help` lists `doctor` in subcommands
- Build passes, no new type errors
