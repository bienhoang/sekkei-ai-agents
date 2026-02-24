# Phase 01: MCP Server CLI Fixes

## Context Links
- Parent: [plan.md](plan.md)
- Brainstorm: [brainstorm-260224-0956-utility-flows-review.md](../reports/brainstorm-260224-0956-utility-flows-review.md)

## Overview
- **Priority**: P1 (Critical)
- **Status**: complete
- **Review**: complete
- Fix SUBCMD_DEFS sync, health check count, stale stub cleanup, uninstall note

## Key Insights
- SKILL.md lists 32 commands (31 in description + init in body)
- SUBCMD_DEFS has 27 entries — missing: `rfp`, `change`, `plan`, `implement`, `rebuild`
- EXPECTED_SUBCMD_COUNT hardcoded to 20, should be 32
- Rebuild doesn't clean stale stubs before regenerating → `test-spec.md` lingers
- Uninstall doesn't mention preview artifacts

## Requirements
- All 32 SKILL.md commands must have matching SUBCMD_DEFS entries
- Health check count must match SUBCMD_DEFS dynamically (export constant)
- Rebuild must rmSync stubs dir before regenerating
- Uninstall should print note about preview artifacts

## Architecture
No architectural changes. Pure data sync + defensive cleanup.

## Related Code Files
- **Modify**: `sekkei/packages/mcp-server/src/cli/commands/update.ts`
- **Modify**: `sekkei/packages/mcp-server/src/cli/commands/health-check.ts`
- **Modify**: `sekkei/packages/mcp-server/src/cli/commands/uninstall.ts`

## Implementation Steps

### Step 1: Add missing SUBCMD_DEFS entries (R1, R2)

In `update.ts`, add 5 entries to SUBCMD_DEFS array. Insert in logical order:

```typescript
// After "uninstall" (line 65), add:
["rfp", "Presales RFP lifecycle", "[@project-name]"],
["change", "Change request lifecycle", ""],
["plan", "Create generation plan for large documents", "@doc-type"],
["implement", "Execute a generation plan phase by phase", "@plan-path"],
["rebuild", "Rebuild and re-install Sekkei skill + MCP", "[--skip-build]"],
```

Result: 32 entries total.

### Step 2: Export SUBCMD_DEFS count for health-check (V1)

In `update.ts`, export the count:
```typescript
/** Number of expected sub-command stubs — used by health-check */
export const EXPECTED_SUBCMD_COUNT = SUBCMD_DEFS.length;
```

In `health-check.ts`:
- Remove hardcoded `const EXPECTED_SUBCMD_COUNT = 20;`
- Import: `import { EXPECTED_SUBCMD_COUNT } from "./update.js";`

### Step 3: Clean stale stubs before regenerating (R3)

In `update.ts` `run()` function, before step 3 (regenerate stubs), add:
```typescript
// Clean stale stubs before regenerating
if (existsSync(SUBCMD_DIR)) {
  rmSync(SUBCMD_DIR, { recursive: true, force: true });
}
```

Add `rmSync` to the import from `node:fs`.

### Step 4: Add preview artifact note to uninstall (U1)

In `uninstall.ts`, after the removal summary, add:
```typescript
process.stdout.write(
  "\nNote: If you used /sekkei:preview, manually remove .vitepress/ and node_modules symlink from your docs directory.\n"
);
```

### Step 5: Build & test

```bash
cd sekkei/packages/mcp-server
npm run build
npm test
```

## Todo List
- [x] Add 5 missing SUBCMD_DEFS entries (rfp, change, plan, implement, rebuild)
- [x] Export EXPECTED_SUBCMD_COUNT from update.ts
- [x] Import EXPECTED_SUBCMD_COUNT in health-check.ts (remove hardcode)
- [x] Add rmSync cleanup before stub regeneration
- [x] Add preview artifact note to uninstall output
- [x] Build passes
- [x] Tests pass

## Success Criteria
- `SUBCMD_DEFS.length === 32`
- Health check shows correct `32/32` after rebuild
- Stale stubs cleaned before new ones written
- `npm run build` and `npm test` pass

## Risk Assessment
- **Low**: Adding entries to SUBCMD_DEFS is additive, no existing behavior changes
- **Low**: Circular import risk if health-check imports from update — but update doesn't import from health-check at top level, only calls it in `run()`, so no cycle
- **Low**: rmSync before mkdirSync is safe — mkdirSync recreates immediately after

## Security Considerations
- No security impact — changes are local to CLI tool behavior

## Next Steps
- After phase 1: proceed to phase 2 (preview cleanup)
- After both phases: run `npx sekkei update` to sync installed stubs
