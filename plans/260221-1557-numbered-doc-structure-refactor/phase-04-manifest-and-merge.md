# Phase 04 — Manifest & Merge

## Context Links

- Parent plan: [plan.md](./plan.md)
- Research: [researcher-01-mcp-server-internals.md](./research/researcher-01-mcp-server-internals.md) §4 (Manifest Structure)
- Depends on: [Phase 01](./phase-01-config-and-types.md), [Phase 03](./phase-03-generate-path-routing.md)
- Files to modify:
  - `sekkei/mcp-server/src/lib/manifest-manager.ts`
  - `sekkei/mcp-server/src/lib/merge-documents.ts`
  - `sekkei/mcp-server/src/tools/export.ts`

## Overview

- **Date:** 2026-02-21
- **Priority:** P1
- **Status:** ✅ complete
- **Effort:** 2h
- **Description:** Update manifest manager to use kebab `name` instead of uppercase `id` for feature entries, remove monolithic document support from all manifest operations, update merge logic to skip `index.md` files, and fix export path resolution for numbered structure.
- **Completed:** 2026-02-21

## Key Insights

- `ManifestFeatureEntry.id` renamed to `name` (Phase 1). Every call site in `manifest-manager.ts` that references `f.id` or `feature.id` must switch to `f.name` / `feature.name`. Affected functions: `addFeature` (L68-83), `getFeatureFiles` (L101-105), `getMergeOrder` (L86-98).
- `addDocument` (L59-65) accepts `ManifestDocument` — after Phase 1 this is always `SplitDocument`. The monolithic branch in `createTranslationManifest` (L124-147) `if (doc.type === "monolithic")` must be removed.
- `getMergeOrder` (L86-98) iterates `doc.merge_order` (`["shared", "features"]`). In the numbered structure, merge order for export must also skip `index.md` entries. Add filter: `file !== "index.md" && !file.endsWith("/index.md")`.
- `merge-documents.ts` `mergeFromManifest` (L43-73): the `featureId` param (L47) was matching against `f.id` (L56) — must switch to `featureName` matching against `f.name`.
- `export.ts` reads `manifest_path` from tool input and calls `mergeFromManifest`. The `feature_id` param passed to merge must become `feature_name`. No other structural changes needed in export.ts.
- `_index.yaml` manifest location: stays at `{output-dir}/_index.yaml` (root of output dir). `createManifest` (L44-56) path `resolve(outputDir, "_index.yaml")` is correct — no change needed.
- `SplitDocument.shared` entries now represent files in `03-system/`. Their `file` field values will be paths like `03-system/system-architecture.md`. The `section` field stays as-is (semantic slug). No schema change needed for shared entries.

## Requirements

### Functional
- All `f.id` references replaced with `f.name` throughout `manifest-manager.ts`
- Monolithic document branch removed from `createTranslationManifest`
- `getMergeOrder` skips `index.md` files in returned file list
- `mergeFromManifest` parameter renamed `featureId` → `featureName`, matches on `f.name`
- `export.ts` passes `feature_name` (not `feature_id`) to `mergeFromManifest`
- `addFeature` dedup check uses `f.name === feature.name` (not `f.id`)

### Non-functional
- Each file stays under 200 LOC
- No change to Python bridge (export actions `export-excel`, `export-pdf` receive merged markdown string — path-agnostic)
- `writeManifest` YAML output remains human-readable

## Architecture

```
manifest-manager.ts
  createManifest()    — unchanged (path stays {output-dir}/_index.yaml)
  addDocument()       — always SplitDocument now; remove monolithic type guard
  addFeature()        — dedup on f.name (not f.id)
  getMergeOrder()     — filter out index.md entries
  getFeatureFiles()   — use f.name
  addTranslation()    — unchanged
  createTranslation() — remove monolithic branch

merge-documents.ts
  mergeFromManifest(manifestPath, manifest, docType, featureName?)
    — filter by f.name, skip index.md

export.ts
  feature_id param → feature_name; pass to mergeFromManifest
```

## Related Code Files

| File | Action | Key Lines |
|------|--------|-----------|
| `sekkei/mcp-server/src/lib/manifest-manager.ts` | Modify | L68-83 (addFeature), L86-98 (getMergeOrder), L101-105 (getFeatureFiles), L124-147 (createTranslationManifest) |
| `sekkei/mcp-server/src/lib/merge-documents.ts` | Modify | L43-73 (mergeFromManifest), L47 (featureId param), L56 (f.id lookup) |
| `sekkei/mcp-server/src/tools/export.ts` | Modify | feature_id → feature_name in input schema + mergeFromManifest call |

## Implementation Steps

### Step 1 — Update `addFeature` in `manifest-manager.ts` (L68-83)

```ts
// Before:
const existing = doc.features.findIndex(f => f.id === feature.id);

// After:
const existing = doc.features.findIndex(f => f.name === feature.name);
```

No other changes in `addFeature` — `feature: ManifestFeatureEntry` type already updated in Phase 1.

### Step 2 — Update `getMergeOrder` to skip `index.md` (L86-98)

```ts
export function getMergeOrder(manifest: Manifest, docType: string): string[] {
  const doc = manifest.documents[docType];
  if (!doc) return [];   // monolithic type guard removed — always split
  const files: string[] = [];
  for (const group of doc.merge_order) {
    if (group === "shared") {
      files.push(...doc.shared.map(s => s.file));
    } else if (group === "features") {
      files.push(...doc.features.map(f => f.file));
    }
  }
  // Skip index.md files — nav aids only, not spec content
  return files.filter(f => f !== "index.md" && !f.endsWith("/index.md"));
}
```

### Step 3 — Update `getFeatureFiles` (L101-105)

```ts
export function getFeatureFiles(manifest: Manifest, docType: string): string[] {
  const doc = manifest.documents[docType];
  if (!doc) return [];
  return doc.features.map(f => f.file);
}
```

(Minimal change: remove `doc.type !== "split"` guard since all docs are now split.)

### Step 4 — Remove monolithic branch from `createTranslationManifest` (L124-147)

```ts
export function createTranslationManifest(source: Manifest, targetLang: Language): Manifest {
  const translated: Manifest = {
    version: source.version,
    project: source.project,
    language: targetLang,
    source_language: source.language,
    documents: {},
  };
  for (const [key, doc] of Object.entries(source.documents)) {
    // All docs are split — no monolithic branch needed
    translated.documents[key] = {
      ...doc,
      shared: doc.shared.map(s => ({ ...s })),
      features: doc.features.map(f => ({ ...f })),
    };
  }
  return translated;
}
```

### Step 5 — Update `mergeFromManifest` in `merge-documents.ts` (L43-73)

Rename `featureId` → `featureName`, update lookup to use `f.name`:

```ts
export async function mergeFromManifest(
  manifestPath: string,
  manifest: Manifest,
  docType: string,
  featureName?: string   // was: featureId
): Promise<string> {
  const baseDir = dirname(manifestPath);
  let files = getMergeOrder(manifest, docType);  // already filters index.md

  if (featureName) {
    const doc = manifest.documents[docType];
    if (doc) {
      const featureFile = doc.features.find(f => f.name === featureName)?.file;  // was: f.id
      const sharedFiles = doc.shared.map(s => s.file)
        .filter(f => !f.endsWith("/index.md"));
      files = featureFile ? [...sharedFiles, featureFile] : sharedFiles;
    }
  }

  const sections: string[] = [];
  for (const file of files) {
    assertContained(baseDir, file);
    const content = await readFile(resolve(baseDir, file), "utf-8");
    sections.push(stripFrontmatter(content));
  }

  const frontmatter = generateMergedFrontmatter(manifest, docType);
  return `${frontmatter}\n\n${sections.join("\n\n---\n\n")}`;
}
```

### Step 6 — Update `export.ts` input schema and merge call

Locate `feature_id` in the export tool input schema (find with grep — not read in research pass). Update:

```ts
// In inputSchema:
// Before: feature_id: z.string().regex(/^[A-Z]{2,5}$/).optional()
// After:
feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
  .describe("Feature folder name (kebab-case) to export a single feature"),

// In handler destructuring: { ..., feature_name }
// In mergeFromManifest call: pass feature_name instead of feature_id
```

## Todo

- [ ] Update `addFeature`: dedup on `f.name` not `f.id`
- [ ] Update `getMergeOrder`: remove `doc.type !== "split"` guard, add `index.md` filter
- [ ] Update `getFeatureFiles`: remove type guard
- [ ] Remove monolithic branch from `createTranslationManifest`
- [ ] Remove `if (!doc || doc.type !== "split")` guards throughout (all docs are split)
- [ ] Rename `featureId` → `featureName` in `mergeFromManifest`, update `f.id` → `f.name` lookup
- [ ] Update `export.ts`: rename `feature_id` → `feature_name` in schema + handler
- [ ] Run `npm run lint` — zero errors
- [ ] Run `npm test` — existing manifest + merge tests should pass (or note failures for Phase 7)

## Success Criteria

- `getMergeOrder` returns no `index.md` entries regardless of manifest content
- `addFeature` deduplicates on `name` field — adding same kebab-name twice updates in-place
- `createTranslationManifest` no longer has `doc.type === "monolithic"` branch
- `mergeFromManifest` correctly filters to single feature by `featureName`
- `npm run lint` passes with zero TS errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `export.ts` has additional `feature_id` references not caught here (tool not fully read) | Medium | Use grep: `grep -n "feature_id" sekkei/mcp-server/src/tools/export.ts` before editing |
| Removing type guards may hide future bugs if manifest is corrupt | Low | Zod schema validates on every `readManifest` call — corruption caught at read time |
| `getMergeOrder` index.md filter uses string match — fragile if paths have `index.md` mid-path | Low | Use `path.basename(f) === "index.md"` instead of string endsWith for correctness |

## Security Considerations

- `assertContained` check in `mergeFromManifest` (L12-17) guards against path traversal — unchanged, still applies to all file paths from manifest
- Feature name `^[a-z][a-z0-9-]{1,49}$` prevents injecting path separators into merge paths
- Manifest size cap (50KB) unchanged — prevents DoS from large manifests

## Additional Scope: Glossary Markdown Migration

<!-- Updated: Validation Session 1 - Glossary switches from YAML to Markdown -->

The `manage_glossary` MCP tool (`tools/glossary.ts`) and Python `nlp/glossary.py` currently operate on YAML format. Per validation decision, `10-glossary.md` becomes the Markdown source of truth.

**Changes needed (coordinate with Phase 6):**
- `tools/glossary.ts`: Update to read/write Markdown table format (not YAML)
- `python/nlp/glossary.py`: Update `extract_terms()` and `add_term()` to parse Markdown tables
- Glossary data format: `| 用語 | 定義 | カテゴリ | 英語 |` table in 10-glossary.md
- Industry glossaries (`templates/glossaries/*.yaml`) stay as YAML imports — converted to Markdown on first write

**Todo additions:**
- [ ] Update `glossary.ts` to read/write Markdown tables
- [ ] Update `glossary.py` to parse Markdown table format
- [ ] Keep YAML industry glossaries as import sources only

## Next Steps

- Phase 5 (Validation) adds structural checks that reference manifest feature `name` field
- Phase 6 (SKILL.md) updates glossary sub-command to use `10-glossary.md` Markdown format
- Phase 7 (Tests) updates `manifest-manager.test.ts` and `merge-documents.test.ts` for new field names
