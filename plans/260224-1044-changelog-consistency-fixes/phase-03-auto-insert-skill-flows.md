# Phase 3: Auto-Insert in Skill Flows

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 1](./phase-01-preserve-changelog.md)

## Overview

- **Priority:** P3
- **Status:** completed
- **Description:** Update `/sekkei:update` and `/sekkei:change` skill flows to auto-insert suggested 改訂履歴 rows into documents, removing manual copy requirement.

## Key Insights

- `analyze_update` already returns `revision_history_row` — but skill flow shows it and leaves user to copy
- CR `propagate_next` returns instructions but no 改訂履歴 row
- Fix is entirely in skill flow markdown (no backend changes needed here)
- These are AI instructions to Claude, not code — changes are declarative

## Requirements

- FR1: `/sekkei:update` flow auto-inserts suggested 改訂履歴 row into document before showing to user
- FR2: `/sekkei:change` propagation step includes 改訂履歴 row in instruction output
- FR3: User reviews document with row already inserted (can edit before save)

## Related Code Files

| File | Change |
|------|--------|
| `skills/content/references/utilities.md` | Update /sekkei:update flow steps |
| `skills/content/references/change-request-command.md` | Update propagation step |

## Implementation Steps

### Step 1: Update `/sekkei:update` flow (utilities.md)

Current flow (lines ~103-120):
```
Step 4: Call analyze_update with revision_mode: true
Step 5: Display change report
Step 6: Ask user to regenerate
```

Updated flow:
```
Step 4: Call analyze_update with revision_mode: true
Step 5: Display change report + suggested 改訂履歴 row
Step 6: Read current downstream document from disk
Step 7: Insert suggested 改訂履歴 row into document's 改訂履歴 table
Step 8: Show user the updated document section for review
Step 9: Ask user: confirm & save? Or edit the row first?
Step 10: If regenerating, pass updated document as existing_content to generate_document
```

Key addition: Between analyze_update response and user decision, the skill **auto-inserts** the suggested row.

### Step 2: Update `/sekkei:change` propagation (change-request-command.md)

Current propagation step (~lines 72-79):
```
Step 5: Call propagate_next → get instruction
Step 6: Follow instruction (upstream=suggest, downstream=regenerate)
```

Updated:
```
Step 5: Call propagate_next → get instruction
Step 6: For each propagated document:
  a. Read current document from disk
  b. Build 改訂履歴 row: version +0.1, today's date, CR description + changed IDs summary
  c. Insert row into document's 改訂履歴 table
  d. If downstream: pass updated document as existing_content to generate_document
  e. If upstream: show suggested additions with 改訂履歴 row already inserted
Step 7: After all propagation, confirm changes with user
```

### Step 3: Add row insertion instruction pattern

Add reusable instruction block to both flows:

```markdown
### 改訂履歴 Row Insertion
1. Read current document content
2. Find the 改訂履歴 table (## 改訂履歴 heading)
3. Find the last data row (after header row and separator)
4. Parse last version number (e.g., "1.0")
5. Compute next version: increment minor by 0.1 (e.g., "1.0" → "1.1")
6. Insert new row: | {next_version} | {today YYYY-MM-DD} | {change_summary} | |
7. The 変更者 column is left empty for user to fill
```

## Todo

- [x] Update utilities.md /sekkei:update flow with auto-insert steps
- [x] Update change-request-command.md propagation with 改訂履歴 handling
- [x] Ensure both flows reference existing_content param from Phase 1

## Success Criteria

- `/sekkei:update` shows document with 改訂履歴 row already inserted
- `/sekkei:change` propagation inserts 改訂履歴 row per affected document
- User can review/edit before final save
- No extra manual copy step needed

## Risk Assessment

- **LOW:** Skill flow is AI instructions — Claude may interpret slightly differently
- **MITIGATION:** Use explicit, numbered steps with concrete examples

## Next Steps

→ Phase 4: Validation catches cases where auto-insert was skipped
