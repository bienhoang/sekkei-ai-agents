# Phase 1: Type System & Config Schema

## Context Links

- [Brainstorm](../reports/brainstorm-260223-2104-v-model-chain-review.md)
- [Research: Types & Chain](research/researcher-01-types-and-chain.md)
- [Current types](../../sekkei/packages/mcp-server/src/types/documents.ts)
- [Config example](../../sekkei/sekkei.config.example.yaml)

## Overview

- **Priority:** P1 (all other phases depend on this)
- **Status:** completed
- **Effort:** 4h
- **Completed:** 2026-02-23

Foundation phase. Extend DocType enum with 8 new types, deprecate 2, add Phase enum for display grouping, update ProjectConfig chain schema, create config migration utility.

## Key Insights

- Current `DOC_TYPES` array has 16 entries. Adding 8 new, deprecating 2 -> 22 active types.
- `SplitChainEntry` currently used by basic-design, detail-design, test-spec. New test types (ut/it/st/uat-spec) use `ChainEntry` (single-file), NOT `SplitChainEntry`. Only basic-design and detail-design remain split.
- `SPLIT_DOC_TYPES` const must be updated to remove `test-spec` and NOT add new test types (they're single-file per level).
- Config schema change is breaking. Need migration utility that reads old config and writes new format.

## Requirements

### Functional
1. Add 8 new DocType values: `nfr`, `security-design`, `project-plan`, `test-plan`, `ut-spec`, `it-spec`, `st-spec`, `uat-spec`
2. Keep `overview` and `test-spec` in enum (for backward compat) but mark deprecated
3. Add `Phase` enum: `requirements`, `design`, `test`, `supplementary`
4. Add `PHASE_MAP: Record<DocType, Phase>` for grouping
5. Update `ProjectConfig.chain` to include new entries
6. `SPLIT_DOC_TYPES` must be `["basic-design", "detail-design"]` (remove test-spec)
7. Create config migration function: old format -> new format

### Non-Functional
- Zero runtime breakage for existing projects using old DocType values
- Migration utility must be idempotent (running twice produces same result)

## Architecture

### DocType Enum Extension
<!-- Updated: Validation Session 1 - Clean v2.0 break: removed overview + test-spec entirely -->

```typescript
// src/types/documents.ts
export const DOC_TYPES = [
  // Requirements phase
  "requirements",
  "nfr",                // NEW
  "functions-list",
  "project-plan",       // NEW
  // Design phase
  "basic-design",
  "security-design",    // NEW
  "detail-design",
  // Test phase
  "test-plan",          // NEW
  "ut-spec",            // NEW
  "it-spec",            // NEW
  "st-spec",            // NEW
  "uat-spec",           // NEW
  // Existing supplementary (unchanged)
  "crud-matrix", "traceability-matrix",
  "operation-design", "migration-design", "sitemap",
  "test-evidence", "meeting-minutes", "decision-record",
  "interface-spec", "screen-design",
] as const;

// No DEPRECATED_DOC_TYPES — clean v2.0 break. overview and test-spec removed entirely.
```

### Phase Enum

```typescript
export const PHASES = ["requirements", "design", "test", "supplementary"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_MAP: Record<DocType, Phase> = {
  // overview REMOVED (v2.0 clean break)
  requirements: "requirements",
  nfr: "requirements",
  "functions-list": "requirements",
  "project-plan": "requirements",
  "basic-design": "design",
  "security-design": "design",
  "detail-design": "design",
  "test-plan": "test",
  // test-spec REMOVED (v2.0 clean break)
  "ut-spec": "test",
  "it-spec": "test",
  "st-spec": "test",
  "uat-spec": "test",
  "crud-matrix": "supplementary",
  "traceability-matrix": "supplementary",
  "operation-design": "supplementary",
  "migration-design": "supplementary",
  sitemap: "supplementary",
  "test-evidence": "supplementary",
  "meeting-minutes": "supplementary",
  "decision-record": "supplementary",
  "interface-spec": "supplementary",
  "screen-design": "supplementary",
};

export const PHASE_LABELS: Record<Phase, string> = {
  requirements: "要件定義",
  design: "設計",
  test: "テスト",
  supplementary: "補足",
};
```

### ProjectConfig Chain Update

```typescript
<!-- Updated: Validation Session 1 - Removed overview/test_spec keys (clean v2.0 break) -->
chain: {
  rfp: string;
  // Requirements phase (new order)
  requirements: ChainEntry;
  nfr?: ChainEntry;
  functions_list: ChainEntry;
  project_plan?: ChainEntry;
  // Design phase
  basic_design: SplitChainEntry;
  security_design?: ChainEntry;
  detail_design: SplitChainEntry;
  // Test phase
  test_plan?: ChainEntry;
  ut_spec?: ChainEntry;
  it_spec?: ChainEntry;
  st_spec?: ChainEntry;
  uat_spec?: ChainEntry;
  // Supplementary
  operation_design?: ChainEntry;
  migration_design?: ChainEntry;
  glossary?: ChainEntry;
};
```

### SPLIT_DOC_TYPES Update

```typescript
export const SPLIT_DOC_TYPES = ["basic-design", "detail-design"] as const;
// test-spec removed: new test types are single-file per level
```

### New ID Prefixes

Add to `id-extractor.ts` ID_TYPES:
- `SEC` (security-design)
- `PP` (project-plan)
- `TP` (test-plan)

UT, IT, ST, UAT already exist in ID_TYPES.

## Related Code Files

### Must Modify
- `sekkei/packages/mcp-server/src/types/documents.ts` — DocType, Phase, ProjectConfig, SPLIT_DOC_TYPES, DEPRECATED_DOC_TYPES
- `sekkei/packages/mcp-server/src/lib/id-extractor.ts` — Add SEC, PP, TP to ID_TYPES and ID_PATTERN
- `sekkei/sekkei.config.example.yaml` — New chain structure

### Must Create
- `sekkei/packages/mcp-server/src/lib/config-migrator.ts` — Migration utility

## Implementation Steps

1. **Update `documents.ts` DOC_TYPES array** — Add 8 new types. Keep overview and test-spec for backward compat.
2. **Add DEPRECATED_DOC_TYPES** — Map with replacement and message string.
3. **Add Phase enum, PHASE_MAP, PHASE_LABELS** — Simple grouping for display.
4. **Update ProjectConfig.chain interface** — Add new optional entries. Keep overview and test_spec as optional for migration.
5. **Update SPLIT_DOC_TYPES** — Remove test-spec, keep only basic-design and detail-design.
6. **Update id-extractor.ts** — Add SEC, PP, TP to ID_TYPES const and ID_PATTERN regex.
7. **Update sekkei.config.example.yaml** — New chain structure with all doc types.
8. **Create config-migrator.ts** — Function `migrateConfig(oldYaml: string): string` that:
   - Detects old format (has `overview` and/or `test_spec` in chain)
   - Moves `overview` status to deprecated marker
   - Splits `test_spec` into 4 entries (ut_spec, it_spec, st_spec, uat_spec)
   - Adds missing new entries with `status: pending`
   - Preserves all non-chain config
   - Writes migration log comment at top
9. **Run `npm run lint`** to verify no type errors.

## Todo List

- [ ] Extend DOC_TYPES with 8 new types
- [ ] Add DEPRECATED_DOC_TYPES mapping
- [ ] Add Phase enum + PHASE_MAP + PHASE_LABELS
- [ ] Update ProjectConfig.chain interface
- [ ] Update SPLIT_DOC_TYPES (remove test-spec)
- [ ] Add SEC, PP, TP to id-extractor
- [ ] Update sekkei.config.example.yaml
- [ ] Create config-migrator.ts
- [ ] Run lint check

## Success Criteria

- `npm run lint` passes with all new types
- All existing code that uses DocType still compiles (overview/test-spec remain valid)
- Config migration correctly transforms old format to new
- ID_PATTERN regex matches SEC-001, PP-001, TP-001

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Enum expansion breaks Zod schema in tools | High | DOC_TYPES is used by z.enum() — adding values is safe, removing is not |
| SPLIT_DOC_TYPES removal of test-spec breaks split logic | Medium | Phase 3 handles generate.ts split routing update |
| Config migration loses data | Medium | Idempotent migration + backup recommendation |

## Security Considerations

- Config migrator reads/writes YAML. Must validate no code injection in YAML parse.
- Use `yaml` library (already in deps) for safe parse/stringify.

## Next Steps

- Phase 2 depends on new DocType values being available
- Phase 3 depends on ProjectConfig.chain schema being finalized
- Phase 4 depends on new ID prefixes being registered
