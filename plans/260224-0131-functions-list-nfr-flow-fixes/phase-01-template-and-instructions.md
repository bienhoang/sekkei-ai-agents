# Phase 1: Fix Template & Generation Instructions

## Context
- **Plan:** [plan.md](plan.md)
- **Brainstorm:** [brainstorm report](../reports/brainstorm-260224-0131-functions-list-nfr-flow-review.md)

## Overview
- **Priority:** P1 (CRITICAL bug + MEDIUM improvements)
- **Status:** pending
- **Description:** Standardize functions-list ID format to `F-xxx`, add `関連要件ID` column, clarify NFR instructions

## Key Insights
- Template says `[PREFIX]-001` (e.g., SAL-001) but entire validation/cross-ref system expects `F-xxx`
- Generation instructions internally inconsistent: mentions both `F-xxx` and `[PREFIX]-001`
- NFR doc has no guidance on reusing vs. replacing NFR-xxx from requirements

## Related Code Files

### Modify
1. `sekkei/packages/mcp-server/templates/ja/functions-list.md`
2. `sekkei/packages/mcp-server/src/lib/generation-instructions.ts`

## Implementation Steps

### 1. Fix functions-list template (`templates/ja/functions-list.md`)

**Line 67** — Change ID format instruction:
```
BEFORE: - ID format: [PREFIX]-001 where PREFIX is 2-3 char abbreviation of 大分類 (e.g., SAL for 営業管理)
AFTER:  - ID format: F-001, F-002... (sequential). Each F-xxx MUST map to at least one REQ-xxx via 関連要件ID column
```

**Line 74** — Add instruction for cross-referencing:
```
ADD: - 関連要件ID: comma-separated REQ-xxx IDs from upstream 要件定義書 that this function implements
```

**Line 77** — Update table header to add `関連要件ID` column:
```
BEFORE: | No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 処理分類 | 優先度 | 難易度 | 備考 |
AFTER:  | No. | 大分類 | 中分類 | 機能ID | 機能名 | 機能概要 | 関連要件ID | 処理分類 | 優先度 | 難易度 | 備考 |
```

**Line 79** — Update sample row:
```
BEFORE: | 1 | <!-- AI --> | <!-- AI --> | <!-- AI: PREFIX-001 --> | ...
AFTER:  | 1 | <!-- AI --> | <!-- AI --> | <!-- AI: F-001 --> | <!-- AI --> | <!-- AI --> | <!-- AI: REQ-001, REQ-002 --> | ...
```

**Line 16** — Update column count in generation instructions comment:
```
BEFORE: "Fill all 10 columns per row."
AFTER:  "Fill all 11 columns per row."
```

### 2. Fix generation instructions (`src/lib/generation-instructions.ts`)

**Lines 10-18** — Update functions-list instructions:
```typescript
"functions-list": [
  "Generate a 機能一覧 (Function List) from the provided input.",
  "This document is generated AFTER requirements. Cross-reference REQ-xxx IDs from upstream 要件定義書.",
  "Use 3-tier hierarchy: 大分類 -> 中分類 -> 小機能.",
  "ID format: F-001, F-002... (sequential, NOT prefix-based).",
  "Every F-xxx MUST map to at least one REQ-xxx in the 関連要件ID column.",
  "Processing types: 入力/照会/帳票/バッチ.",
  "Priority: 高/中/低. Fill all 11 columns per row.",
  "Generate at least 10 functions covering the scope described.",
].join("\n"),
```

**Lines 53-62** — Update NFR instructions (add line about existing NFR-xxx):
```typescript
nfr: [
  "Generate a 非機能要件定義書 (Non-Functional Requirements) from requirements.",
  "The upstream 要件定義書 already defines initial NFR-xxx entries (one per IPA category). Use those same IDs and elaborate each with detailed analysis, metrics, and measurement methods.",
  "Add new sequential NFR-xxx IDs for any additional requirements not covered in upstream.",
  "Follow IPA NFUG 6-category framework exactly:",
  "可用性, 性能・拡張性, 運用・保守性, 移行性, セキュリティ, システム環境・エコロジー.",
  "ID format: NFR-001. Each NFR MUST have a specific numeric 目標値.",
  "Prohibited vague terms: 高速, 十分, 適切, 高い, 良好.",
  "Table: NFR-ID, カテゴリ, 要件名, 目標値, 測定方法, 優先度.",
  "Cross-reference REQ-xxx IDs from upstream requirements.",
  "Generate at least 3 NFR entries per IPA category.",
].join("\n"),
```

## Todo List
- [ ] Update functions-list template ID format from `[PREFIX]-001` to `F-xxx`
- [ ] Add `関連要件ID` column to functions-list template table
- [ ] Update sample row with `F-001` and `REQ-xxx` examples
- [ ] Fix generation instructions for functions-list
- [ ] Add NFR upstream relationship guidance to NFR instructions
- [ ] Run `npm run lint` to verify no compile errors

## Success Criteria
- Template uses `F-xxx` format consistently
- Template has 11-column table with `関連要件ID`
- Generation instructions match template
- NFR instructions clarify relationship with upstream NFR-xxx
- `npm run lint` passes

## Risk Assessment
- **Low risk:** Template changes are AI instructions only, no runtime code
- **Low risk:** Generation instructions are string constants, easy to verify
