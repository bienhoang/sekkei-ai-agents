# Phase 05 — Validation & Status

## Context Links

- Parent plan: [plan.md](./plan.md)
- Spec: [refactor-1.md](../../refactor-1.md) §3–§7 (structure rules)
- Research: [researcher-01-mcp-server-internals.md](./research/researcher-01-mcp-server-internals.md) §5 (Validation Rules)
- Depends on: [Phase 01](./phase-01-config-and-types.md), [Phase 02](./phase-02-init-scaffold.md), [Phase 03](./phase-03-generate-path-routing.md), [Phase 04](./phase-04-manifest-and-merge.md)
- Files to modify:
  - `sekkei/mcp-server/src/tools/validate.ts`
  - `sekkei/mcp-server/src/lib/validator.ts`
  - `sekkei/mcp-server/src/tools/chain-status.ts`

## Overview

- **Date:** 2026-02-21
- **Priority:** P2
- **Status:** ✅ complete
- **Effort:** 1.5h
- **Description:** Add structural validation rules for the numbered directory layout (prefix format, kebab-case folders, mandatory `index.md`). Update `chain-status.ts` to read the new config schema (numbered chain entries, features array) and display progress against the 10-section structure.
- **Completed:** 2026-02-21

## Key Insights

- `validate.ts` currently delegates entirely to `validator.ts` (lib). No structural/filesystem checks exist — all validation is content-only (sections present, cross-refs valid). New structural checks need to be filesystem-aware: check paths, not content.
- Structural validation is best added as a new mode in `validate.ts` triggered by a new input: `structure_path` (path to output directory). Keeps content validation unchanged.
- `validator.ts` (lib) — content validation logic is doc-type-specific. No changes needed here for structural validation; structural checks live only in the tool layer (`validate.ts`).
- `chain-status.ts` reads `config.chain` keys `["functions_list", "requirements", "basic_design", "detail_design", "test_spec", "operation_design", "migration_design"]` (L71-75). Must add `"overview"` and `"glossary"`. Must also handle the new `SplitChainEntry` shape (`system_output`, `features_output`, `global_output`) vs. simple `ChainEntry` (`output`).
- `chain-status.ts` currently shows a flat table. With features array, should also list feature-level status: for each feature in `config.features`, show which of `basic-design`, `detail-design`, `test-spec` are complete.
- Filesystem checks in validate.ts require `fs.access` / `readdir` — already available in Node.js, no new dependencies.

## Requirements

### Functional

**Structural validation (`validate_document` with `structure_path`):**
- Top-level numbered files exist: `01-overview.md`, `02-requirements.md`, `04-functions-list.md`, `10-glossary.md`
- Numbered folders exist: `03-system/`, `05-features/`, `06-data/`, `07-operations/`, `08-test/`, `09-ui/`
- Each folder contains `index.md`
- `05-features/` subfolders are lowercase kebab-case (regex `^[a-z][a-z0-9-]+$`)
- Each feature subfolder contains `index.md`
- No unnumbered top-level `.md` files (warn, not error)
- No version suffixes in filenames (`-v2`, `-final`, `-last`) — error
- No non-ASCII characters in filenames — error

**Chain status (`get_chain_status`):**
- Reads updated config schema: `overview`, `glossary` chain keys added
- Handles `SplitChainEntry` (shows `system_output` + `features_output`)
- Lists features section showing per-feature doc status

### Non-functional
- Structural validation returns results in same format as content validation (issues array)
- `chain-status.ts` output stays under 100 lines of rendered Markdown
- No new npm dependencies

## Architecture

```
validate_document tool
  ├── mode A: content validation (existing, unchanged)
  │     triggered by: content + doc_type [+ upstream_content]
  ├── mode B: split validation (existing, unchanged)
  │     triggered by: manifest_path + doc_type
  └── mode C: structural validation (NEW)
        triggered by: structure_path (output directory path)
        returns: { valid, issues[] } same shape as mode A

get_chain_status tool
  reads sekkei.config.yaml
  ├── chain section (10 keys now)
  └── features section (array) → per-feature status table
```

## Related Code Files

| File | Action | Key Lines |
|------|--------|-----------|
| `sekkei/mcp-server/src/tools/validate.ts` | Modify | L11-19 (inputSchema), L21-124 (handler) |
| `sekkei/mcp-server/src/lib/structure-validator.ts` | Create | validateNumberedStructure() extracted here |
| `sekkei/mcp-server/src/lib/validator.ts` | No change | content validation unchanged |
| `sekkei/mcp-server/src/tools/chain-status.ts` | Modify | L71-75 (docKeys), L85-97 (output table) |

## Implementation Steps

### Step 1 — Add `structure_path` to `validate.ts` input schema (L11-19)

```ts
const inputSchema = {
  content: z.string().max(500_000).optional()
    .describe("Markdown content to validate"),
  doc_type: z.enum(DOC_TYPES).optional()   // now optional — not needed for structural check
    .describe("Type of document being validated"),
  upstream_content: z.string().max(500_000).optional()
    .describe("Upstream document for cross-reference checking"),
  manifest_path: z.string().max(500).optional()
    .refine((p) => !p || /\.ya?ml$/i.test(p), { message: "Must be .yaml/.yml" })
    .describe("Path to _index.yaml for split document validation"),
  structure_path: z.string().max(500).optional()
    .describe("Path to output directory for numbered structure validation"),
};
```

### Step 2 — Add structural validation handler block in `validate.ts`

Insert before the existing `if (manifest_path)` block:

```ts
if (structure_path) {
  const issues = await validateNumberedStructure(structure_path);
  const valid = issues.filter(i => i.type === "error").length === 0;
  const lines = [
    `# Structure Validation Result`,
    ``,
    `**Directory:** ${structure_path}`,
    `**Valid:** ${valid ? "Yes" : "No"}`,
    `**Issues:** ${issues.length}`,
    ``,
  ];
  if (issues.length > 0) {
    lines.push(`## Issues`, ``);
    for (const issue of issues) {
      lines.push(`- [${issue.type.toUpperCase()}] ${issue.message}`);
    }
  } else {
    lines.push(`All structure rules pass.`);
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}
```

### Step 3 — Create `lib/structure-validator.ts` (new file)

<!-- Updated: Validation Session 1 - Extracted to lib/ for reusability and testability -->

Create `sekkei/mcp-server/src/lib/structure-validator.ts`:

```ts
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

interface StructureIssue {
  type: "error" | "warning";
  message: string;
}

const REQUIRED_FILES = [
  "01-overview.md", "02-requirements.md",
  "04-functions-list.md", "10-glossary.md",
];
const REQUIRED_DIRS = [
  "03-system", "05-features", "06-data",
  "07-operations", "08-test", "09-ui",
];
const VERSION_SUFFIX_RE = /-(v\d+|final|last|old|new|copy)\./i;
const NON_ASCII_RE = /[^\x00-\x7F]/;
const KEBAB_RE = /^[a-z][a-z0-9-]+$/;

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function validateNumberedStructure(dir: string): Promise<StructureIssue[]> {
  const issues: StructureIssue[] = [];

  for (const f of REQUIRED_FILES) {
    if (!await exists(join(dir, f))) {
      issues.push({ type: "error", message: `Missing required file: ${f}` });
    }
  }

  for (const d of REQUIRED_DIRS) {
    const dPath = join(dir, d);
    if (!await exists(dPath)) {
      issues.push({ type: "error", message: `Missing required directory: ${d}/` });
      continue;
    }
    if (!await exists(join(dPath, "index.md"))) {
      issues.push({ type: "error", message: `Missing index.md in ${d}/` });
    }
  }

  // Feature folder checks
  const featuresDir = join(dir, "05-features");
  if (await exists(featuresDir)) {
    const entries = await readdir(featuresDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!KEBAB_RE.test(entry.name)) {
        issues.push({ type: "error", message: `Feature folder not kebab-case: 05-features/${entry.name}` });
      }
      if (!await exists(join(featuresDir, entry.name, "index.md"))) {
        issues.push({ type: "error", message: `Missing index.md in 05-features/${entry.name}/` });
      }
    }
  }

  // Top-level filename rules
  const topEntries = await readdir(dir, { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (VERSION_SUFFIX_RE.test(entry.name)) {
      issues.push({ type: "error", message: `Version suffix forbidden: ${entry.name}` });
    }
    if (NON_ASCII_RE.test(entry.name)) {
      issues.push({ type: "error", message: `Non-ASCII filename: ${entry.name}` });
    }
    // Warn on unnumbered top-level md files
    if (!/^\d{2}-/.test(entry.name) && entry.name !== "README.md") {
      issues.push({ type: "warning", message: `Unnumbered top-level file: ${entry.name}` });
    }
  }

  return issues;
}
```

Export the function and import in `validate.ts`:
```ts
// In validate.ts:
import { validateNumberedStructure } from "../lib/structure-validator.js";
```

**Note:** `structure-validator.ts` is ~55 lines. `validate.ts` stays as thin tool layer (~130 LOC).

### Step 4 — Update `chain-status.ts` docKeys and output (L71-75, L85-97)

Update docKeys array to include all 10 chain entries:

```ts
const docKeys = [
  "overview",
  "functions_list", "requirements",
  "basic_design", "detail_design", "test_spec",
  "operation_design", "migration_design", "glossary",
];
```

Update entry reading to handle `SplitChainEntry` shape:

```ts
for (const key of docKeys) {
  const entry = chain[key] as {
    status?: string;
    output?: string;
    system_output?: string;
    features_output?: string;
    global_output?: string;
  } | undefined;

  const outputStr = entry?.output
    ?? (entry?.system_output
      ? `system: ${entry.system_output}, features: ${entry.features_output ?? "-"}`
      : undefined)
    ?? entry?.global_output;

  entries.push({
    doc_type: key.replace(/_/g, "-"),
    status: entry?.status ?? "pending",
    output: outputStr,
  });
}
```

Add features table at the end of the status output:

```ts
// After main table:
if (config.features && Array.isArray(config.features) && config.features.length > 0) {
  lines.push(``, `## Feature Status`, ``);
  lines.push(`| Feature | basic-design | detail-design | test-spec |`);
  lines.push(`|---------|-------------|---------------|-----------|`);
  for (const feat of config.features as Array<{ name: string; display?: string }>) {
    // Status derived from chain entries filtered to per-feature — simplified: show pending
    // Full per-file status requires filesystem check; out of scope for this tool
    lines.push(`| ${feat.display ?? feat.name} | ⏳ | ⏳ | ⏳ |`);
  }
  lines.push(``, `_Run \`/sekkei:validate --structure\` for per-file status._`);
}
```

**Note:** Per-feature doc status in the table is shown as pending by default. The validate tool (structural mode) provides per-file detail. This avoids filesystem reads in chain-status.

## Todo

- [ ] Add `structure_path` field to `validate.ts` input schema
- [ ] Implement `validateNumberedStructure()` function in `validate.ts`
- [ ] Add structural validation handler block (before manifest_path block)
- [ ] Check total LOC of `validate.ts` — extract to `lib/structure-validator.ts` if > 200 LOC
- [ ] Update `chain-status.ts` `docKeys` array (add `overview`, `glossary`)
- [ ] Update `chain-status.ts` entry reader to handle `SplitChainEntry` fields
- [ ] Add features table to `chain-status.ts` output
- [ ] Run `npm run lint` — zero errors

## Success Criteria

- `validate_document { structure_path: "./docs" }` returns errors for missing `01-overview.md`, missing `03-system/index.md`, non-kebab feature folder names
- `validate_document { structure_path: "./docs" }` returns `Valid: Yes` on a correct scaffold
- `get_chain_status` shows `overview` and `glossary` rows in the table
- `get_chain_status` shows `system: 03-system/, features: 05-features/` for `basic-design` output column
- `get_chain_status` shows features table when `features:` array is present in config

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `validate.ts` exceeds 200 LOC after structural check addition | Medium | Extract `validateNumberedStructure` to `lib/structure-validator.ts` |
| `readdir` on non-existent path throws uncaught — crashes handler | High | Wrap in try/catch; return single error issue instead of throwing |
| Feature status in chain-status is always `⏳` (no filesystem check) | Low | Document limitation; structural validate provides detail |
| `doc_type` made optional in schema — breaks existing callers that omit it for content validation | Medium | Keep `doc_type` required when `content` or `manifest_path` present; add Zod `.superRefine()` cross-field check |

## Security Considerations

- `structure_path` is user-supplied directory path — must not allow path traversal. Add check: `resolve(structure_path)` must not start with system dirs (`/etc`, `/usr`, etc.) or be outside the project. Simpler: just let `readdir` fail naturally on restricted paths; no special allowlist needed since this is a local CLI tool.
- `readdir` results are only used for validation messages — no content is executed or written
- Filename regex checks prevent injection in issue message strings

## Next Steps

- Phase 7 (Tests) adds unit tests for `validateNumberedStructure` with tmp directories
- Phase 6 (SKILL.md) updates `/sekkei:validate` workflow to pass `--structure {output-dir}` option
