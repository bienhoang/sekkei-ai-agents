# Phase 4: Skill Flow Updates (High — G1/G5)

## Context Links
- Parent: [plan.md](plan.md)
- Depends on: Phase 1 (validation concept), Phase 3 (`auto_insert_changelog` param)

## Overview
- **Priority:** P0 — High
- **Status:** completed
- **Description:** Fix upstream/origin doc changelog gaps in both `/sekkei:update` and `/sekkei:change` skill flows. Add post-generation validation steps.

## Key Insights
- **G1:** `/sekkei:update` updates downstream 改訂履歴 but NOT the upstream doc that was directly edited
- **G5:** `/sekkei:change` handles propagated docs but origin doc 改訂履歴 is never updated
- Both flows lack post-generation validation for 改訂履歴 preservation

## Related Code Files
- **Modify:** `sekkei/packages/skills/content/references/utilities.md` (G1)
- **Modify:** `sekkei/packages/skills/content/references/change-request-command.md` (G5)

## Implementation Steps

### G1 Fix: utilities.md — Upstream doc changelog

After step 7 (display analyze_update results), before step 8 (auto-insert downstream):

```markdown
7b. **Auto-insert 改訂履歴 row into upstream document**:
   a. Read upstream document from disk: `{output.directory}/{upstream-dir}/{upstream-type}.md`
   b. Find the 改訂履歴 table, parse last version number
   c. Compute next version: increment minor by 0.1
   d. Insert new row: `| {next_version} | {today YYYY-MM-DD} | {change_summary from analyze_update} | |`
   e. Show user the updated upstream 改訂履歴 section for review
   f. If user confirms: save upstream document
   g. Note: upstream doc's 改訂履歴 now reflects the direct edit
```

After step 10 (regeneration), add post-generation validation:

```markdown
11. **Post-generation validation**:
   a. Read the newly generated/saved downstream document
   b. Compare 改訂履歴 rows: all rows from existing_content (step 8) must exist in new output
   c. If rows missing or modified: warn user — "⚠ 改訂履歴 rows may not have been preserved correctly. Please check the 改訂履歴 section and retry generation if needed."
   d. If all rows preserved + 1 new row: confirm — "✓ 改訂履歴 preserved successfully."
```

### G5 Fix: change-request-command.md — Origin doc changelog

In Step 5 (Propagate loop), add before first propagation step:

```markdown
## Step 5: Propagate (loop)

**Before first propagation step — Origin document 改訂履歴:**
  a. Read origin document from disk
  b. Find the 改訂履歴 table, parse last version number
  c. Build new row: version +0.1, today's date, "CR {CR-ID}: {description}"
  d. Insert row into origin document's 改訂履歴 table
  e. Show user for confirmation: "Origin document {origin_doc} 改訂履歴 will be updated:"
  f. Save origin document
  g. Note: "Origin document 改訂履歴 updated before propagation begins"

For each step:
  ...existing propagation logic...
```

Add post-generation validation after downstream regeneration within the loop:

```markdown
  - If downstream: show regeneration instruction, optionally call generate_document
    - **Post-generation check**: After regeneration completes:
      a. Read regenerated document
      b. Compare 改訂履歴 rows with the existing_content that was passed to generate_document
      c. If rows missing: warn user — "⚠ 改訂履歴 preservation check failed for {doc_type}. Recommend re-running generation."
      d. If preserved: continue to next step
```

### Optional: Simplify with auto_insert_changelog

Both flows can optionally pass `auto_insert_changelog: true` to `generate_document` instead of manually inserting rows. This provides dual safety: skill inserts + MCP verifies.

Update downstream regeneration calls in both files:
```markdown
Pass `auto_insert_changelog: true` and `change_description: "{summary}"` to `generate_document` along with `existing_content`.
This lets MCP auto-insert the 改訂履歴 row as a safety net (in case skill-level insertion was missed).
```

## Todo
- [ ] utilities.md: Add step 7b (upstream doc changelog)
- [ ] utilities.md: Add step 11 (post-generation validation)
- [ ] change-request-command.md: Add origin doc changelog before first propagation
- [ ] change-request-command.md: Add post-generation validation after downstream regeneration
- [ ] Both files: Mention `auto_insert_changelog` param in generate_document calls

## Success Criteria
- Direct edit flow: both upstream AND downstream docs get 改訂履歴 rows
- CR flow: origin doc gets 改訂履歴 row before propagation starts
- Post-generation check warns user if rows lost
- No breaking changes to existing flow structure

## Risk Assessment
- **Low:** Skill files are markdown instructions (no compilation)
- Steps are additive — existing flow preserved, new steps inserted between existing ones
- Post-generation validation is advisory (warn, not block)

## Next Steps
→ Phase 5: Unit tests for all new functions
