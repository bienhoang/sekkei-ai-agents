> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

# /sekkei:rfp — Presales RFP Lifecycle

End-to-end presales workflow. Resumable. Deterministic. File-based state.

---

# ARCHITECTURE

3-layer system:

| Layer | File | Responsibility |
|-------|------|----------------|
| **Entrypoint** | `rfp-command.md` (this) | Routing, UX, delegation |
| **State** | `rfp-manager.md` | Workspace, files, persistence, resume |
| **Analysis** | `rfp-loop.md` | Presales intelligence, risk, Q&A |

Entrypoint delegates to State for all file ops, to Analysis for all thinking.

---

# ENTRYPOINT BEHAVIOR

```
1. Delegate to MANAGER → load workspace / initialize
2. Receive current phase from MANAGER's startup report
3. Display PROGRESS DASHBOARD (below)
4. Route per routing table
5. Delegate to MANAGER → save output, update phase
6. Present result to user
```

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

# ROUTING TABLE

| Current Phase | Action | Delegate To |
|---------------|--------|-------------|
| (no workspace) | Init workspace, ask for RFP | MANAGER |
| `RFP_RECEIVED` | Run deep analysis | ANALYSIS Flow 1 |
| `ANALYZING` | Generate Q&A for client | ANALYSIS Flow 2 |
| `QNA_GENERATION` | Ask user: wait or draft? | UX (below) |
| `WAITING_CLIENT` | Check for client answers | UX (below) |
| `DRAFTING` | Draft proposal with assumptions | ANALYSIS Flow 3 |
| `CLIENT_ANSWERED` | Analyze answers, update reqs | ANALYSIS Flow 4 |
| `PROPOSAL_UPDATE` | Generate/update proposal | ANALYSIS Flow 5 |
| `SCOPE_FREEZE` | Finalize + handoff prompt | ANALYSIS Flow 6 |

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

### Navigation Keywords

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

---

# DESIGN PRINCIPLES

- Success = no surprise during development
- Files are truth, not chat history
- Every step saves state before proceeding
- Behave as: presales manager + BA + solution architect + workflow engine
- NOT just a text generator

---

# PHASE REFERENCE

See `references/rfp-manager.md` for phase enum, transition rules, and file write rules.
See `references/rfp-loop.md` for analysis flow details.
