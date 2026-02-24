# Phase 1: Post-Generation Validation (Critical — G2/G7/G8)

## Context Links
- Parent: [plan.md](plan.md)
- Brainstorm: `plans/reports/brainstorm-260224-1224-changelog-consistency-audit.md`

## Overview
- **Priority:** P0 — Critical
- **Status:** completed
- **Description:** Add `validateChangelogPreservation()` to validator.ts — compares 改訂履歴 rows before/after regeneration, catches silent data loss.

## Key Insights
- Current `validateRevisionHistoryContent()` checks quality (ascending versions, non-empty cells) but never compares against previous content
- `extractRevisionSection()` already exists (private) — reuse for both old and new content parsing
- Need to export `extractRevisionSection()` or create public wrapper

## Requirements
- Compare 改訂履歴 data rows between previous and new content
- Detect: missing rows, modified rows, decreased row count
- Return `ValidationIssue[]` with new type `"changelog_preservation"`
- Non-breaking: new function, no changes to existing signatures

## Architecture
```
validateChangelogPreservation(previousContent, newContent)
  ├── extractRevisionSection(previousContent) → oldRows
  ├── extractRevisionSection(newContent) → newRows
  ├── parseDataRows(oldRows) → oldData[]
  ├── parseDataRows(newRows) → newData[]
  ├── check: newData.length >= oldData.length
  ├── check: every oldData row exists verbatim in newData
  └── check: newData.length === oldData.length + 1 (warning if not)
```

## Related Code Files
- **Modify:** `sekkei/packages/mcp-server/src/lib/validator.ts`
  - Add `ValidationIssue.type` union member: `"changelog_preservation"`
  - Export `extractRevisionSection()` (currently private)
  - Add new `validateChangelogPreservation(previousContent: string, newContent: string): ValidationIssue[]`

## Implementation Steps

1. In `validator.ts`, add `"changelog_preservation"` to `ValidationIssue.type` union
2. Change `extractRevisionSection` from private function to exported
3. Add helper `parseRevisionDataRows(lines: string[]): string[]` — filters lines matching `^\|\s*\d+\.\d+\s*\|`
4. Add exported function:
   ```typescript
   export function validateChangelogPreservation(
     previousContent: string,
     newContent: string,
   ): ValidationIssue[] {
     const issues: ValidationIssue[] = [];
     const oldLines = extractRevisionSection(previousContent);
     const newLines = extractRevisionSection(newContent);
     const oldRows = parseRevisionDataRows(oldLines);
     const newRows = parseRevisionDataRows(newLines);

     // No previous changelog → nothing to preserve
     if (oldRows.length === 0) return issues;

     // Row count check
     if (newRows.length < oldRows.length) {
       issues.push({
         type: "changelog_preservation",
         severity: "error",
         message: `改訂履歴 rows decreased: ${oldRows.length} → ${newRows.length}`,
       });
     }

     // Verbatim check: each old row must exist in new content
     for (const oldRow of oldRows) {
       const normalized = oldRow.replace(/\s+/g, " ").trim();
       const found = newRows.some(
         (nr) => nr.replace(/\s+/g, " ").trim() === normalized
       );
       if (!found) {
         issues.push({
           type: "changelog_preservation",
           severity: "error",
           message: `改訂履歴 row missing or modified: ${oldRow.slice(0, 60)}...`,
         });
       }
     }

     // Exactly 1 new row expected (warning if not)
     if (newRows.length !== oldRows.length + 1 && issues.length === 0) {
       issues.push({
         type: "changelog_preservation",
         severity: "warning",
         message: `Expected exactly 1 new 改訂履歴 row, got ${newRows.length - oldRows.length}`,
       });
     }

     return issues;
   }
   ```
5. Run `npm run build` to verify compilation

## Todo
- [ ] Add `"changelog_preservation"` to ValidationIssue type union
- [ ] Export `extractRevisionSection()`
- [ ] Add `parseRevisionDataRows()` helper
- [ ] Add `validateChangelogPreservation()` function
- [ ] Build passes

## Success Criteria
- Function returns empty array when all rows preserved + 1 new row
- Function returns error when rows missing or modified
- Function returns warning when row count delta != 1
- Build passes with no type errors

## Risk Assessment
- **Low risk:** Additive function, no changes to existing logic
- Whitespace normalization in comparison prevents false positives from formatting differences

## Next Steps
→ Phase 2: Fix version extraction (uses same section parsing)
