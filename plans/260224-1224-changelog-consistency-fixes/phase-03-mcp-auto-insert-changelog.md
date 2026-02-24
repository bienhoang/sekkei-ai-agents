# Phase 3: MCP-Level Changelog Auto-Insert (Medium — G6)

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: Phase 2 (`incrementVersion`, hardened `extractVersionFromContent`)

## Overview
- **Priority:** P1 — Medium
- **Status:** completed
- **Description:** Add optional `auto_insert_changelog` param to `generate_document`. When enabled, MCP handler auto-inserts 改訂履歴 row into `existing_content` before building preservation instruction. Moves changelog insertion from skill-only to MCP-supported.

## Key Insights
- Currently changelog insertion is ONLY in skill layer (utilities.md, change-request-command.md)
- MCP handler receives already-updated `existing_content` — if skill forgets to insert, row is lost
- Adding MCP-level support provides a safety net and simplifies skill flows

## Related Code Files
- **Modify:** `sekkei/packages/mcp-server/src/tools/generate.ts`
  - Add `auto_insert_changelog` to input schema
  - Add `change_description` optional param (for the changelog row)
  - Add auto-insert logic before changelog preservation block

## Implementation Steps

1. Add new params to `inputSchema` in generate.ts:
   ```typescript
   auto_insert_changelog: z.boolean().default(false).optional()
     .describe("Auto-insert new 改訂履歴 row before preservation. Requires existing_content."),
   change_description: z.string().max(200).optional()
     .describe("Change description for auto-inserted 改訂履歴 row (default: 'Updated from upstream')"),
   ```

2. Add to `GenerateDocumentArgs` interface:
   ```typescript
   auto_insert_changelog?: boolean;
   change_description?: string;
   ```

3. Add auto-insert logic BEFORE the changelog preservation block (before L304):
   ```typescript
   // Auto-insert 改訂履歴 row when requested
   let effectiveExistingContent = existing_content;
   if (auto_insert_changelog && existing_content) {
     const { extractVersionFromContent, incrementVersion } = await import("../lib/changelog-manager.js");
     const oldVer = extractVersionFromContent(existing_content);
     const newVer = incrementVersion(oldVer);
     const today = new Date().toISOString().slice(0, 10);
     const desc = change_description ?? "Updated from upstream";
     const newRow = `| ${newVer} | ${today} | ${desc} | |`;

     // Find 改訂履歴 table and insert row after last data row
     effectiveExistingContent = insertChangelogRow(existing_content, newRow);
   }
   ```

4. Add helper function `insertChangelogRow()` in generate.ts:
   ```typescript
   /** Insert a new row at the end of the 改訂履歴 table */
   function insertChangelogRow(content: string, newRow: string): string {
     const lines = content.split("\n");
     let lastDataRowIdx = -1;
     let inSection = false;
     for (let i = 0; i < lines.length; i++) {
       if (/^#{1,4}\s+改訂履歴/.test(lines[i])) { inSection = true; continue; }
       if (inSection && /^#{1,4}\s/.test(lines[i])) break;
       if (inSection && /^\|\s*\d+\.\d+\s*\|/.test(lines[i])) {
         lastDataRowIdx = i;
       }
     }
     if (lastDataRowIdx === -1) return content; // no table found, return unchanged
     lines.splice(lastDataRowIdx + 1, 0, newRow);
     return lines.join("\n");
   }
   ```

5. Use `effectiveExistingContent` instead of `existing_content` in the preservation block:
   ```typescript
   if (effectiveExistingContent) {
     const revisionHistory = extractRevisionHistory(effectiveExistingContent);
     // ...
   }
   ```

6. Update the tool registration to pass new params through

7. Also use `effectiveExistingContent` for the global CHANGELOG version extraction block

## Todo
- [ ] Add `auto_insert_changelog` and `change_description` to input schema
- [ ] Add to `GenerateDocumentArgs` interface
- [ ] Add `insertChangelogRow()` helper
- [ ] Add auto-insert logic before preservation block
- [ ] Replace `existing_content` references with `effectiveExistingContent` in downstream blocks
- [ ] Update tool registration to pass new params
- [ ] Build passes

## Success Criteria
- `auto_insert_changelog=false` (default): behavior unchanged
- `auto_insert_changelog=true` + `existing_content`: new row inserted before preservation
- `auto_insert_changelog=true` without `existing_content`: ignored gracefully
- New row appears in preservation instruction with correct version

## Risk Assessment
- **Low:** Optional param, default false, backward compatible
- `insertChangelogRow` returns content unchanged if no 改訂履歴 table found

## Next Steps
→ Phase 4: Update skill flows to use `auto_insert_changelog`
