# Phase 03 — Generate Path Routing

## Context Links

- Parent plan: [plan.md](./plan.md)
- Spec: [refactor-1.md](../../refactor-1.md) §2–§5
- Research: [researcher-01-mcp-server-internals.md](./research/researcher-01-mcp-server-internals.md) §2 (Output Path Resolution)
- Depends on: [Phase 01](./phase-01-config-and-types.md)
- Files to modify:
  - `sekkei/mcp-server/src/tools/generate.ts`
  - `sekkei/templates/ja/overview.md` (NEW)
  - `sekkei/templates/shared/feature-index.md` (NEW)
  - `sekkei/templates/ja/basic-design.md`

## Overview

- **Date:** 2026-02-21
- **Priority:** P1
- **Status:** ✅ complete
- **Effort:** 3h
- **Description:** Update `generate.ts` to emit correct numbered path suggestions for every doc type + scope combination. Create the `overview` document template. Create the `feature-index.md` template used for auto-generated feature folder index files. Update `basic-design.md` split mode comment to reference numbered paths.
- **Completed:** 2026-02-21

## Key Insights

- The MCP server only emits a **text suggestion** (L196-205 of generate.ts). The SKILL layer (Claude) decides where to write. The refactor must update both the suggestion text AND the SKILL.md workflows (Phase 6). Changing only one side leaves a gap.
- Current `suggestedPath` block (L196-205) only handles `shared` and `feature` scopes. New routing must handle all 10 numbered sections by mapping `(doc_type, scope)` → numbered prefix.
- `feature_id` input schema field (L36) uses `^[A-Z]{2,5}$` regex — must be relaxed to accept kebab-case names. After Phase 1 this becomes `feature_name` conceptually; rename the param for clarity and update the Zod schema accordingly.
- `buildSplitInstructions` (L79-103) references `featureId` in the AI prompt text (L97, L101). After renaming, update the string interpolation to use feature `name` + `display`.
- `"overview"` is a new `doc_type` added in Phase 1. It needs a `GENERATION_INSTRUCTIONS` entry in `generation-instructions.ts`.
- The feature `index.md` auto-generation: after generating any feature document (`basic-design`, `detail-design`, `test-spec` with `scope: "feature"`), the server should append a note in the suggested path output telling the SKILL layer to regenerate the feature `index.md`. This is a text instruction, not a new tool call.

## Requirements

### Functional
- `generate_document` `feature_id` param renamed to `feature_name`, regex relaxed to `^[a-z][a-z0-9-]{1,49}$`
- `suggestedPath` correctly maps every `(doc_type, scope)` pair to numbered output path
- `buildSplitInstructions` uses `feature_name` (kebab) in AI prompt
- `GENERATION_INSTRUCTIONS["overview"]` added to `generation-instructions.ts`
- `ja/overview.md` template created with 5 sections matching spec §2 §01-overview
- `shared/feature-index.md` template created for auto-generated feature indexes
- `basic-design.md` split mode comment updated to reference `05-features/{name}/`
- Path suggestion output includes instruction to update feature `index.md` when writing feature docs

### Non-functional
- `generate.ts` stays under 200 LOC — extract `resolveOutputPath()` helper if needed
- All `.js` import extensions maintained (ESM)
- No stdout writes (logger to stderr only)

## Architecture

### Output Path Mapping Table (single source of truth in `resolveOutputPath()`)

| doc_type | scope | suggestedPath |
|----------|-------|---------------|
| `overview` | — | `01-overview.md` |
| `requirements` | — | `02-requirements.md` |
| `basic-design` | `shared` | `03-system/` |
| `basic-design` | `feature` | `05-features/{feature_name}/basic-design.md` |
| `functions-list` | — | `04-functions-list.md` |
| `detail-design` | `feature` | `05-features/{feature_name}/detail-design.md` |
| `test-spec` | `shared` | `08-test/` |
| `test-spec` | `feature` | `05-features/{feature_name}/test-spec.md` |
| `migration-design` | — | `06-data/` |
| `operation-design` | — | `07-operations/` |
| `crud-matrix` | — | `03-system/crud-matrix.md` |
| `traceability-matrix` | — | `08-test/traceability-matrix.md` |

Paths are relative — the SKILL layer prepends `output.directory` from `sekkei.config.yaml`.

## Related Code Files

| File | Action | Key Lines |
|------|--------|-----------|
| `sekkei/mcp-server/src/tools/generate.ts` | Modify | L36-39 (feature_id schema), L79-103 (buildSplitInstructions), L196-205 (suggestedPath) |
| `sekkei/mcp-server/src/lib/resolve-output-path.ts` | Create | Pure function: (docType, scope, featureName) → numbered path |
| `sekkei/mcp-server/src/lib/generation-instructions.ts` | Modify | Add `overview` entry to `GENERATION_INSTRUCTIONS` |
| `sekkei/templates/ja/overview.md` | Create | New template |
| `sekkei/templates/shared/feature-index.md` | Create | New template |
| `sekkei/templates/ja/basic-design.md` | Modify | Split mode comment (~line with `features/{feature-id}/`) |

## Implementation Steps

### Step 1 — Rename `feature_id` → `feature_name` in `generate.ts` input schema (L36-39)

```ts
// Before:
feature_id: z.string().regex(/^[A-Z]{2,5}$/).optional()
  .describe("Feature ID for split generation (e.g., SAL, ACC)"),

// After:
feature_name: z.string().regex(/^[a-z][a-z0-9-]{1,49}$/).optional()
  .describe("Feature folder name (kebab-case) for split generation (e.g., sales-management)"),
```

Update destructuring in handler (L110):
```ts
// Before: async ({ ..., feature_id, scope })
// After:  async ({ ..., feature_name, scope })
```

Update all references to `feature_id` inside the handler body:
- L114: `buildSplitInstructions(doc_type, scope, feature_id)` → `buildSplitInstructions(doc_type, scope, feature_name)`
- L132 logger: `feature_id` → `feature_name`
- L199-200: update suggestedPath block (see Step 3)

### Step 2 — Create `lib/resolve-output-path.ts` (new file)

<!-- Updated: Validation Session 1 - resolveOutputPath extracted to lib/ for testability -->

Create `sekkei/mcp-server/src/lib/resolve-output-path.ts`:

```ts
import type { DocType } from "../types/documents.js";

/** Map (doc_type, scope, feature_name) to a numbered output path suggestion */
export function resolveOutputPath(
  docType: DocType,
  scope?: "shared" | "feature",
  featureName?: string,
): string | undefined {
  if (docType === "overview")          return "01-overview.md";
  if (docType === "requirements")      return "02-requirements.md";
  if (docType === "functions-list")    return "04-functions-list.md";
  if (docType === "migration-design")  return "06-data/";
  if (docType === "operation-design")  return "07-operations/";
  if (docType === "crud-matrix")       return "03-system/crud-matrix.md";
  if (docType === "traceability-matrix") return "08-test/traceability-matrix.md";

  if (docType === "basic-design") {
    if (scope === "shared")  return "03-system/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/basic-design.md`;
  }
  if (docType === "detail-design") {
    if (scope === "feature" && featureName) return `05-features/${featureName}/detail-design.md`;
  }
  if (docType === "test-spec") {
    if (scope === "shared")  return "08-test/";
    if (scope === "feature" && featureName) return `05-features/${featureName}/test-spec.md`;
  }
  return undefined;
}
```

Then import in `generate.ts`:
```ts
import { resolveOutputPath } from "../lib/resolve-output-path.js";
```

### Step 3 — Replace `suggestedPath` block in `generate.ts` (L196-205)

```ts
// Remove old block:
// let suggestedPath: string | undefined;
// if (scope === "shared") { ... }
// else if (scope === "feature" && feature_id) { ... }
// const finalOutput = suggestedPath ? output + `\n\n## Output Path\n\n...` : output;

// Replace with:
const suggestedPath = resolveOutputPath(doc_type, scope, feature_name);
const isFeatureDoc = scope === "feature" && feature_name;
const pathNote = suggestedPath
  ? [
      ``,
      `## Output Path`,
      ``,
      `Save to: \`{output.directory}/${suggestedPath}\``,
      ...(isFeatureDoc ? [
        ``,
        `After saving, regenerate \`05-features/${feature_name}/index.md\` to reflect updated status.`,
      ] : []),
    ].join("\n")
  : "";

const finalOutput = output + pathNote;
```

### Step 4 — Update `buildSplitInstructions` (L79-103)

Update feature branch to use `featureName` (kebab) instead of `featureId`:

```ts
function buildSplitInstructions(
  docType: DocType, scope: "shared" | "feature",
  featureName?: string, featureDisplay?: string
): string {
  const base = GENERATION_INSTRUCTIONS[docType];
  if (scope === "shared") {
    return [
      base,
      "",
      "## Split Mode: Shared Sections (03-system/)",
      "Generate ONLY system-wide shared sections.",
      "Focus: system-architecture, database-design, external-interface, non-functional, technology.",
      "Each section → separate file in 03-system/. Do NOT include feature-specific content.",
    ].join("\n");
  }
  const label = featureDisplay ?? featureName ?? "unknown";
  return [
    base,
    "",
    `## Split Mode: Feature "${label}" (05-features/${featureName}/)`,
    `Generate ONLY sections specific to feature "${label}".`,
    "Focus: business-flow, screen-design, report-design, scoped functions.",
    "Reference 03-system/ sections by cross-reference only — do not duplicate.",
  ].join("\n");
}
```

Update call site (L114):
```ts
const instructions = scope
  ? buildSplitInstructions(doc_type, scope, feature_name)
  : GENERATION_INSTRUCTIONS[doc_type];
```

### Step 5 — Add `overview` to `GENERATION_INSTRUCTIONS` in `generation-instructions.ts`

```ts
overview: [
  "Generate 01-overview.md — project summary document from RFP or initial brief.",
  "Required sections:",
  "1. プロジェクト概要 (Project Summary) — background, goals, success criteria",
  "2. ビジネス目標 (Business Goals) — measurable objectives",
  "3. システムスコープ (System Scope) — in-scope and out-of-scope boundaries",
  "4. ステークホルダー (Stakeholders) — roles, responsibilities, contact",
  "5. アーキテクチャ概要 (High-Level Architecture) — one-paragraph summary + Mermaid C4 context diagram",
  "Keep concise — max 500 lines. Must NOT contain requirements or design decisions.",
].join("\n"),
```

### Step 6 — Create `sekkei/templates/ja/overview.md`

```markdown
---
doc_type: overview
version: "1.0"
language: ja
sections:
  - project-summary
  - business-goals
  - system-scope
  - stakeholders
  - architecture-overview
---

<!-- AI: Keigo: Use ですます調 throughout. -->

# {プロジェクト名} — プロジェクト概要

## 1. プロジェクト概要

<!-- AI: Summarize the project: background, purpose, and high-level goals in 2-3 paragraphs.
     Must NOT contain detailed requirements or design decisions. -->

## 2. ビジネス目標

<!-- AI: List 3-5 measurable business objectives. Format as a numbered list with success metrics. -->

| # | 目標 | 成功指標 |
|---|------|---------|
| 1 | | |

## 3. システムスコープ

<!-- AI: Define in-scope and explicitly out-of-scope items. Use two-column table. -->

| スコープ内 | スコープ外 |
|-----------|-----------|
| | |

## 4. ステークホルダー

<!-- AI: List all stakeholders with role, responsibility, and involvement level. -->

| ロール | 担当者 | 責任 | 関与レベル |
|-------|-------|------|----------|
| | | | |

## 5. アーキテクチャ概要

<!-- AI: Write a one-paragraph high-level architecture summary.
     Then generate a Mermaid C4 context diagram showing system boundaries and external actors. -->

```mermaid
C4Context
  title システムコンテキスト図
```
```

### Step 7 — Create `sekkei/templates/shared/feature-index.md`

```markdown
# {機能名} — 設計ドキュメント一覧

<!-- AI: When regenerating this index after a feature document is created/updated,
     update the status column. Use ✅ for complete, 🔄 for in-progress, ⏳ for pending.
     Do NOT modify other feature folders. Keigo: ですます調. -->

## ドキュメント一覧

| ドキュメント | 内容 | ステータス |
|------------|------|----------|
| [basic-design.md](./basic-design.md) | 基本設計書 | ⏳ 未生成 |
| [detail-design.md](./detail-design.md) | 詳細設計書 | ⏳ 未生成 |
| [test-spec.md](./test-spec.md) | テスト仕様書 | ⏳ 未生成 |

## 関連ドキュメント

- [システム設計](../../03-system/index.md)
- [機能一覧](../../04-functions-list.md)
- [テスト計画](../../08-test/index.md)
```

### Step 8 — Update `basic-design.md` split mode comment

Find the `<!-- AI SPLIT MODE: ... -->` comment referencing `features/{feature-id}/screen-design.md` and update the path:

```
<!-- AI SPLIT MODE: When generating in split mode (scope: "feature"), do NOT generate
     per-screen detail specs in this file. Per-screen specs (画面項目定義, バリデーション,
     イベント, 画面遷移, 権限) are generated separately in
     05-features/{feature-name}/detail-design.md.
     In split mode, section 5 should contain ONLY the 画面一覧 table and 画面遷移図 Mermaid diagram.
     Reference: "詳細は 05-features/{feature-name}/detail-design.md を参照" -->
```

## Todo

- [ ] Rename `feature_id` → `feature_name` in `generate.ts` input schema + all references
- [ ] Add `resolveOutputPath()` helper function to `generate.ts`
- [ ] Replace `suggestedPath` block (L196-205) with `resolveOutputPath()` call
- [ ] Update `buildSplitInstructions` signature and body to use `featureName`
- [ ] Add `overview` entry to `GENERATION_INSTRUCTIONS` in `generation-instructions.ts`
- [ ] Create `sekkei/templates/ja/overview.md`
- [ ] Create `sekkei/templates/shared/feature-index.md`
- [ ] Update `basic-design.md` split mode comment paths
- [ ] Run `npm run lint` from `sekkei/mcp-server/` — zero errors

## Success Criteria

- `generate_document` with `doc_type: "basic-design", scope: "shared"` returns `Save to: {output.directory}/03-system/`
- `generate_document` with `doc_type: "basic-design", scope: "feature", feature_name: "sales-management"` returns `Save to: {output.directory}/05-features/sales-management/basic-design.md`
- `generate_document` with `doc_type: "overview"` returns `Save to: {output.directory}/01-overview.md`
- `feature_name: "SAL"` (uppercase) is rejected by Zod schema
- `ja/overview.md` template loads without error from `get_template` tool
- `basic-design.md` no longer references `features/{feature-id}/`

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Renaming `feature_id` → `feature_name` breaks existing tests | Medium | Update tests in Phase 7 |
| `generation-instructions.ts` may be near 200 LOC limit | Low | Check line count; split into `overview-instructions.ts` if needed |
| `basic-design.md` template edit breaks YAML frontmatter parse | Low | Validate with `get_template` tool after edit |
| `resolveOutputPath` missing a doc_type returns `undefined` → no path hint | Low | Add fallback log warning in server; SKILL layer handles gracefully |

## Security Considerations

- `feature_name` regex `^[a-z][a-z0-9-]{1,49}$` prevents path traversal in suggested path
- Suggested paths are text only — actual writes happen in SKILL layer with its own validation
- Template files are read-only by the MCP server; no user input written to templates

## Next Steps

- Phase 4 (Manifest & Merge) updates `manifest-manager.ts` to use `feature.name` (kebab) field from Phase 1 type changes
- Phase 6 (SKILL.md) updates all sub-command save-path instructions to use numbered paths + reads `output.directory` from config
