# Phase 1: Fix MCP Server Bugs

## Context

- Parent: [plan.md](./plan.md)
- Brainstorm: `plans/reports/brainstorm-260224-0002-requirements-flow-correction.md`
- Work dir: `sekkei/packages/mcp-server/`

## Overview

- Priority: P1 (Critical)
- Status: complete
- Description: Fix 4 bugs where code references F-xxx in requirements context (F-xxx doesn't exist when requirements is first doc)

## Key Insights

- Requirements is FIRST doc after RFP — defines REQ-xxx and NFR-xxx
- F-xxx is defined by functions-list (DOWNSTREAM of requirements)
- Completeness rules, generation instructions, and template all incorrectly reference F-xxx for requirements

## Requirements

- Remove all F-xxx references from requirements-related code
- Requirements completeness check must validate REQ-xxx (not F-xxx)
- Requirements template: replace `機能ID` + `関連画面` → `関連RFP項目`
- Functions-list instructions: explicitly state "reference REQ-xxx from upstream"

## Related Code Files

### Modify:
1. `src/lib/completeness-rules.ts` — line 34: change F-xxx regex to REQ-xxx
2. `src/lib/generation-instructions.ts` — lines 20-28: fix requirements instructions; lines 10-18: enhance FL instructions
3. `templates/ja/requirements.md` — lines 100-113: restructure table columns

## Implementation Steps

### Step 1: Fix completeness-rules.ts

```diff
  "requirements": [
    {
-     check: "functional requirements",
-     test: (c) => (c.match(/F-\d{3}/g) || []).length >= 3,
-     message: "要件定義書: 機能要件が3つ以上必要です (F-xxx)",
+     check: "functional requirements",
+     test: (c) => (c.match(/REQ-\d{3}/g) || []).length >= 3,
+     message: "要件定義書: 機能要件が3つ以上必要です (REQ-xxx)",
    },
```

### Step 2: Fix generation-instructions.ts — requirements block

```diff
  requirements: [
    "Generate a 要件定義書 (Requirements Definition) from the provided input.",
    "Follow the 10-section structure defined in the template.",
-   "Functional requirements: REQ-001 format, map to function IDs (F-xxx).",
+   "Functional requirements: REQ-001 format.",
    "Non-functional requirements: NFR-001 format with measurable targets.",
    "Include acceptance criteria for each major requirement.",
-   "This is the FIRST document generated after RFP — it defines REQ-xxx IDs that all downstream docs reference.",
+   "This is the FIRST document after RFP — defines REQ-xxx and NFR-xxx IDs that all downstream docs reference.",
+   "Input comes from 01-rfp workspace (RFP analysis, stakeholder notes, scope freeze). Do NOT reference F-xxx — functions-list does not exist yet.",
    "For 非機能要件: Apply IPA NFUG 6 categories (可用性/性能・拡張性/運用・保守性/移行性/セキュリティ/システム環境・エコロジー). Every NFR-xxx MUST have a specific numeric 目標値. Prohibited vague terms: 高速, 十分, 適切, 高い, 良好.",
  ].join("\n"),
```

### Step 3: Fix generation-instructions.ts — functions-list block

```diff
  "functions-list": [
    "Generate a 機能一覧 (Function List) from the provided input.",
-   "This document is generated AFTER requirements — cross-reference REQ-xxx IDs from upstream 要件定義書.",
+   "This document is generated AFTER requirements. Cross-reference REQ-xxx IDs from upstream 要件定義書 — every F-xxx entry SHOULD map to at least one REQ-xxx.",
    "Use 3-tier hierarchy: 大分類 -> 中分類 -> 小機能.",
```

### Step 4: Fix templates/ja/requirements.md

a) Update AI comment at line 102-108:
```diff
  <!-- AI: Generate functional requirements from input.
       Rules:
       - ID format: REQ-001, REQ-002... (sequential)
       - 要件カテゴリ: 機能 / データ / インターフェース
-      - Map to function IDs (F-xxx) from 機能一覧 if available
-      - 検証方法: UT (Unit Test) / IT (Integration Test) / ST (System Test) / UAT
+      - 関連RFP項目: trace each requirement back to RFP source section/item
+      - 検証方法: UT / IT / ST / UAT
+      - Do NOT reference F-xxx — functions-list does not exist yet
       - Include at least 10 functional requirements
  -->
```

b) Restructure table columns:
```diff
- | 要件ID | 要件カテゴリ | 要件分類 | 要件名 | 要件詳細説明 | 優先度 | 機能ID | 関連画面 | 検証方法 | 備考 |
- |--------|-------------|---------|--------|-------------|--------|--------|---------|---------|------|
- | REQ-001 | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI: 高/中/低 --> | <!-- AI: F-xxx --> | <!-- AI --> | <!-- AI: UT,IT --> | <!-- AI --> |
+ | 要件ID | 要件カテゴリ | 要件分類 | 要件名 | 要件詳細説明 | 優先度 | 関連RFP項目 | 検証方法 | 備考 |
+ |--------|-------------|---------|--------|-------------|--------|------------|---------|------|
+ | REQ-001 | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI --> | <!-- AI: 高/中/低 --> | <!-- AI: RFP source section/item --> | <!-- AI: UT,IT --> | <!-- AI --> |
```

### Step 5: Compile check

```bash
cd sekkei/packages/mcp-server && npm run lint
```

## Todo

- [x] Fix completeness-rules.ts: F-xxx → REQ-xxx
- [x] Fix generation-instructions.ts: requirements block
- [x] Fix generation-instructions.ts: functions-list block (add explicit REQ-xxx ref)
- [x] Fix templates/ja/requirements.md: AI comments + table columns
- [x] Run compile check

## Success Criteria

- `completeness-rules.ts` validates REQ-xxx (not F-xxx) for requirements
- `generation-instructions.ts` requirements block has no F-xxx references
- `generation-instructions.ts` functions-list block explicitly states REQ-xxx cross-ref
- Template table has `関連RFP項目` column, no `機能ID` or `関連画面`
- TypeScript compiles without errors

## Risk Assessment

- **Low risk** — changes are text/regex modifications
- **Template column change** — no production documents exist yet, safe to restructure
