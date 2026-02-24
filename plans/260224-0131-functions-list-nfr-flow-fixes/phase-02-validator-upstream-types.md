# Phase 2: Update Validator UPSTREAM_ID_TYPES & REQUIRED_COLUMNS

## Context
- **Plan:** [plan.md](plan.md)
- **Phase 1:** [phase-01-template-and-instructions.md](phase-01-template-and-instructions.md)

## Overview
- **Priority:** P2 (MEDIUM)
- **Status:** pending
- **Description:** Enable cross-ref validation for functions-list and improve NFR validation

## Key Insights
- `UPSTREAM_ID_TYPES["functions-list"] = []` — no validation despite requiring REQ cross-refs
- `UPSTREAM_ID_TYPES["nfr"] = ["REQ"]` — misses NFR-xxx already defined in requirements
- `REQUIRED_COLUMNS` for functions-list needs `関連要件ID` column added

## Related Code Files

### Modify
1. `sekkei/packages/mcp-server/src/lib/validator.ts` (lines 120-143, 149-150)

## Implementation Steps

### 1. Update UPSTREAM_ID_TYPES (`validator.ts:121`)

```typescript
// BEFORE
"functions-list": [],

// AFTER
"functions-list": ["REQ"],
```

### 2. Update UPSTREAM_ID_TYPES for NFR (`validator.ts:123`)

```typescript
// BEFORE
nfr: ["REQ"],

// AFTER
nfr: ["REQ", "NFR"],
```

### 3. Update REQUIRED_COLUMNS (`validator.ts:150`)

```typescript
// BEFORE
"functions-list": [REVISION_HISTORY_COLUMNS, ["大分類", "中分類", "機能ID", "機能名"]],

// AFTER
"functions-list": [REVISION_HISTORY_COLUMNS, ["大分類", "中分類", "機能ID", "機能名", "関連要件ID"]],
```

## Todo List
- [ ] Change `UPSTREAM_ID_TYPES["functions-list"]` from `[]` to `["REQ"]`
- [ ] Change `UPSTREAM_ID_TYPES["nfr"]` from `["REQ"]` to `["REQ", "NFR"]`
- [ ] Add `関連要件ID` to REQUIRED_COLUMNS for functions-list
- [ ] Run `npm run lint` to verify no compile errors

## Success Criteria
- `UPSTREAM_ID_TYPES` correctly configured for both doc types
- `REQUIRED_COLUMNS` includes new column
- `npm run lint` passes

## Risk Assessment
- **Medium risk:** Changing `UPSTREAM_ID_TYPES` for functions-list from `[]` to `["REQ"]` means existing functions-list docs without REQ cross-refs will now get validation warnings. This is desired behavior.
- **Medium risk:** Adding `NFR` to nfr UPSTREAM_ID_TYPES means validator will check NFR-xxx from requirements are referenced. NFR doc must now acknowledge upstream NFR-xxx.
