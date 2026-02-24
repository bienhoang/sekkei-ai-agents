# Phase 2 — Validation Rules

**Issues:** IMP-2, IMP-6
**Files:** `completeness-rules.ts`, `validator.ts`

## 2.1 completeness-rules.ts

**Path:** `sekkei/packages/mcp-server/src/lib/completeness-rules.ts`

### IMP-2 — Add completeness depth rules for supplementary types

Add after existing entries (before closing `}`):

```ts
"operation-design": [
  {
    check: "OP entries",
    test: (c: string) => (c.match(/OP-\d{3}/g) || []).length >= 3,
    message: "運用設計書: 障害対応手順にOP-xxxが3つ以上必要です",
  },
],
"migration-design": [
  {
    check: "MIG entries",
    test: (c: string) => (c.match(/MIG-\d{3}/g) || []).length >= 3,
    message: "移行設計書: データ移行計画にMIG-xxxが3つ以上必要です",
  },
],
"crud-matrix": [
  {
    check: "F-xxx rows",
    test: (c: string) => /\|\s*F-\d+/.test(c),
    message: "CRUD図: 機能行にF-xxxが必要です",
  },
  {
    check: "TBL-xxx columns",
    test: (c: string) => /TBL-\d+/.test(c),
    message: "CRUD図: テーブル列にTBL-xxxが必要です",
  },
],
"traceability-matrix": [
  {
    check: "REQ-xxx rows",
    test: (c: string) => /\|\s*REQ-\d+/.test(c),
    message: "トレーサビリティマトリックス: 要件行にREQ-xxxが必要です",
  },
],
"sitemap": [
  {
    check: "PG entries",
    test: (c: string) => (c.match(/PG-\d{3}/g) || []).length >= 3,
    message: "サイトマップ: ページ一覧にPG-xxxが3つ以上必要です",
  },
],
```

## 2.2 validator.ts

**Path:** `sekkei/packages/mcp-server/src/lib/validator.ts`

### IMP-6 — Add required table columns for matrix/sitemap

Update `requiredTableColumns` entries:

**crud-matrix** (currently `[]`):
```ts
"crud-matrix": [["機能ID", "機能名"]],
```

**traceability-matrix** (currently `[]`):
```ts
"traceability-matrix": [["要件ID"]],
```

**sitemap** (currently `[]`):
```ts
"sitemap": [["ページID", "ページ名", "URL"]],
```

Note: Use partial column names — validator checks `includes()` not exact match, so `"URL"` matches `"URL/ルート"`.

## Checklist
- [ ] IMP-2: operation-design completeness rule
- [ ] IMP-2: migration-design completeness rule
- [ ] IMP-2: crud-matrix completeness rules (F-xxx + TBL-xxx)
- [ ] IMP-2: traceability-matrix completeness rule
- [ ] IMP-2: sitemap completeness rule
- [ ] IMP-6: crud-matrix table columns
- [ ] IMP-6: traceability-matrix table columns
- [ ] IMP-6: sitemap table columns
- [ ] Build passes: `npm run lint` from mcp-server
