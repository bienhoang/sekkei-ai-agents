# Phase 4: Skill Command

## Context Links

- Pattern: `skills/content/SKILL.md` — command listing, workflow router section
- Pattern: `skills/content/references/rfp-command.md` — 3-layer architecture, routing table, UX patterns
- Pattern: `skills/content/references/rfp-manager.md` — state management, file persistence

## Overview

- **Priority:** P2 (UX layer — system works without it via raw MCP tool)
- **Status:** pending
- **Description:** Add `/sekkei:change` skill command with interactive workflow, resume, status, list, cancel

## Key Insights

- Follow RFP 3-layer pattern but simpler: only 1 reference file needed (CR is less complex than RFP's 3-file split)
- Skill file is pure Markdown — instructions for Claude, not executable code
- `/sekkei:change` delegates all ops to `manage_change_request` MCP tool
- Resume via `--resume CR-YYMMDD-NNN` flag — reads CR status, routes to appropriate step
- Unlike RFP (which has 6 analysis flows), CR has a linear 5-step workflow

## Requirements

### Functional

1. Add `/sekkei:change` to SKILL.md command listing
2. Create `references/change-request-command.md` with full workflow instructions
3. Support subcommands: (no arg), --resume, --status, --list, --cancel
4. Interactive UX: step-by-step with confirmation at each stage

### Non-Functional
- Skill file < 200 lines
- Clear, concise instructions (LLM-optimized)
- Match rfp-command.md tone/style

## Architecture

Single-layer skill (simpler than RFP's 3-layer):

```
skills/content/SKILL.md                          — Add command listing (3-line edit)
skills/content/references/change-request-command.md  — Full workflow (~150 LOC)
```

### Workflow Phases

```
/sekkei:change
  1. Ask: which doc changed? What IDs changed? Description?
  2. Call manage_change_request action=create
  3. Call manage_change_request action=analyze
  4. Display impact report + backfill suggestions
  5. Ask: approve? (show conflicts if any)
  6. Call manage_change_request action=approve
  7. Loop: call action=propagate_next, display instruction, wait for user
  8. Call manage_change_request action=validate
  9. Call manage_change_request action=complete
  10. Display completion summary
```

## Related Code Files

### Files to Create
- `sekkei/packages/skills/content/references/change-request-command.md`

### Files to Edit
- `sekkei/packages/skills/content/SKILL.md` — add `/sekkei:change` to command list + router section

## Implementation Steps

### Step 1: Update SKILL.md

Add to "Other Commands" section:
```markdown
- `/sekkei:change` — Change request lifecycle (impact analysis → approval → propagation → validation)
```

Add to "Workflow Router" section:
```markdown
### Change Request

> Read `references/change-request-command.md`
Commands: change
```

Add to "References" section:
```markdown
- `references/change-request-command.md` — Change request workflow: impact analysis, propagation, conflict detection
```

### Step 2: Create change-request-command.md

Structure (following rfp-command.md pattern):

```markdown
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

=== Change Request: {CR-ID} ===
[ ] Create          {origin_doc} → {changed_ids}
[ ] Analyze         Impact: {N affected sections}
[ ] Approve         Conflicts: {none|N warnings}
[ ] Propagate       Step {M}/{total} — {current_doc}
[ ] Validate        Chain refs: {ok|N issues}
[ ] Complete
---
Current: {STATUS}

---

# ROUTING TABLE

| Subcommand | Action |
|------------|--------|
| (default) | Start new CR workflow |
| --resume CR-ID | Load CR, route to current phase |
| --status CR-ID | Show CR details |
| --list [--filter STATUS] | List all CRs |
| --cancel CR-ID [reason] | Cancel CR |

# NEW CR WORKFLOW

## Step 1: Collect Inputs
Ask user:
- Which document was modified? (show doc type list)
- Which IDs changed? (e.g. REQ-003, F-005)
- Brief description of the change

## Step 2: Create
Call manage_change_request action=create
Display CR ID

## Step 3: Analyze
Call manage_change_request action=analyze
Display impact report (affected sections, Mermaid graph)
Display backfill suggestions (upstream additions)

## Step 4: Approve
Show conflict warnings if any
Ask: proceed with propagation? [Y/n]
Call manage_change_request action=approve

## Step 5: Propagate (loop)
For each step:
  Call manage_change_request action=propagate_next
  If upstream: show suggestion, ask user to confirm
  If downstream: show regeneration instruction
  Ask: done with this step? [Y/skip/abort]

## Step 6: Validate
Call manage_change_request action=validate
Display validation report

## Step 7: Complete
Call manage_change_request action=complete
Display summary

# RESUME BEHAVIOR
Load CR → check status → route:
- INITIATED: go to Step 3 (analyze)
- ANALYZING/IMPACT_ANALYZED: go to Step 4 (approve)
- APPROVED/PROPAGATING: go to Step 5 (propagate, at current index)
- VALIDATED: go to Step 7 (complete)
- COMPLETED/CANCELLED: show status only

# DESIGN PRINCIPLES
- One step at a time — user confirms each propagation
- Upstream = suggest (safe, non-destructive)
- Downstream = regenerate (semi-auto, needs review)
- Always resumable — CR file is the state
- Conflict warnings are advisory, not blocking
```

## Todo List

- [ ] Add /sekkei:change to SKILL.md Other Commands section
- [ ] Add Change Request to SKILL.md Workflow Router section
- [ ] Add reference link to SKILL.md References section
- [ ] Create change-request-command.md with full workflow
- [ ] Include routing table for subcommands
- [ ] Include progress dashboard format
- [ ] Include resume behavior routing
- [ ] Include propagation loop with upstream/downstream differentiation

## Success Criteria

- `/sekkei:change` appears in SKILL.md command list
- Workflow router loads change-request-command.md
- Full interactive workflow documented for LLM execution
- Resume routes correctly based on CR status
- UX matches rfp-command.md quality/style

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Skill too long (>200 lines) | Medium | Keep concise; omit verbose examples |
| LLM misinterprets propagation loop | Low | Clear step-by-step with explicit tool calls |

## Security Considerations

- Skill is pure instruction text, no code execution
- All actual operations delegated to validated MCP tool

## Next Steps

Phase 5 writes tests for Phases 1-3.
