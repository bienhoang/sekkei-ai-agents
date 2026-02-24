---
title: "Phase 01 — Rename sekkei-docs → workspace-docs (Configurable)"
status: pending
effort: 1.5h
---

## Overview

- **Priority:** P1 (blocking Phase 3)
- Replace all hardcoded `"sekkei-docs"` strings with a shared constant `DEFAULT_WORKSPACE_DIR`
- All runtime lookups read config's `output.directory` first, fall back to constant
- Backward compat: existing `sekkei-docs/` directories still discovered if config omitted

## Requirements

- New file: `packages/mcp-server/src/lib/constants.ts` exports `DEFAULT_WORKSPACE_DIR = "workspace-docs"`
- All TS source files import constant instead of using string literal
- Skill markdown files (`SKILL.md`, adapters, references) updated to show `workspace-docs`
- `resolve-docs-dir.ts` convention fallback updated to `workspace-docs`
- No config schema changes — `output.directory` already exists

## Related Code Files

**Create:**
- `packages/mcp-server/src/lib/constants.ts`

**Modify — TypeScript source:**
- `packages/mcp-server/src/lib/cr-state-machine.ts` line 37
- `packages/mcp-server/src/lib/rfp-state-machine.ts` lines 120, 441
- `packages/mcp-server/src/lib/changelog-manager.ts` line 71
- `packages/mcp-server/src/lib/plan-state.ts` lines 16, 264, 274
- `packages/mcp-server/src/tools/plan-actions.ts` lines 250, 362, 388
- `packages/mcp-server/src/tools/cr-propagation-actions.ts` line 79
- `packages/mcp-server/src/tools/rfp-workspace.ts` line 20 (Zod description only)

**Modify — Preview package:**
- `packages/preview/src/resolve-docs-dir.ts` line 25 (convention fallback) + error message line 49

**Modify — Skill/adapter markdown:**
- `packages/skills/content/SKILL.md`
- `packages/skills/content/references/rfp-manager.md`
- `packages/skills/content/references/utilities.md`
- `packages/skills/content/references/rfp-command.md`
- `packages/skills/content/references/plan-orchestrator.md`
- `packages/mcp-server/adapters/claude-code/SKILL.md`

## Implementation Steps

1. Create `packages/mcp-server/src/lib/constants.ts`:
   ```ts
   export const DEFAULT_WORKSPACE_DIR = "workspace-docs";
   ```

2. For each TS source file: add import `{ DEFAULT_WORKSPACE_DIR } from "./constants.js"` (adjust relative path), replace `"sekkei-docs"` literal with `DEFAULT_WORKSPACE_DIR`.

3. For files that resolve workspace at runtime (e.g., `plan-state.ts:getPlanDir`, `changelog-manager.ts`), use pattern:
   ```ts
   const workspaceDir = configOutputDir ?? DEFAULT_WORKSPACE_DIR;
   join(basePath, workspaceDir, ...)
   ```
   Where `configOutputDir` comes from caller context or `sekkei.config.yaml` read. If the function already receives `basePath` only (no config), keep simple constant substitution — callers already resolved the config before calling.

4. Update `resolve-docs-dir.ts`: change `join(cwd, 'sekkei-docs')` → `join(cwd, DEFAULT_WORKSPACE_DIR)`. Update error message to mention `workspace-docs`.

5. Global string replace in all `.md` skill/adapter files: `sekkei-docs` → `workspace-docs`.

6. Run `npm run build` in `packages/mcp-server/` — confirm zero type errors.

7. Run `npm test` — confirm existing tests pass.

## Success Criteria

- `grep -r '"sekkei-docs"' packages/mcp-server/src/` returns zero results
- `npm run build` passes
- `npm test` passes
- `grep -c 'workspace-docs' packages/skills/content/SKILL.md` > 0

## Risk

- Tests that assert paths containing `"sekkei-docs"` will fail → grep test fixtures first with `grep -r "sekkei-docs" packages/mcp-server/tests/`
- `rfp-state-machine.ts:441` is a YAML template string (`directory: ./sekkei-docs`) — update to `workspace-docs` in the emitted config sample
