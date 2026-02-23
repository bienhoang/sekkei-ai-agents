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
3. Route per routing table below
4. Delegate to MANAGER → save output, update phase
5. Present result to user
```

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
Questions generated. Send to client.
When client replies, run /sekkei:rfp again.
```

### WAITING_CLIENT
```
Client replied? Paste answer or type BUILD_NOW.
```

### SCOPE_FREEZE complete
```
Scope frozen. Confidence: {HIGH|MEDIUM|LOW}.
→ HIGH/MEDIUM: Run /sekkei:functions-list? [Y/n]
→ LOW: Do not proceed. Resolve blocking issues first.
```

### Overwrite check
If re-entering a phase where output file exists:
```
{filename} exists. Overwrite? [Y/n]
```

---

# SEKKEI CHAIN INTEGRATION

- Workspace: `sekkei-docs/01-rfp/<project-name>/`
- Handoff: `05_proposal.md` → input for `/sekkei:functions-list`
- Supplementary context: `02_analysis.md`

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
