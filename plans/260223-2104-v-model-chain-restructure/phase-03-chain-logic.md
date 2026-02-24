# Phase 3: Chain Logic

## Context Links

- [Research: Types & Chain](research/researcher-01-types-and-chain.md)
- [chain-status.ts](../../sekkei/packages/mcp-server/src/tools/chain-status.ts)
- [generate.ts](../../sekkei/packages/mcp-server/src/tools/generate.ts)
- [resolve-output-path.ts](../../sekkei/packages/mcp-server/src/lib/resolve-output-path.ts)
- [structure-validator.ts](../../sekkei/packages/mcp-server/src/lib/structure-validator.ts)
- [generation-instructions.ts](../../sekkei/packages/mcp-server/src/lib/generation-instructions.ts)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Completed:** 2026-02-23

Update chain display, output path resolution, directory structure validation, generation instructions, and generate tool routing for all 8 new doc types.

## Key Insights

- `chain-status.ts` has hard-coded `docKeys` array (line 82-87) — must add new types in correct order.
- `resolveOutputPath()` is a pure function with if-chain — add 8 new mappings.
- `structure-validator.ts` REQUIRED_FILES has `01-overview.md` — must replace with new structure.
- `GENERATION_INSTRUCTIONS` is a Record<DocType, string> — must add entries for all 8 new types.
- `generate.ts` code analysis (lines 172-182) triggers for `detail-design` and `test-spec` only — extend to `ut-spec` (detail-level testing benefits from code context).
- Deprecation: when `doc_type === "overview"` or `doc_type === "test-spec"`, return warning text with redirect instructions instead of generating.

## Requirements

### Functional
1. Chain status displays new doc types grouped by phase
2. Feature status table shows `ut-spec`, `it-spec`, `st-spec`, `uat-spec` columns instead of `test-spec`
3. Output paths resolve correctly for all 8 new types
4. Structure validator checks new required files/dirs
5. Generation instructions exist for all 8 new types
6. Generate tool handles deprecated types with warning + redirect
7. Generate tool routes code analysis to `ut-spec` in addition to `detail-design`

### Non-Functional
- Chain status response stays under 10KB for projects with <20 features
- Deprecation warnings include actionable replacement commands

## Architecture

### Chain Status Phase Grouping

Replace flat `docKeys` array with phase-grouped structure:

```typescript
const CHAIN_DISPLAY_ORDER: { phase: Phase; label: string; keys: string[] }[] = [
  {
    phase: "requirements",
    label: "要件定義",
    keys: ["requirements", "nfr", "functions_list", "project_plan"],
  },
  {
    phase: "design",
    label: "設計",
    keys: ["basic_design", "security_design", "detail_design"],
  },
  {
    phase: "test",
    label: "テスト",
    keys: ["test_plan", "ut_spec", "it_spec", "st_spec", "uat_spec"],
  },
  {
    phase: "supplementary",
    label: "補足",
    keys: ["operation_design", "migration_design", "glossary"],
  },
];
```

Output format adds phase headers:

```markdown
# Document Chain Status

**Project:** My Project

## 要件定義 (Requirements)
| Document | Chain Status | Lifecycle | Version | Output |
...

## 設計 (Design)
| Document | Chain Status | Lifecycle | Version | Output |
...
```

### Feature Status Table Update

Replace single `test-spec` column with 4 test columns:

```typescript
// Before
lines.push(`| Feature | basic-design | detail-design | test-spec |`);

// After
lines.push(`| Feature | basic-design | detail-design | ut-spec | it-spec | st-spec | uat-spec |`);
```

Check feature dirs for `ut-spec.md`, `it-spec.md`, `st-spec.md`, `uat-spec.md` instead of `test-spec.md`.

### Output Path Mappings (New)
<!-- Updated: Validation Session 1 - Directory nesting for 02-requirements/, security in 03-system/ -->

```typescript
// Requirements phase — nested under 02-requirements/
if (docType === "requirements")     return "02-requirements/requirements.md";
if (docType === "nfr")              return "02-requirements/nfr.md";
if (docType === "project-plan")     return "02-requirements/project-plan.md";

// Design phase
if (docType === "security-design")  return "03-system/security-design.md";

// Test phase — nested under 08-test/
if (docType === "test-plan")        return "08-test/test-plan.md";
if (docType === "ut-spec")          return "08-test/ut-spec.md";
if (docType === "it-spec")          return "08-test/it-spec.md";
if (docType === "st-spec")          return "08-test/st-spec.md";
if (docType === "uat-spec")         return "08-test/uat-spec.md";

// Feature-scoped test specs (UT + IT only)
if (docType === "ut-spec" && scope === "feature" && featureName)
  return `05-features/${featureName}/ut-spec.md`;
if (docType === "it-spec" && scope === "feature" && featureName)
  return `05-features/${featureName}/it-spec.md`;
// st-spec and uat-spec are NOT feature-scoped (system/business level)
```

**Important**: `requirements.md` moved from `02-requirements.md` (flat) to `02-requirements/requirements.md` (directory). Only `ut-spec` and `it-spec` support feature scope.

### Structure Validator Updates
<!-- Updated: Validation Session 1 - 02-requirements is now a directory, not a file -->

```typescript
const REQUIRED_FILES = [
  "04-functions-list.md",
  "10-glossary.md",
];

const REQUIRED_DIRS = [
  "01-rfp", "02-requirements", "03-system", "05-features", "06-data",
  "07-operations", "08-test", "09-ui",
];
// 01-rfp: /sekkei:rfp workspace output
// 02-requirements: requirements.md, nfr.md, project-plan.md
```

### Generation Instructions (8 New Entries)

Add to `GENERATION_INSTRUCTIONS` Record:

```typescript
nfr: "Generate 非機能要件定義書 from requirements...",
"security-design": "Generate セキュリティ設計書 from basic-design...",
"project-plan": "Generate プロジェクト計画書 from requirements...",
"test-plan": "Generate テスト計画書 from requirements + basic-design...",
"ut-spec": "Generate 単体テスト仕様書 from detail-design...",
"it-spec": "Generate 結合テスト仕様書 from basic-design...",
"st-spec": "Generate システムテスト仕様書 from basic-design + functions-list...",
"uat-spec": "Generate 受入テスト仕様書 from requirements + nfr...",
```

Each instruction must specify:
- Required sections from template
- ID format and cross-reference rules
- Minimum test case count (for test specs)
- Upstream ID types to reference

### KEIGO_MAP Additions

```typescript
nfr: "丁寧語",
"security-design": "simple",
"project-plan": "丁寧語",
"test-plan": "simple",
"ut-spec": "simple",
"it-spec": "simple",
"st-spec": "simple",
"uat-spec": "simple",
```

### Generate Tool Changes
<!-- Updated: Validation Session 1 - No deprecation handler needed (clean v2.0 break) -->

No deprecation handler needed. `overview` and `test-spec` are removed from DocType enum entirely. Zod schema validation will reject invalid doc_type values automatically.

### Code Analysis Routing Extension

```typescript
// Before: only detail-design and test-spec
if (source_code_path && (doc_type === "detail-design" || doc_type === "test-spec"))

// After: add ut-spec (unit tests benefit from code context)
if (source_code_path && (
  doc_type === "detail-design" ||
  doc_type === "ut-spec"
))
```

## Related Code Files

### Must Modify
- `sekkei/packages/mcp-server/src/tools/chain-status.ts` — Phase grouping, new doc keys, feature table columns
- `sekkei/packages/mcp-server/src/tools/generate.ts` — Deprecation handler, code analysis routing
- `sekkei/packages/mcp-server/src/lib/resolve-output-path.ts` — 8 new path mappings
- `sekkei/packages/mcp-server/src/lib/structure-validator.ts` — Remove 01-overview.md from REQUIRED_FILES
- `sekkei/packages/mcp-server/src/lib/generation-instructions.ts` — 8 new instruction entries + KEIGO_MAP entries

## Implementation Steps

1. **Update resolve-output-path.ts** — Add 8 new path mappings. Add feature-scope for ut-spec and it-spec.
2. **Update structure-validator.ts** — Replace `01-overview.md` with `02-requirements.md` in REQUIRED_FILES.
3. **Update generation-instructions.ts** — Add 8 GENERATION_INSTRUCTIONS entries. Add 8 KEIGO_MAP entries.
4. **Update generate.ts** — Add deprecation check at top of handler. Extend code analysis to ut-spec.
5. **Update chain-status.ts** — Replace flat docKeys with phase-grouped CHAIN_DISPLAY_ORDER. Update feature table columns (4 test types replace test-spec). Handle deprecated overview/test_spec keys in config by showing "(deprecated)" label.
6. **Run `npm run lint`** to verify type safety.

## Todo List

- [ ] Add 8 path mappings in resolve-output-path.ts
- [ ] Update REQUIRED_FILES in structure-validator.ts
- [ ] Add 8 GENERATION_INSTRUCTIONS entries
- [ ] Add 8 KEIGO_MAP entries
- [ ] Add deprecation handler in generate.ts
- [ ] Extend code analysis routing to ut-spec
- [ ] Refactor chain-status.ts with phase grouping
- [ ] Update feature status table columns
- [ ] Handle deprecated keys in chain status display
- [ ] Run lint

## Success Criteria

- `resolveOutputPath("ut-spec")` returns `"08-test/ut-spec.md"`
- `resolveOutputPath("ut-spec", "feature", "sales")` returns `"05-features/sales/ut-spec.md"`
- `resolveOutputPath("uat-spec")` returns `"08-test/uat-spec.md"` (no feature scope)
- `handleGenerateDocument({ doc_type: "overview", ... })` returns deprecation warning
- `handleGenerateDocument({ doc_type: "test-spec", ... })` returns deprecation warning listing 4 replacements
- Chain status output shows phase headers
- Feature table has 4 test columns instead of 1

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chain status output too wide with 4 test columns | Low | Feature table is optional, only shown if 05-features/ exists |
| Deprecation blocks users mid-workflow | Medium | Warning includes exact replacement command — user can immediately retry |
| Old configs with overview/test_spec keys crash chain-status | High | Detect deprecated keys, show with "(deprecated)" label |

## Security Considerations

- No new security surface. Path resolution already prevents traversal.
- New output paths stay within output.directory.

## Next Steps

- Phase 4 builds on new chain ordering for cross-reference validation
- Phase 5 needs GENERATION_INSTRUCTIONS to exist for SKILL.md alignment
