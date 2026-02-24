# Phase 01 — Config & Types

## Context Links

- Parent plan: [plan.md](./plan.md)
- Spec: [refactor-1.md](../../refactor-1.md)
- Research: [researcher-01-mcp-server-internals.md](./research/researcher-01-mcp-server-internals.md)
- Files to modify:
  - `sekkei/mcp-server/src/config.ts`
  - `sekkei/mcp-server/src/types/documents.ts`
  - `sekkei/mcp-server/src/types/manifest-schemas.ts`
  - `sekkei/sekkei.config.example.yaml`

## Overview

- **Date:** 2026-02-21
- **Priority:** P1 (foundation — blocks all other phases)
- **Status:** ✅ complete
- **Effort:** 2h
- **Description:** Update TypeScript type definitions, Zod schemas, and config schema to represent the numbered structure. Remove monolithic mode. Add features array to `ProjectConfig`. Relax feature ID regex to accept kebab-case names.
- **Completed:** 2026-02-21

## Key Insights

- `ServerConfig` (config.ts L9-12) only holds `templateDir` + `templateOverrideDir` — no output dir. Output dir must be added to `ProjectConfig` in `documents.ts` (already has `output.directory`), not `ServerConfig` (server stays path-agnostic).
- `ManifestFeatureEntrySchema.id` regex `^[A-Z]{2,5}$` (manifest-schemas.ts L15) rejects kebab names. Must relax to `^[a-z][a-z0-9-]{1,49}$` (kebab-case, max 50 chars).
- `MonolithicDocument` type in `documents.ts` L123-127 and corresponding Zod schema in `manifest-schemas.ts` L20-24 must be removed — always split from now on.
- `ProjectConfig.chain` (documents.ts L81-91) uses single `output` string per doc type — must split into `system_output` + `features_output` for `basic_design`, `detail_design`, `test_spec`.
- New `features` array at top level of `ProjectConfig` (from brainstorm config schema) replaces the implicit feature tracking in split config.
- `SPLIT_DOC_TYPES` already exists (L96). `DOC_TYPES` must add `"overview"` as a new doc type.
- `SplitConfig` interface (L148-153) is obsolete — the numbered structure is always-on, no toggle needed. Remove it from `ProjectConfig`.

## Requirements

### Functional
- `ProjectConfig` represents numbered structure (10 chain steps, features array)
- `ManifestFeatureEntry.id` accepts kebab-case names (not just uppercase IDs)
- Monolithic document type removed from Zod schemas and TS types
- `DOC_TYPES` constant includes `"overview"`
- `ChainEntry` for split docs (`basic_design`, `detail_design`, `test_spec`) has separate `system_output` and `features_output` fields
- `sekkei.config.example.yaml` shows new numbered chain paths + features array
- `chain-status.ts` reads `features` array from config (needed by Phase 5 — pass through for now)

### Non-functional
- Each file stays under 200 LOC
- All types exported from `documents.ts`; Zod schemas from `manifest-schemas.ts`
- No breaking changes to Python bridge (it receives file paths from SKILL layer, unaffected)

## Architecture

```
documents.ts          — TS interfaces (source of truth for shapes)
manifest-schemas.ts   — Zod schemas (validation on read from disk)
config.ts             — env var loader (unchanged except doc comment)
sekkei.config.example.yaml — user-facing config template
```

The server itself (`server.ts`, `tools/`) receives config at startup only for `templateDir`. Output paths live in `ProjectConfig` (read by SKILL layer from `sekkei.config.yaml`), not in `ServerConfig`.

## Related Code Files

| File | Action | Key Lines |
|------|--------|-----------|
| `sekkei/mcp-server/src/types/documents.ts` | Modify | L6 (DOC_TYPES), L67-92 (ProjectConfig), L96-153 (split types) |
| `sekkei/mcp-server/src/types/manifest-schemas.ts` | Modify | L14-18 (ManifestFeatureEntrySchema), L20-24 (MonolithicDocumentSchema) |
| `sekkei/mcp-server/src/config.ts` | No change | — |
| `sekkei/sekkei.config.example.yaml` | Modify | Full file (~75 lines) |

## Implementation Steps

### Step 1 — Update `DOC_TYPES` in `documents.ts`

Add `"overview"` to the const array at L6:

```ts
export const DOC_TYPES = [
  "overview",
  "functions-list", "requirements", "basic-design",
  "detail-design", "test-spec", "crud-matrix",
  "traceability-matrix", "operation-design", "migration-design",
] as const;
```

### Step 2 — Add `FeatureConfig` type and update `ProjectConfig` in `documents.ts`

After `KEIGO_LEVELS` block, add:

```ts
/** Per-feature entry in project config */
export interface FeatureConfig {
  id: string;           // short mnemonic, e.g. "SAL"
  name: string;         // kebab-case folder name, e.g. "sales-management"
  display: string;      // human label (JP ok), e.g. "販売管理"
}
```

Replace `ChainEntry` with a split-aware variant:

```ts
/** Chain entry for single-file docs */
export interface ChainEntry {
  status: "pending" | "in-progress" | "complete";
  output?: string;
}

/** Chain entry for split docs (basic-design, detail-design, test-spec) */
export interface SplitChainEntry {
  status: "pending" | "in-progress" | "complete";
  system_output?: string;   // path prefix for 03-system/
  features_output?: string; // path prefix for 05-features/
  global_output?: string;   // path prefix for 08-test/ (test-spec global)
}
```

Update `ProjectConfig.chain`:

```ts
chain: {
  rfp: string;
  overview:         ChainEntry;
  functions_list:   ChainEntry;
  requirements:     ChainEntry;
  basic_design:     SplitChainEntry;
  detail_design:    SplitChainEntry;
  test_spec:        SplitChainEntry;
  operation_design?: ChainEntry;
  migration_design?: ChainEntry;
  glossary?:        ChainEntry;
};
features?: FeatureConfig[];
```

Remove `split?: SplitConfig` field from `ProjectConfig` (monolithic/split toggle gone).

### Step 3 — Remove `MonolithicDocument` type, update `SplitDocument`

Remove `MonolithicDocument` interface (L123-127) and `MonolithicDocument` from the union:

```ts
// Remove: export interface MonolithicDocument { ... }
// Remove: export type ManifestDocument = MonolithicDocument | SplitDocument;

// Replace union with:
export type ManifestDocument = SplitDocument;
```

Update `ManifestFeatureEntry` to use kebab name as key:

```ts
export interface ManifestFeatureEntry {
  name: string;    // kebab-case folder name (was "id")
  display: string; // human label
  file: string;
}
```

### Step 4 — Update `manifest-schemas.ts`

Remove `MonolithicDocumentSchema` (L20-24) and its discriminated union reference.

Update `ManifestFeatureEntrySchema` (L14-18):

```ts
export const ManifestFeatureEntrySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/, "Feature name must be kebab-case"),
  display: z.string().max(200),
  file: z.string().max(500),
});
```

Update `ManifestDocumentSchema` — no longer a discriminated union:

```ts
export const ManifestDocumentSchema = SplitDocumentSchema;
```

Remove `SplitConfigSchema` (L51-57) — no longer needed.

### Step 5 — Update `sekkei.config.example.yaml`

Replace with new numbered schema:

```yaml
# Sekkei project configuration — numbered structure (refactor-1 spec)
project:
  name: "My Project"
  type: web
  stack: [TypeScript, React, PostgreSQL]
  team_size: 5
  language: ja
  keigo: 丁寧語
  industry: ""

output:
  directory: ./docs/   # User-named during init (default: docs/)

chain:
  rfp: ""
  overview:         { status: pending, output: "01-overview.md" }
  requirements:     { status: pending, output: "02-requirements.md" }
  basic_design:
    status: pending
    system_output: "03-system/"
    features_output: "05-features/"
  functions_list:   { status: pending, output: "04-functions-list.md" }
  detail_design:
    status: pending
    features_output: "05-features/"
  test_spec:
    status: pending
    global_output: "08-test/"
    features_output: "05-features/"
  migration_design: { status: pending, output: "06-data/" }
  operation_design: { status: pending, output: "07-operations/" }
  glossary:         { status: pending, output: "10-glossary.md" }

features:
  - id: SAL
    name: sales-management
    display: "販売管理"
  # Add more features here after running /sekkei:functions-list
```

## Todo

- [ ] Add `"overview"` to `DOC_TYPES` array in `documents.ts`
- [ ] Add `FeatureConfig` interface to `documents.ts`
- [ ] Add `SplitChainEntry` interface to `documents.ts`
- [ ] Update `ProjectConfig.chain` to use new entry types + add `features?` array
- [ ] Remove `SplitConfig` interface and `split?` field from `ProjectConfig`
- [ ] Remove `MonolithicDocument` interface from `documents.ts`
- [ ] Update `ManifestDocument` type alias to just `SplitDocument`
- [ ] Update `ManifestFeatureEntry`: rename `id` → `name`, add `display` field
- [ ] Update `ManifestFeatureEntrySchema`: kebab-case regex, rename field
- [ ] Remove `MonolithicDocumentSchema` from `manifest-schemas.ts`
- [ ] Update `ManifestDocumentSchema` (remove discriminated union)
- [ ] Remove `SplitConfigSchema` from `manifest-schemas.ts`
- [ ] Rewrite `sekkei.config.example.yaml` with numbered structure
- [ ] Run `npm run lint` from `sekkei/mcp-server/` — fix all TS errors

## Success Criteria

- `npm run lint` (tsc --noEmit) passes with zero errors
- `DOC_TYPES` includes `"overview"`
- `ManifestFeatureEntrySchema` accepts `"sales-management"` and rejects `"SAL"`
- `MonolithicDocumentSchema` is gone from codebase
- `sekkei.config.example.yaml` shows 10-step chain + features array

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Removing `MonolithicDocument` breaks `manifest-manager.ts` + `merge-documents.ts` | High | Fix in Phase 4 — note all call sites: `addDocument` (L59), `createTranslationManifest` (L124) |
| `feature_id` param in `generate.ts` (L36-39) still uses old uppercase regex | Medium | Fix in Phase 3 |
| `addFeature` in manifest-manager uses `f.id` (L76) — field renamed to `name` | High | Fix in Phase 4 alongside manifest changes |
| Existing tests reference `MonolithicDocument` and uppercase feature IDs | Medium | Fix in Phase 7 |

## Security Considerations

- Kebab name regex `^[a-z][a-z0-9-]{1,49}$` prevents path traversal (no `/`, `..`, spaces)
- Max 50 chars on kebab name prevents unreasonably long paths
- No new external inputs at this phase

## Next Steps

- Phase 2 (Init Scaffold) can begin once types compile
- Phase 3 (Generate) and Phase 4 (Manifest) can begin in parallel after Phase 1
- All downstream tools that reference `MonolithicDocument` or `feature.id` must be audited (see Risk above)
