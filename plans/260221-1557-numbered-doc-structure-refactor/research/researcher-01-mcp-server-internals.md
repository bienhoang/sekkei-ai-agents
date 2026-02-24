# MCP Server Internals — Numbered Doc Structure Refactor
**Date:** 2026-02-21 | **Scope:** config, generate, server, manifest, validate

---

## 1. Config Schema (`src/config.ts`)

**Interface:** `ServerConfig` (lines 9–12)
```ts
export interface ServerConfig {
  templateDir: string;
  templateOverrideDir?: string;
}
```

**No Zod** — plain TS interface, loaded via `loadConfig()` (line 14) from env vars only:
- `SEKKEI_TEMPLATE_DIR` → default `../../templates` (relative to `dist/`)
- `SEKKEI_TEMPLATE_OVERRIDE_DIR` → optional override dir

**Gotcha:** No output directory in config at all. Output path is determined entirely by the skill layer (Claude), not the MCP server. The server only suggests paths via text in the tool response.

---

## 2. Output Path Resolution (`src/tools/generate.ts`)

**No real path resolution** — the server emits a *suggestion string* appended to the response body.

Key block (lines 196–205):
```ts
let suggestedPath: string | undefined;
if (scope === "shared") {
  suggestedPath = `shared/`;
} else if (scope === "feature" && feature_id) {
  suggestedPath = `features/${feature_id.toLowerCase()}/`;
}

const finalOutput = suggestedPath
  ? output + `\n\n## Output Path\n\nSave to: \`${suggestedPath}${doc_type}.md\`\n`
  : output;
```

**Current suggested paths:**
- shared scope → `shared/{doc_type}.md`
- feature scope → `features/{feature_id_lower}/{doc_type}.md`
- monolithic (no scope) → no path suggestion

**Input schema fields relevant to routing** (lines 36–39):
- `feature_id: z.string().regex(/^[A-Z]{2,5}$/).optional()` — 2–5 uppercase letters
- `scope: z.enum(["shared", "feature"]).optional()`

**`buildSplitInstructions()`** (lines 79–103): generates AI prompt for split mode, uses `featureId` for prefix hints (e.g., `SAL-SCR-001`). No path logic here — pure text.

---

## 3. Server / Tool Registration (`src/server.ts`)

Minimal factory (22 lines total):
```ts
export function createServer(templateDir: string, templateOverrideDir?: string): McpServer
```
- Calls `registerAllTools(server, templateDir, templateOverrideDir)` (line 16)
- Calls `registerAllResources(server, templateDir, templateOverrideDir)` (line 17)
- No output dir passed anywhere — confirms server is path-agnostic

`registerGenerateDocumentTool` signature (line 105):
```ts
export function registerGenerateDocumentTool(
  server: McpServer, templateDir: string, overrideDir?: string
): void
```

---

## 4. Manifest Structure (`src/lib/manifest-manager.ts` + `src/types/manifest-schemas.ts`)

### `_index.yaml` Schema (Zod, manifest-schemas.ts)

**Top-level** (`ManifestSchema`, line 39):
```ts
{ version, project, language, documents: Record<string, ManifestDocument>,
  translations?: [{lang, manifest}][], source_language? }
```

**ManifestDocument** — discriminated union on `type`:

| type | fields |
|------|--------|
| `monolithic` | `file`, `status` |
| `split` | `status`, `shared[]`, `features[]`, `merge_order` |

**Shared entry** (line 8): `{ file, section, title }`
**Feature entry** (line 14): `{ id: /^[A-Z]{2,5}$/, name, file }`
**merge_order** (line 31): `Array<"shared" | "features">`, default `["shared","features"]`

### Key manifest operations (manifest-manager.ts)

| Function | Sig | Purpose |
|----------|-----|---------|
| `readManifest(path)` | L16 | Read+validate via Zod |
| `writeManifest(path, manifest)` | L36 | YAML serialize + write |
| `createManifest(outputDir, project, lang)` | L44 | Creates `_index.yaml` at `outputDir` |
| `addDocument(manifestPath, docType, doc)` | L59 | Upsert monolithic/split entry |
| `addFeature(manifestPath, docType, feature)` | L68 | Append/update feature in split doc |
| `getMergeOrder(manifest, docType)` | L86 | Returns ordered `file[]` for export |
| `addTranslation(manifestPath, lang, path)` | L108 | Link translation manifest |

**Gotcha:** `createManifest` hardcodes path as `resolve(outputDir, "_index.yaml")` (L47). No numbering support.

**Gotcha:** `ManifestFeatureEntrySchema.id` is strictly `^[A-Z]{2,5}$` — no numbers allowed. If numbered IDs (e.g., `F01`) are needed, regex must change.

---

## 5. Validation Rules (`src/tools/validate.ts`)

Two modes (discriminated by `manifest_path` presence):

**Monolithic** (line 87): delegates to `validateDocument(content, doc_type, upstream_content)` from `lib/validator.ts`

**Split** (line 31): delegates to `validateSplitDocument(manifest_path, manifest, doc_type, upstream_content)` from `lib/validator.ts`

Input schema (lines 11–19):
- `content?: string` — document markdown
- `doc_type: z.enum(DOC_TYPES)` — required
- `upstream_content?: string` — for cross-ref checking
- `manifest_path?: string` — `.yaml/.yml` regex refinement (line 17)

Output for split validation includes: `per_file[]` issues, `aggregate_issues[]`, `cross_ref_report` (upstream_ids, referenced_ids, missing, orphaned, coverage%).

**No numbering validation currently** — validator does not check file name patterns or directory structure conventions.

---

## 6. Functions Requiring Modification

| File | Line(s) | Function/Field | Change Needed |
|------|---------|----------------|---------------|
| `tools/generate.ts` | 197–200 | `suggestedPath` block | Add numbered prefix to path suggestions |
| `tools/generate.ts` | 36–39 | `feature_id` schema | May need to accept numeric IDs (e.g., `F01`) |
| `types/manifest-schemas.ts` | 15 | `ManifestFeatureEntrySchema.id` regex | Relax `^[A-Z]{2,5}$` if numbered IDs needed |
| `lib/manifest-manager.ts` | 47 | `createManifest` | Adjust if manifest location changes |
| `lib/manifest-manager.ts` | 86–98 | `getMergeOrder` | May need ordering by number |
| `tools/validate.ts` | 17 | `manifest_path` refinement | Extend if new path patterns used |

---

## 7. Gotchas / Tight Coupling

- **Output paths are suggestions, not enforced.** The MCP server appends a text hint; the skill layer (Claude) decides where to actually write. Refactor must update the text hint AND the skill SKILL.md instructions.
- **`feature_id` regex is strict.** `^[A-Z]{2,5}$` rejects anything with digits. Numbered structure (`F01`, `01`) requires schema change + downstream regex in `id-extractor.ts`.
- **Manifest path is hardcoded as `_index.yaml`** in `createManifest`. Directory-level numbering would need the manifest path to be updated or remain flat.
- **`merge_order` only supports `"shared" | "features"` strings.** Numeric ordering would require schema extension.
- **`validator.ts` (lib)** — not read in this pass; may have additional ID pattern checks tied to current naming conventions. Should be verified before finalizing.
- **No output dir in server config** — any numbered directory scheme lives entirely outside the MCP server (in SKILL.md / calling layer). Server changes are minimal; skill + manifest schema changes are the primary work.

---

## Unresolved Questions

1. What exact numbering format is required? (`01-shared`, `F01-SAL`, `001/`?) — determines regex changes.
2. Does `feature_id` need to change format, or is numbering only at directory level?
3. Should `_index.yaml` itself move to a numbered directory, or stay at project root?
4. Does `validator.ts` (lib) contain hardcoded filename/path patterns that need updating?
5. Is `merge_order` expected to express numeric ordering, or remain `["shared","features"]`?
