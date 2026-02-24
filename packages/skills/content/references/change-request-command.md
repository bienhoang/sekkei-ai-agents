> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# /sekkei:change — Change Request Lifecycle

Track and propagate specification changes across the V-model chain.

---

# ENTRYPOINT BEHAVIOR

1. Parse subcommand (default: new CR, --resume, --status, --list, --cancel, --rollback)
2. For new CR: collect inputs, run full workflow
3. For resume: load CR, route to current step
4. For rollback: restore documents to pre-CR git checkpoint
5. Display PROGRESS DASHBOARD after each step

---

# PROGRESS DASHBOARD

```
=== Change Request: {CR-ID} ===
[ ] Create          {origin_doc} → {changed_ids}
[ ] Analyze         Impact: {N affected sections}
[ ] Approve         Conflicts: {none|N warnings}
[ ] Propagate       Step {M}/{total} — {current_doc}
[ ] Validate        Chain refs: {ok|N issues}
[ ] Complete
---
Current: {STATUS}
```

`[*]` = done. `[ ]` = pending. Show propagation progress.

---

# ROUTING TABLE

| Subcommand | Action |
|------------|--------|
| (default) | Start new CR workflow |
| --resume CR-ID | Load CR, route to current phase |
| --status CR-ID | Show CR details |
| --list [--filter STATUS] | List all CRs |
| --cancel CR-ID [reason] | Cancel CR |
| --rollback CR-ID | Restore all docs to pre-CR git checkpoint |

---

# NEW CR WORKFLOW

## Step 1: Collect Inputs

Ask user:
- Which document was modified? (show doc type list from chain)
- Which IDs changed? (e.g. REQ-003, F-005) — or provide old/new content for auto-detect
- Brief description of the change

## Step 2: Create

Call `manage_change_request` action=create with workspace_path, origin_doc, description, changed_ids.
Display CR ID in dashboard.

## Step 3: Analyze

Call `manage_change_request` action=analyze with cr_id, config_path.
Display impact report: affected sections, Mermaid dependency graph.
Display backfill suggestions (upstream additions needed).

## Step 4: Approve

Show conflict warnings if any (advisory, not blocking).
Ask: proceed with propagation? [Y/n]
Call `manage_change_request` action=approve.

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
  Call `manage_change_request` action=propagate_next with cr_id, config_path.
  - If upstream: show suggestion text, ask user to confirm/skip
  - If downstream: show regeneration instruction, optionally call generate_document
    - Pass `auto_insert_changelog: true` and `change_description: "CR {CR-ID}: {summary}"` to `generate_document`
    - **Post-generation check**: After regeneration completes:
      a. Read regenerated document
      b. Compare 改訂履歴 rows with the `existing_content` passed to `generate_document`
      c. If rows missing: warn user — "⚠ 改訂履歴 preservation check failed for {doc_type}. Recommend re-running generation."
      d. If preserved: continue to next step
  - **改訂履歴 handling** for each propagated document:
    a. Read current document from disk
    b. Find the 改訂履歴 table, parse last version number
    c. Build new row: version +0.1, today's date, CR description + changed IDs summary
    d. Insert row into document's 改訂履歴 table
    e. If downstream: pass updated document as `existing_content` to `generate_document`
    f. If upstream: show suggested additions with 改訂履歴 row already inserted
  Ask: done with this step? [Y/skip/abort]
Repeat until all_steps_complete.

## Step 6: Validate

Call `manage_change_request` action=validate with cr_id, config_path.
Display validation report (chain ref issues if any).

## Step 7: Complete

Call `manage_change_request` action=complete.
Display completion summary with all steps reviewed.

---

# ROLLBACK WORKFLOW

Available when CR status is `PROPAGATING`, `VALIDATED`, or `COMPLETED` (within same session).

## Step 1: Load CR State

Call `manage_change_request` action=status with cr_id.
Display which documents were modified during propagation.

## Step 2: Confirm Rollback

Show warning: "This will restore all modified documents to the pre-CR git checkpoint. Regenerated docs will be overwritten. Proceed? [Y/n]"

## Step 3: Execute Rollback

Call `manage_change_request` action=rollback with cr_id, config_path.
- Restores affected doc files from git checkpoint created in Step 5 (before first propagation)
- Sets CR status to `CANCELLED`
- Reports restored files and git refs used

## Step 4: Display Results

Show restored file list, CR status, and suggestion:
> "Rollback complete. CR {CR-ID} cancelled. Run `/sekkei:change --status {CR-ID}` to review history."

---

# RESUME BEHAVIOR

Load CR via action=status → check status → route:

| CR Status | Resume Point |
|-----------|-------------|
| INITIATED | Step 3 (analyze) |
| ANALYZING / IMPACT_ANALYZED | Step 4 (approve) |
| APPROVED / PROPAGATING | Step 5 (propagate, at current index) |
| VALIDATED | Step 7 (complete) |
| COMPLETED | Show status only |
| CANCELLED | Show status only (rollback already applied) |

Use `--rollback CR-ID` to undo a CR that is `PROPAGATING`, `VALIDATED`, or `COMPLETED`.

---

# DESIGN PRINCIPLES

- One step at a time — user confirms each propagation
- Upstream = suggest (safe, non-destructive)
- Downstream = regenerate (semi-auto, needs review)
- Always resumable — CR file is the state
- Conflict warnings are advisory, not blocking
- Git checkpoint created before first propagation for rollback safety
