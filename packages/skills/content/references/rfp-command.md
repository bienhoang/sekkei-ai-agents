# /sekkei:rfp — Presales RFP Lifecycle

End-to-end presales workflow. Resumable. Deterministic. File-based state.

---

# PROGRESS DASHBOARD

On every startup and phase change, display:

```
=== RFP Lifecycle: {project-name} ===
[*] RFP Received        01_raw_rfp.md ({size})
[*] Analysis             02_analysis.md ({size})
[*] Q&A Generation       03_questions.md ({size})  Round {N}
[ ] Client Answers       04_client_answers.md
[ ] Proposal             05_proposal.md
[ ] Scope Freeze         06_scope_freeze.md
---
Current: {PHASE} | Next: {next_action}
```

`[*]` = file has content. `[ ]` = empty/pending. Show file sizes. Show Q&A round if > 0.

---

# USER INTERACTION

Style: senior presales architect + project manager. Direct. Short sentences.
Protect engineering team. Operational realism. No marketing.

### Init
```
Project name?
→ (create workspace)
Paste RFP.
```
### QNA_GENERATION complete
```
Questions generated ({count} questions: {P1_count} critical, {P2_count} architecture, {P3_count} operation).
Options:
  1. Send questions to client, run /sekkei:rfp when they reply
  2. Type BUILD_NOW to draft proposal with assumptions
  3. Type BACK to re-run analysis with adjustments
  4. Type SHOW to review current questions
```
### WAITING_CLIENT
```
Q&A Round {N} — waiting for client response.
Options:
  1. Paste client answers (recommended)
  2. Type BUILD_NOW to draft proposal with current assumptions
  3. Type BACK to regenerate questions
  4. Type SHOW to review what was sent
```
### SCOPE_FREEZE complete
```
Scope frozen. Confidence: {HIGH|MEDIUM|LOW}.
Handoff Readiness: {score}%
→ HIGH/MEDIUM: Run /sekkei:requirements to begin V-model chain. [Y/n]
→ LOW: Resolve blocking issues first. Type BACK to revise.
```
### Overwrite check
```
{filename} exists ({size}).
Options:
  1. Overwrite with new version
  2. View diff of changes first
  3. Keep existing, skip this step
```

---

# NAVIGATION KEYWORDS

| Keyword | Action |
|---------|--------|
| `SHOW` | Display current phase output summary |
| `BACK` | Go to previous phase (uses back action with force) |
| `SKIP_QNA` | From QNA_GENERATION, jump to DRAFTING |
| `BUILD_NOW` | Draft proposal without client answers |

---

# SEKKEI CHAIN INTEGRATION

- Workspace: `workspace-docs/01-rfp/`
- Handoff: `05_proposal.md` → input for `/sekkei:requirements`
- Supplementary context: `02_analysis.md`
- On scope freeze with HIGH/MEDIUM confidence, offer to run `generate-config` action
