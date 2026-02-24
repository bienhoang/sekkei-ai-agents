---
title: "Phase 5: Generation Enhancements"
status: complete
priority: P3
effort: 1.5h
covers: [P3.1, P4.3]
created: 2026-02-24
completed: 2026-02-24
---

# Phase 5: Generation Enhancements

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-02-plan-cr-staleness.md](./research/researcher-02-plan-cr-staleness.md)
- Blocked by: none (independent)
- Blocks: Phase 6 (tests validate auto-validate flag behavior)

## Overview

- **Date:** 2026-02-24
- **Description:** Add optional post-generation auto-validate advisory (config flag `autoValidate`); add underscore→hyphen config key migration so YAML config written with old snake_case keys works with the current hyphen-based code.
- **Priority:** P3 (quality improvements, not critical bugs)
- **Implementation status:** pending
- **Review status:** pending

## Key Insights

From researcher-02:

**Auto-validate (P3.1):**
- `handleGenerateDocument` success path returns at lines 431–433. Insertion point is ~line 430, after the changelog append block (lines 413–429) and after the git auto-commit block (lines 401–411).
- The hook is non-blocking: wrap in try/catch, append advisory text to `finalOutput` if warnings found, swallow errors silently (generation already succeeded).
- `checkDocStaleness` exists in `lib/doc-staleness.ts` — usable as advisory. Alternatively, call `validateDocument` handler directly. Per KISS, use staleness check (simpler, no circular tool invocation) for first pass.
- Config flag: `autoValidate: true` in `sekkei.config.yaml` → add to `ProjectConfig` type in `types/documents.ts`.
- `ProjectConfig` is read from YAML in generate.ts via `parseYaml`. The flag is optional — undefined = disabled.

**Underscore/hyphen migration (P4.3):**
- `CHAIN_DISPLAY_ORDER` uses `snake_case` keys (`functions_list`, `basic_design`, etc.) matching YAML config.
- Code uses hyphen doc-types (`functions-list`, `basic-design`). Mapping exists in chain-status.ts via `replace(/_/g, "-")` at line 108.
- `config-migrator.ts` already exists for migration logic. Add a `migrateConfigKeys` function that:
  1. Reads existing `sekkei.config.yaml`
  2. For each `chain` entry: if key contains underscore, write a hyphen-equivalent entry if not already present
  3. Does NOT remove old keys (backward compat during transition)
- This is a migration utility, not auto-run on server start. Expose as a CLI command or call from `manage_plan` tool if `migrate_config` action added.
- Per YAGNI: implement the migration function only; wire it to an existing extension point (e.g., add `"migrate_config"` as a `manage_plan` action). Do NOT add a new MCP tool.

## Requirements

### Functional

**Auto-validate:**
- `ProjectConfig` type gains `autoValidate?: boolean`
- In `handleGenerateDocument`, after changelog append: if `config_path` provided and loaded config has `autoValidate: true`, call `checkDocStaleness(config_path, doc_type)` in a try/catch
- If staleness warnings returned, append a `\n\n---\n**Staleness Advisory:**\n{warnings}` block to `finalOutput`
- Non-blocking: any error in the advisory check is logged to stderr and ignored

**Config migration:**
- `config-migrator.ts` gains `migrateConfigKeys(configPath: string): Promise<MigrationResult>` function
- Scans `chain` section of YAML; for each underscore key (e.g., `functions_list`), adds hyphen equivalent (`functions-list`) if absent, copying the entry
- Returns `{ migrated: string[], skipped: string[] }` summary
- New CLI command `sekkei migrate` (in `src/cli/commands/migrate.ts`) calls `migrateConfigKeys` and prints summary
- Migration function returns `{ migrated, skipped, warnings }` — warnings include comment-loss advisory
<!-- Updated: Validation Session 1 - Moved migration from manage_plan action to CLI command per user decision -->

### Non-Functional
- Auto-validate advisory is appended as plain text — no new JSON fields in MCP response shape
- Migration is idempotent: running twice produces same result
- Migration preserves all existing YAML content (comments may be lost due to yaml.stringify round-trip — acceptable, document in changelog)

## Architecture

```
generate.ts
  handleGenerateDocument()
    ...existing logic...
    changelog append block
    [NEW] if autoValidate: try { advisory = checkDocStaleness(...) } catch {}
    return finalOutput + advisory

types/documents.ts
  ProjectConfig
    autoValidate?: boolean   ← new optional field

lib/config-migrator.ts
  migrateConfigKeys(configPath)  ← new function (returns warnings about comment loss)

cli/commands/migrate.ts  ← NEW file
  migrateCommand()  ← calls migrateConfigKeys, prints results + warnings
```

## Related Code Files

### Modify
- `packages/mcp-server/src/types/documents.ts` — add `autoValidate?: boolean` to `ProjectConfig`
- `packages/mcp-server/src/tools/generate.ts` — add auto-validate advisory block before return
- `packages/mcp-server/src/lib/config-migrator.ts` — add `migrateConfigKeys` function
- `packages/mcp-server/src/cli/commands/migrate.ts` — NEW: `sekkei migrate` CLI command
- `packages/mcp-server/src/cli/main.ts` — register `migrate` subcommand

### Create
- none

## Implementation Steps

### Step 1 — Add autoValidate to ProjectConfig (types/documents.ts)

Locate `ProjectConfig` interface. Add:
```typescript
autoValidate?: boolean;   // if true, append staleness advisory after generation
```

### Step 2 — Add auto-validate hook in generate.ts

After reading the generate.ts success path (confirm lines ~401–433), add before the final `return`:

```typescript
// Advisory staleness check — non-blocking
if (config_path && projectConfig?.autoValidate) {
  try {
    const { checkDocStaleness } = await import("../lib/doc-staleness.js");
    const stale = await checkDocStaleness(config_path, doc_type);
    if (stale && stale.length > 0) {
      const advisory = stale.map(w => `- ${w}`).join("\n");
      finalOutput += `\n\n---\n**Staleness Advisory (自動チェック):**\n${advisory}`;
    }
  } catch (e) {
    logger.warn({ err: e }, "auto-validate staleness check failed");
  }
}
```

Verify: `checkDocStaleness` signature — confirm it accepts `(configPath, docType)` and returns `string[]` or similar. If the return type differs, adapt accordingly.

### Step 3 — Verify projectConfig parsing in generate.ts

Check that `projectConfig` is already parsed from `config_path`. If generate.ts uses a local variable like `config` or `projectConfig` for the parsed YAML, ensure `autoValidate` is accessible. If config is parsed inline, the new field is available automatically via `parseYaml` — no change needed to parsing logic.

### Step 4 — Add migrateConfigKeys to config-migrator.ts

Read existing `config-migrator.ts` first to understand the file structure. Then add:

```typescript
export interface MigrationResult {
  migrated: string[];
  skipped: string[];
}

export async function migrateConfigKeys(configPath: string): Promise<MigrationResult> {
  const raw = await readFile(configPath, "utf-8");
  const config = parse(raw) as Record<string, unknown>;
  const chain = (config.chain ?? {}) as Record<string, unknown>;

  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const key of Object.keys(chain)) {
    if (key.includes("_")) {
      const hyphenKey = key.replace(/_/g, "-");
      if (chain[hyphenKey] !== undefined) {
        skipped.push(key);
      } else {
        chain[hyphenKey] = chain[key];
        migrated.push(`${key} → ${hyphenKey}`);
      }
    }
  }

  if (migrated.length > 0) {
    config.chain = chain;
    await writeFile(configPath, stringify(config), "utf-8");
  }

  return { migrated, skipped };
}
```

Ensure `readFile`, `writeFile` from `node:fs/promises` and `parse`, `stringify` from `yaml` are imported (check existing imports in the file).

### Step 5 — Create CLI command `sekkei migrate` (cli/commands/migrate.ts)

<!-- Updated: Validation Session 1 - CLI command instead of manage_plan action -->

```typescript
import { migrateConfigKeys } from "../../lib/config-migrator.js";

export async function migrateCommand(configPath: string): Promise<void> {
  console.error("Migrating config keys (underscore → hyphen)...");
  console.error("⚠️  Warning: YAML comments will be lost during migration. Back up your config first.");

  const result = await migrateConfigKeys(configPath);

  if (result.migrated.length === 0) {
    console.error("No keys to migrate — config already uses hyphen format.");
    return;
  }

  console.error(`✅ Migrated ${result.migrated.length} keys:`);
  for (const m of result.migrated) console.error(`  - ${m}`);
  if (result.skipped.length > 0) {
    console.error(`⏭️  Skipped ${result.skipped.length} (hyphen key already exists):`);
    for (const s of result.skipped) console.error(`  - ${s}`);
  }
}
```

### Step 6 — Register migrate in cli/main.ts

Add `migrate` subcommand in the existing CLI registration block (alongside `generate`, `validate`, `export`, etc.).

### Step 7 — Type-check and test

```bash
cd packages/mcp-server
npm run lint
node --experimental-vm-modules node_modules/.bin/jest --config jest.config.cjs \
  tests/unit/tools.test.ts
```

## Todo List

- [ ] Add `autoValidate?: boolean` to `ProjectConfig` in types/documents.ts
- [ ] Read generate.ts lines 395–443 to confirm config variable name and insertion point
- [ ] Add auto-validate advisory block in generate.ts before final return
- [ ] Read config-migrator.ts to understand existing structure and imports
- [ ] Add `migrateConfigKeys` + `MigrationResult` to config-migrator.ts
- [ ] Create `src/cli/commands/migrate.ts` with comment-loss warning
- [ ] Register `migrate` subcommand in `src/cli/main.ts`
- [ ] Run lint — no errors
- [ ] Run tools tests — pass

## Success Criteria

- With `autoValidate: true` in config, a generated document's output includes a staleness advisory section when upstream docs are stale
- With `autoValidate: false` or absent, no staleness advisory appended — identical behavior to before
- `migrateConfigKeys` converts `functions_list` → `functions-list` in YAML, leaves hyphen keys untouched, returns correct `migrated`/`skipped` lists
- Running migration twice produces identical YAML (idempotent)
- All existing generate and plan tests pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `checkDocStaleness` has different signature than assumed | Medium | Read function signature before implementing; adapt call accordingly |
| `projectConfig` not in scope at insertion point in generate.ts | Medium | Read lines 395–443 first (Step 3); if config not parsed, add parsing block |
| yaml.stringify loses YAML comments in config file | Certain | Document in changelog; comments are non-functional in this context |
| Dynamic import of doc-staleness causes ESM circular dep | Low | doc-staleness doesn't import generate.ts; no cycle |

## Security Considerations

- `config_path` for migration comes from MCP tool args. Existing Zod schema in plan.ts validates it as a path string with regex refinement. Verify the refinement covers this new action.
- `migrateConfigKeys` writes to `configPath` — only config files, no arbitrary path write. Path traversal protection relies on the Zod schema validation upstream.

## Next Steps

- Phase 6 (tests): add smoke test for `migrate_config` action with a temp config file.
- Future: auto-run migration on server start if config has underscore keys (P4 scope — YAGNI for now).
- Consider adding `autoValidate` to `sekkei.config.example.yaml` as commented-out example.
