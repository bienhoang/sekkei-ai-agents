# Phase 1: Preserve Changelog on Regeneration

## Context Links

- Parent: [plan.md](./plan.md)
- Brainstorm: [brainstorm report](../reports/brainstorm-260224-1044-changelog-consistency-gaps.md)

## Overview

- **Priority:** P1 — CRITICAL
- **Status:** completed
- **Description:** Add `existing_content` optional param to `generate_document` tool so 改訂履歴 is preserved when regenerating an existing document.

## Key Insights

- `generate_document` currently builds output from: template + AI instructions + input content
- No param for existing document content → regeneration creates doc from scratch → 改訂履歴 lost
- Python `diff_analyzer.py` already generates suggested 改訂履歴 rows (no changes needed there)
- `update.ts` already returns `revision_history_row` in response (no changes needed there)

## Requirements

### Functional
- FR1: `generate_document` accepts optional `existing_content` string param
- FR2: When `existing_content` provided, extract 改訂履歴 section
- FR3: Inject extracted section + preservation instruction into generation context
- FR4: AI must preserve all existing rows and append new row

### Non-functional
- NFR1: existing_content max 500KB (same as input_content)
- NFR2: No breaking changes to existing generate_document calls (param is optional)

## Architecture

```
generate_document(existing_content?)
  → extractRevisionHistory(existing_content)
  → buildChangelogPreservationInstruction(extractedSection)
  → inject into AI context alongside template + input
  → AI preserves rows + appends new row
```

## Related Code Files

| File | Lines | Change |
|------|-------|--------|
| `src/tools/generate.ts` | 30-61, 131-150, 154-226, 280-289 | Add param, extract, inject |
| `src/lib/generation-instructions.ts` | 411+ | Add `buildChangelogPreservationInstruction()` |

## Implementation Steps

### Step 1: Add `existing_content` param to inputSchema (generate.ts)

After line 60, add:
```typescript
existing_content: z.string().max(500_000).optional()
  .describe("Existing document content to preserve 改訂履歴 when regenerating"),
```

Add to destructuring at line 154 and to `registerGenerateDocumentTool` callback at line 341.

### Step 2: Add extraction helper (generate.ts)

After `buildUpstreamIdsBlock()` (line 76), add:
```typescript
/** Extract existing 改訂履歴 section from document content */
function extractRevisionHistory(content: string): string {
  const match = content.match(/^(#{1,4}\s+改訂履歴\n[\s\S]*?)(?=^#{1,4}\s+[^改]|\s*$)/m);
  return match ? match[1].trim() : "";
}
```

### Step 3: Add `buildChangelogPreservationInstruction()` (generation-instructions.ts)

After line 411:
```typescript
export function buildChangelogPreservationInstruction(existingRevisionHistory: string): string {
  return [
    "## Changelog Preservation (MANDATORY)",
    "",
    "This document is being REGENERATED. You MUST preserve the existing revision history.",
    "",
    "### Existing 改訂履歴 (copy EXACTLY as-is):",
    "",
    existingRevisionHistory,
    "",
    "### Rules:",
    "1. Copy ALL existing rows into the 改訂履歴 table WITHOUT modification",
    "2. Append ONE new row: next version number | today's date | brief change summary | (empty 変更者)",
    "3. Version increment: +0.1 for minor changes (e.g., 1.0 → 1.1)",
    "4. Do NOT reorder, edit, or remove existing rows",
  ].join("\n");
}
```

### Step 4: Inject into generation context (generate.ts)

After the traceability block injection (~line 255), add:
```typescript
if (existing_content) {
  const revisionHistory = extractRevisionHistory(existing_content);
  if (revisionHistory) {
    sections.push(``, buildChangelogPreservationInstruction(revisionHistory));
  }
}
```

Import `buildChangelogPreservationInstruction` from generation-instructions.ts at file top.

### Step 5: Update skill flow references

In skill phase references (phase-design.md, phase-requirements.md, etc.), when calling `generate_document` for regeneration, pass `existing_content` from disk:
- Read existing file → pass as `existing_content`
- This is a skill-layer concern (Claude reads file, passes content)

## Todo

- [x] Add `existing_content` to Zod schema in generate.ts
- [x] Add `extractRevisionHistory()` helper in generate.ts
- [x] Add `buildChangelogPreservationInstruction()` in generation-instructions.ts
- [x] Inject preservation instruction into context in generate.ts
- [x] Update registerGenerateDocumentTool callback
- [x] Build & lint check
- [x] Write unit test for extractRevisionHistory()

## Success Criteria

- `generate_document` with `existing_content` returns context including preserved 改訂履歴
- `generate_document` without `existing_content` works exactly as before (backward compat)
- Unit test: extraction regex handles various heading levels (##, ###, ####)

## Risk Assessment

- **LOW:** Regex extraction might miss edge-case formatting → mitigate with test cases
- **LOW:** AI might ignore preservation instruction → mitigate with explicit "MANDATORY" wording

## Next Steps

→ Phase 2: Global changelog manager uses same extraction logic
