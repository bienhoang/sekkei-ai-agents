# /sekkei:change — Change Request Lifecycle

Track and propagate specification changes across the V-model chain.

---

# ENTRYPOINT BEHAVIOR

1. Parse subcommand (default: new CR, --resume, --status, --list, --cancel)
2. For new CR: collect inputs, run full workflow
3. For resume: load CR, route to current step
4. Display PROGRESS DASHBOARD after each step

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

For each step:
  Call `manage_change_request` action=propagate_next with cr_id, config_path.
  - If upstream: show suggestion text, ask user to confirm/skip
  - If downstream: show regeneration instruction, optionally call generate_document
  Ask: done with this step? [Y/skip/abort]
Repeat until all_steps_complete.

## Step 6: Validate

Call `manage_change_request` action=validate with cr_id, config_path.
Display validation report (chain ref issues if any).

## Step 7: Complete

Call `manage_change_request` action=complete.
Display completion summary with all steps reviewed.

---

# RESUME BEHAVIOR

Load CR via action=status → check status → route:

| CR Status | Resume Point |
|-----------|-------------|
| INITIATED | Step 3 (analyze) |
| ANALYZING / IMPACT_ANALYZED | Step 4 (approve) |
| APPROVED / PROPAGATING | Step 5 (propagate, at current index) |
| VALIDATED | Step 7 (complete) |
| COMPLETED / CANCELLED | Show status only |

---

# DESIGN PRINCIPLES

- One step at a time — user confirms each propagation
- Upstream = suggest (safe, non-destructive)
- Downstream = regenerate (semi-auto, needs review)
- Always resumable — CR file is the state
- Conflict warnings are advisory, not blocking
- Git checkpoint created before first propagation for rollback safety
