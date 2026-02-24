# Phase 4: Validation

## Context Links

- [Brainstorm: Cross-ref rules](../reports/brainstorm-260223-2104-v-model-chain-review.md)
- [validator.ts](../../sekkei/packages/mcp-server/src/lib/validator.ts)
- [id-extractor.ts](../../sekkei/packages/mcp-server/src/lib/id-extractor.ts)
- [cross-ref-linker.ts](../../sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts)
- [completeness-rules.ts](../../sekkei/packages/mcp-server/src/lib/completeness-rules.ts)
- [glossary.ts](../../sekkei/packages/mcp-server/src/tools/glossary.ts)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 4h
- **Completed:** 2026-02-23

Update cross-reference validation rules for each new doc type, extend chain-pair linking for V-model symmetry, add completeness rules for new types, and implement glossary seed/finalize lifecycle.

## Key Insights

- Current `UPSTREAM_ID_TYPES` maps each DocType to expected upstream ID prefixes. Critical to get right for each test level.
- Current `CHAIN_PAIRS` in cross-ref-linker is linear: FL->REQ->BD->DD->TS. New chain is branching (DD->UT, BD->IT, BD->ST, REQ->UAT).
- `ID_ORIGIN` map needs new entries: SEC->security-design, PP->project-plan, TP->test-plan.
- Glossary tool currently has 5 actions: add, list, find, export, import. Need 2 new: `seed` and `finalize`.
- `REQUIRED_SECTIONS` and `REQUIRED_COLUMNS` in validator.ts need entries for all 8 new types.

## Requirements

### Functional
1. Each test spec validates against CORRECT upstream only (V-model symmetry)
2. Cross-ref linker validates new chain pairs (branching, not linear)
3. Completeness rules for nfr, security-design, test-plan, all 4 test specs
4. Glossary `seed` action: auto-extract terms from requirements content
5. Glossary `finalize` action: validate all cross-referenced terms are defined
6. Required sections/columns for all 8 new types in validator.ts

### Non-Functional
- Validation runs in <5s for projects with 20+ documents
- Seed action extracts minimum 10 terms from a typical requirements doc

## Architecture

### UPSTREAM_ID_TYPES (New Entries)

```typescript
const UPSTREAM_ID_TYPES: Record<DocType, string[]> = {
  // ... existing unchanged entries ...

  // New entries
  nfr: ["REQ"],                          // NFR references requirements
  "security-design": ["REQ", "NFR"],     // Security refs requirements + NFR
  "project-plan": ["REQ", "F"],          // PP refs requirements + functions
  "test-plan": ["REQ", "F", "NFR"],      // TP refs all upstream analysis docs

  // V-MODEL SYMMETRIC TEST VALIDATION (CRITICAL)
  "ut-spec": ["CLS", "DD"],             // UT validates detail-design artifacts
  "it-spec": ["API", "SCR", "TBL"],     // IT validates basic-design interfaces
  "st-spec": ["SCR", "TBL", "F"],       // ST validates system-level (BD + FL)
  "uat-spec": ["REQ", "NFR"],           // UAT validates requirements + NFR

  // overview and test-spec REMOVED (v2.0 clean break)
};
```

### REQUIRED_SECTIONS (New Entries)

```typescript
nfr: [
  ...STRUCTURAL_SECTIONS,
  "非機能要件概要", "可用性", "性能・拡張性",
  "運用・保守性", "移行性", "セキュリティ", "システム環境",
],
"security-design": [
  ...STRUCTURAL_SECTIONS,
  "セキュリティ方針", "認証・認可設計", "データ保護",
  "通信セキュリティ", "脆弱性対策", "監査ログ",
],
"project-plan": [
  ...STRUCTURAL_SECTIONS,
  "プロジェクト概要", "WBS", "体制", "リスク管理",
],
"test-plan": [
  ...STRUCTURAL_SECTIONS,
  "テスト方針", "テスト戦略", "テスト環境", "完了基準",
],
"ut-spec": [
  ...STRUCTURAL_SECTIONS,
  "テスト設計", "単体テストケース", "トレーサビリティ", "デフェクト報告",
],
"it-spec": [
  ...STRUCTURAL_SECTIONS,
  "テスト設計", "結合テストケース", "トレーサビリティ", "デフェクト報告",
],
"st-spec": [
  ...STRUCTURAL_SECTIONS,
  "テスト設計", "システムテストケース", "トレーサビリティ", "デフェクト報告",
],
"uat-spec": [
  ...STRUCTURAL_SECTIONS,
  "テスト設計", "受入テストケース", "トレーサビリティ", "デフェクト報告",
],
```

### REQUIRED_COLUMNS (New Entries)

```typescript
nfr: [REVISION_HISTORY_COLUMNS, ["NFR-ID", "カテゴリ", "目標値", "測定方法"]],
"security-design": [REVISION_HISTORY_COLUMNS, ["SEC-ID", "対策項目"]],
"project-plan": [REVISION_HISTORY_COLUMNS, ["PP-ID"]],
"test-plan": [REVISION_HISTORY_COLUMNS, ["TP-ID"]],
"ut-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
"it-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
"st-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
"uat-spec": [REVISION_HISTORY_COLUMNS, ["テストケースID", "テスト対象"]],
```

### CHAIN_PAIRS Update (Branching V-Model)

```typescript
// cross-ref-linker.ts
const CHAIN_PAIRS: [string, string][] = [
  // Requirements phase (linear)
  ["requirements", "nfr"],
  ["requirements", "functions-list"],

  // Design phase (linear from requirements)
  ["requirements", "basic-design"],
  ["basic-design", "security-design"],
  ["basic-design", "detail-design"],

  // Test phase (V-model symmetric — branching!)
  ["detail-design", "ut-spec"],        // DD ↔ UT
  ["basic-design", "it-spec"],         // BD ↔ IT
  ["basic-design", "st-spec"],         // BD ↔ ST
  ["requirements", "uat-spec"],        // REQ ↔ UAT

  // Supplementary
  ["requirements", "operation-design"],
  ["basic-design", "migration-design"],
];
```

### ID_ORIGIN Update

```typescript
const ID_ORIGIN: Record<string, string> = {
  // ... existing entries ...
  SEC: "security-design",
  PP: "project-plan",
  TP: "test-plan",
  // UT, IT, ST, UAT origins change from "test-spec" to individual types
  UT: "ut-spec",
  IT: "it-spec",
  ST: "st-spec",
  UAT: "uat-spec",   // was implicitly test-spec
};
```

### Traceability Matrix Update

```typescript
// cross-ref-linker.ts buildTraceabilityMatrix()
const docOrder = [
  "requirements", "nfr", "functions-list",
  "basic-design", "security-design", "detail-design",
  "test-plan", "ut-spec", "it-spec", "st-spec", "uat-spec",
];
```

### Completeness Rules (New)

```typescript
// completeness-rules.ts
nfr: [
  {
    check: "NFR entries",
    test: (c) => (c.match(/NFR-\d{3}/g) || []).length >= 3,
    message: "非機能要件定義書: NFR-xxxが3つ以上必要です",
  },
],
"security-design": [
  {
    check: "security entries",
    test: (c) => /\|\s*SEC-\d+/.test(c),
    message: "セキュリティ設計書: SEC-xxxが必要です",
  },
],
"ut-spec": [
  {
    check: "UT cases",
    test: (c) => (c.match(/UT-\d{3}/g) || []).length >= 3,
    message: "単体テスト仕様書: UTケースが3つ以上必要です",
  },
],
"it-spec": [
  {
    check: "IT cases",
    test: (c) => (c.match(/IT-\d{3}/g) || []).length >= 3,
    message: "結合テスト仕様書: ITケースが3つ以上必要です",
  },
],
"st-spec": [
  {
    check: "ST cases",
    test: (c) => (c.match(/ST-\d{3}/g) || []).length >= 3,
    message: "システムテスト仕様書: STケースが3つ以上必要です",
  },
],
"uat-spec": [
  {
    check: "UAT cases",
    test: (c) => (c.match(/UAT-\d{3}/g) || []).length >= 3,
    message: "受入テスト仕様書: UATケースが3つ以上必要です",
  },
],
```

### Glossary Lifecycle: seed & finalize

**glossary.ts** — Extend GLOSSARY_ACTIONS:

```typescript
const GLOSSARY_ACTIONS = ["add", "list", "find", "export", "import", "seed", "finalize"] as const;
```

**seed action:**
- Input: `content` field (requirements markdown)
- Logic: Extract Japanese terms from headings, table cells, bold text. Create glossary entries with `ja` field and empty `en`/`vi`.
- Implementation: Add `handleGlossarySeed()` in `glossary-native.ts`. Parse markdown, extract candidate terms via regex patterns: `## (.+)`, `**(.+)**`, `| (.+?) |`.
- Output: List of auto-created terms.

**finalize action:**
- Input: `project_path` (glossary.yaml) + `content` field (concatenated all-chain markdown)
- Logic: For each term in glossary, check if it appears in content. Flag unused terms. For each ID in content, check if related terms exist in glossary. Flag undefined terms.
- Output: Validation report: { unused_terms: string[], undefined_terms: string[], coverage: number }.

### FEATURE_SECTION_HEADINGS Update

```typescript
const FEATURE_SECTION_HEADINGS: Partial<Record<DocType, string[]>> = {
  "basic-design": ["概要", "業務フロー", "画面設計"],
  "detail-design": ["概要", "モジュール設計", "画面設計詳細"],
  "ut-spec": ["単体テストケース"],
  "it-spec": ["結合テストケース"],
  // st-spec and uat-spec: no feature scope
};
```

## Related Code Files

### Must Modify
- `sekkei/packages/mcp-server/src/lib/validator.ts` — UPSTREAM_ID_TYPES, REQUIRED_SECTIONS, REQUIRED_COLUMNS, FEATURE_SECTION_HEADINGS
- `sekkei/packages/mcp-server/src/lib/cross-ref-linker.ts` — CHAIN_PAIRS, ID_ORIGIN, docOrder in buildTraceabilityMatrix
- `sekkei/packages/mcp-server/src/lib/completeness-rules.ts` — Add rules for 6+ new types
- `sekkei/packages/mcp-server/src/tools/glossary.ts` — Add seed/finalize actions, update schema
- `sekkei/packages/mcp-server/src/lib/glossary-native.ts` — Implement seed/finalize handlers

## Implementation Steps

1. **Update validator.ts UPSTREAM_ID_TYPES** — Add entries for all 8 new types with correct upstream ID prefixes per V-model symmetry.
2. **Update validator.ts REQUIRED_SECTIONS** — Add section lists for all 8 new types.
3. **Update validator.ts REQUIRED_COLUMNS** — Add column requirements for all 8 new types.
4. **Update validator.ts FEATURE_SECTION_HEADINGS** — Add ut-spec and it-spec entries.
5. **Update cross-ref-linker.ts CHAIN_PAIRS** — Replace linear chain with branching V-model pairs.
6. **Update cross-ref-linker.ts ID_ORIGIN** — Add SEC, PP, TP. Change UT/IT/ST/UAT origins to individual doc types.
7. **Update cross-ref-linker.ts docOrder** — New full chain order.
8. **Update completeness-rules.ts** — Add depth rules for nfr, security-design, all 4 test specs.
9. **Add seed action to glossary** — Extract terms from requirements content. Write to glossary.yaml.
10. **Add finalize action to glossary** — Validate all terms are referenced, flag undefined.
11. **Update glossary.ts Zod schema** — Add "seed" and "finalize" to GLOSSARY_ACTIONS. Add `content` param for seed/finalize.
12. **Run lint + existing tests** — Ensure no regressions.

## Todo List

- [ ] Add 8 UPSTREAM_ID_TYPES entries
- [ ] Add 8 REQUIRED_SECTIONS entries
- [ ] Add 8 REQUIRED_COLUMNS entries
- [ ] Add ut-spec/it-spec to FEATURE_SECTION_HEADINGS
- [ ] Rewrite CHAIN_PAIRS for branching V-model
- [ ] Update ID_ORIGIN with new prefix mappings
- [ ] Update buildTraceabilityMatrix docOrder
- [ ] Add completeness rules for new types
- [ ] Implement glossary seed action
- [ ] Implement glossary finalize action
- [ ] Update glossary Zod schema
- [ ] Run lint and tests

## Success Criteria

- `validateCrossRefs(utContent, ddContent, "ut-spec")` checks CLS/DD IDs only
- `validateCrossRefs(uatContent, reqContent, "uat-spec")` checks REQ/NFR IDs only
- Chain validation with branching pairs finds correct orphaned/missing IDs
- `manage_glossary(action: "seed", content: reqMarkdown)` creates 10+ terms
- `manage_glossary(action: "finalize", content: allChainMarkdown)` reports coverage %
- All existing cross-ref-linker tests still pass (backward compat for old chain shape)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Branching CHAIN_PAIRS breaks existing chain validation | High | Keep old pairs as subset; add new pairs. Existing configs with test_spec still work. |
| ID_ORIGIN change (UT from test-spec to ut-spec) breaks traceability | Medium | Old projects with test-spec docs: ID_ORIGIN won't match. Handle gracefully in traceability builder. |
| Glossary seed quality (noise terms) | Low | Seed is suggestion-only. User reviews before committing. |
| REQUIRED_SECTIONS for new types may be wrong | Medium | Section names must match template headings exactly. Verify against Phase 2 templates. |

## Security Considerations

- Glossary seed parses user-provided markdown. Already handled by existing markdown parsing (no eval).
- No new file system access patterns.

## Next Steps

- Phase 6 writes tests for all new validation rules
- Glossary seed/finalize tested in Phase 6
