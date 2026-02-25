# /sekkei:rfp — Architecture Analysis & Gap Assessment

> Analysis date: 2026-02-25 | Scope: Full RFP presales lifecycle architecture
> Last updated: 2026-02-25 (post-implementation)

---

## 1. Architecture Overview

### 3-Layer System

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: ENTRYPOINT (rfp-command.md)                        │
│  Routing, UX, progress dashboard, navigation keywords        │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: STATE MANAGER (rfp-manager.md)                     │
│  Workspace CRUD, phase tracking, file persistence, recovery  │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: ANALYSIS ENGINE (rfp-loop.md)                      │
│  6 flows: analyze, questions, draft, impact, proposal, freeze│
└──────────────────────────────────────────────────────────────┘
          ↕ MCP Tool: manage_rfp_workspace
┌──────────────────────────────────────────────────────────────┐
│  MCP BACKEND                                                  │
│  rfp-workspace.ts (tool handler + resolveRfpPath helper)     │
│  rfp-state-machine.ts (state logic, YAML via yaml pkg,       │
│    weighted system type scoring, fuzzy Feature Seed extract)  │
│  rfp-instructions.ts (MCP resource: 7 flow templates)        │
│  documents.ts (types: 11 phases incl. terminal states)       │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User pastes RFP → 01_raw_rfp.md (append-only)
  → Flow 1: Analyze → 02_analysis.md (rewrite)
    → Flow 2: Questions → 03_questions.md (rewrite)
      → Client answers → 04_client_answers.md (append-only)
        → Flow 4: Impact → 02_analysis.md (updated)
          → Flow 5: Proposal → 05_proposal.md (rewrite)
            → Flow 6: Freeze → 06_scope_freeze.md (checklist merge)
              → generate-config → sekkei.config.yaml
                → /sekkei:requirements (V-model chain starts)

Terminal exits: Any active phase → DECLINED | ON_HOLD | CANCELLED
Reactivation: ON_HOLD → any active phase

Side effects: 07_decisions.md (append-only, auto-logged D-NNN IDs)
State: 00_status.md (YAML via yaml pkg, phase + history + deadline + response_due)
```

### Phase State Machine

```
RFP_RECEIVED ──→ ANALYZING ──→ QNA_GENERATION ──→ WAITING_CLIENT
                     ↑              │ SKIP_QNA        │
                     │              ↓                  ↓
                     │          DRAFTING          CLIENT_ANSWERED
                     │              │                  │
                     │              ↓                  ↓
                     └──────── PROPOSAL_UPDATE ──→ SCOPE_FREEZE
                                    ↑                  │
                                    └──────────────────┘
                                      (force:true only)

Terminal states (reachable from ANY active phase):
  → DECLINED    (final, no exit)
  → CANCELLED   (final, no exit)
  → ON_HOLD     (can reactivate to any active phase)

Backward edges require force:true.
Forward transitions require content validation (file non-empty check).
Terminal transitions do NOT require force.
```

### Workspace Files

| File | Write Mode | Purpose |
|------|-----------|---------|
| `00_status.md` | YAML rewrite | Phase, history, deadline, response_due |
| `01_raw_rfp.md` | append | Original RFP (immutable) |
| `02_analysis.md` | rewrite | Deep analysis output |
| `03_questions.md` | rewrite | Q&A for client |
| `04_client_answers.md` | append | Client responses per round |
| `05_proposal.md` | rewrite | Proposal + Feature Seed table |
| `06_scope_freeze.md` | checklist | Scope freeze (merge, never delete) |
| `07_decisions.md` | append | Auto-logged D-NNN transitions + CR events |

### MCP Tool: `manage_rfp_workspace`

8 actions: `create`, `status`, `transition`, `write`, `read`, `history`, `back`, `generate-config`

**Path convention:** `workspace_path` always = project root. Tool internally resolves to `workspace-docs/01-rfp/` via `resolveRfpPath()`.

**Zod schema additions:** `deadline` (YYYY-MM-DD), `response_due` (YYYY-MM-DD) — optional, passed through to status on transition.

### Status YAML Format

```yaml
project: my-project
phase: ANALYZING
last_update: "2026-02-25"
next_action: Run deep analysis on RFP
blocking_issues:
  - missing budget info
assumptions:
  - team of 3 engineers
qna_round: 2
deadline: "2026-03-15"
response_due: "2026-03-01"
phase_history:
  - "RFP_RECEIVED|2026-02-24"
  - "ANALYZING|2026-02-25|Initial analysis"
```

Parsed/serialized via `yaml` package (v2.7+). Phase history entries stored as pipe-delimited strings for backward compat.

### System Type Detection

Weighted scoring across 30+ keywords. Each keyword contributes score to one or more project types. Highest total score wins (default: "web").

Example: "SaaS multi-tenant subscription" → saas: 3+3+2=8 (wins over any incidental keyword match).

### Feature Seed Extraction

Fuzzy heading match: `/^#{1,3}\s+[Ff]eature\s+[Ss]eeds?/`. Header row skip handles both English (`ID`) and Japanese (`名前`, `表示`) column names.

### Integration Points

- **CR system** → auto-appends to `07_decisions.md` on CR status changes (best-effort)
- **Chain status** → `chain.rfp` field points to `01-rfp/05_proposal.md`
- **Requirements generation** → auto-loads `02_analysis.md` + `06_scope_freeze.md` as input
- **Config generation** → weighted system type scoring + fuzzy Feature Seed extraction from proposal

---

## 2. Bugs Found & Fixed

### BUG-1: Hand-Rolled YAML Parser Is Fragile (Severity: HIGH) — FIXED

**Problem:** `parseStatusYaml()` used regex-based line parsing. Broke on colons, hashes, pipes, special chars in values.

**Fix:** Replaced with `yaml` package (`YAML.parse`/`YAML.stringify`). Removed `sanitizeYamlScalar()`. Phase history preserved as pipe-delimited strings inside YAML list for backward compat.

### BUG-2: workspace_path Semantic Inconsistency (Severity: MEDIUM) — FIXED

**Problem:** `create` treated `workspace_path` as project root; other actions expected full rfp dir path.

**Fix:** Added `resolveRfpPath(basePath)` helper. All non-`create` actions now resolve `workspace_path` → `workspace-docs/01-rfp/` internally. Zod description updated to "Path to project root directory".

### BUG-3: Phase Recovery QNA_GENERATION vs WAITING_CLIENT (Severity: LOW) — FIXED

**Problem:** `recoverPhase()` returned `WAITING_CLIENT` when `03_questions.md` exists, skipping user confirmation.

**Fix:** Now returns `QNA_GENERATION` (conservative — doesn't advance past user action boundary).

### BUG-4: Feature Seed Extraction Silently Fails (Severity: MEDIUM) — FIXED

**Problem:** Required exact `## Feature Seed` heading. Japanese headers caused data rows to be skipped.

**Fix:** Fuzzy regex `/^#{1,3}\s+[Ff]eature\s+[Ss]eeds?/`. Header skip handles `名前`/`表示` columns.

### BUG-5: Decision Log Has No Unique Identifiers (Severity: LOW) — FIXED

**Problem:** Headers `## YYYY-MM-DD — Phase: FROM → TO` could duplicate.

**Fix:** Sequential IDs: `## D-001 YYYY-MM-DD — Phase: FROM → TO`. Counter based on existing `## ` headers in file.

---

## 3. Design Gaps

### GAP-1: No Terminal States for Rejection/Cancellation — CLOSED

Resolved by P-3: `DECLINED`, `ON_HOLD`, `CANCELLED` phases added.

### GAP-2: No Deadline / Milestone Tracking — CLOSED

Resolved by P-4: `deadline` and `response_due` optional fields in status YAML.

### GAP-3: No Partial Answer Tracking (OPEN)

`04_client_answers.md` doesn't track per-question answered/pending/skipped status. No answer coverage metrics.

### GAP-4: Single Proposal Variant Only (OPEN)

No multi-variant support for Option A/B or phase-gated proposals.

### GAP-5: No Attachment Registry (OPEN)

No mechanism to reference non-markdown attachments (Excel, PDF, diagrams).

### GAP-6: System Type Detection Is Brittle — CLOSED

Resolved by P-7: Weighted scoring across 30+ keywords replaces first-match dictionary.

### GAP-7: No Japanese Enterprise Presales Conventions (OPEN)

Missing 稟議, 見積書, 要件確認書, NDA tracking, RFI/RFP/RFQ distinction.

### GAP-8: No Multi-RFP Support (OPEN)

Workspace hardcoded to `01-rfp/`. No concurrent RFP comparison.

### GAP-9: No Collaboration/Conflict Detection (OPEN)

No file locking or concurrent access handling.

### GAP-10: Phase History Grows Unbounded (OPEN)

No compaction or archival mechanism for large history arrays.

---

## 4. Uncovered Real-World Cases

### CASE-1: Client Sends Updated RFP Mid-Analysis (OPEN)

No "RFP revision received" action. No auto-staleness marking. No v1/v2 diff.

### CASE-2: Q&A Round Times Out (PARTIALLY ADDRESSED)

`response_due` field now exists (P-4) but no automated reminder or escalation logic.

### CASE-3: Scope Creep After Freeze (OPEN)

No propagation of "scope unfrozen" signal to downstream V-model chain.

### CASE-4: Multiple Stakeholders on Client Side (OPEN)

No stakeholder tracking or answer conflict resolution.

### CASE-5: RFP in Non-Text Format (OPEN)

No document import/parsing integration.

### CASE-6: Presales Team Review (OPEN)

No `INTERNAL_REVIEW` phase between PROPOSAL_UPDATE and delivery.

### CASE-7: Budget Constraint Discovery (OPEN)

No budget-triggered scope reduction workflow.

### CASE-8: Regulatory/Compliance Requirements (OPEN)

No industry-specific compliance templates.

---

## 5. Improvement Proposals

### Priority: HIGH

| # | Proposal | Effort | Impact | Status |
|---|----------|--------|--------|--------|
| P-1 | Replace hand-rolled YAML parser with `yaml` package | S | Eliminates BUG-1 | **done** |
| P-2 | Normalize `workspace_path` semantics across all actions | S | Eliminates BUG-2 | **done** |
| P-3 | Add terminal states: `DECLINED`, `ON_HOLD`, `CANCELLED` | S | Closes GAP-1 | **done** |
| P-4 | Add deadline fields to status YAML | S | Closes GAP-2 | **done** |
| P-5 | Improve Feature Seed extraction with fuzzy heading + JP headers | M | Fixes BUG-4 | **done** |

### Priority: MEDIUM

| # | Proposal | Effort | Impact | Status |
|---|----------|--------|--------|--------|
| P-6 | Add per-question answer tracking (Q-ID → status mapping) | M | Closes GAP-3 | backlog |
| P-7 | Weighted system type scoring instead of first-match | S | Fixes GAP-6 | **done** |
| P-8 | Add `attachments.json` registry to workspace | S | Closes GAP-5 | backlog |
| P-9 | Add `INTERNAL_REVIEW` phase between PROPOSAL_UPDATE and delivery | M | Covers CASE-6 | backlog |
| P-10 | Add RFP revision detection with upstream staleness signal | L | Covers CASE-1/3 | backlog |

### Priority: LOW (Future)

| # | Proposal | Effort | Impact | Status |
|---|----------|--------|--------|--------|
| P-11 | Multi-proposal variant support | L | Covers GAP-4 | backlog |
| P-12 | Japanese enterprise document templates (見積書, 要件確認書) | L | Covers GAP-7 | backlog |
| P-13 | Stakeholder registry with answer attribution | M | Covers CASE-4 | backlog |
| P-14 | Compliance template system (ISMAP, PCI-DSS, HIPAA) | L | Covers CASE-8 | backlog |
| P-15 | Phase history compaction after N entries | S | Covers GAP-10 | backlog |

---

## 6. Test Coverage Assessment

### Covered

| Test File | Covers |
|-----------|--------|
| `rfp-state-machine.test.ts` | transitions, workspace creation, file write rules, recovery, backward compat, decision logging, config generation, terminal states, deadline fields, weighted scoring |
| `rfp-workspace-tool.test.ts` | all 8 MCP actions, resolveRfpPath normalization, error cases, history, backward transitions, qna_round, generate-config guard, terminal transitions |
| `rfp-flow-fixes.test.ts` | all backward edges ± force, SKIP_QNA, SCOPE_FREEZE escape, next_action auto-set, content validation, terminal state transitions |

**Result: 56/56 tests pass**

### Not Covered

- Concurrent write conflicts
- Very large files (500K char limit boundary)
- `mergeChecklist` with non-`key: value` format lines
- Phase history with 50+ entries (unbounded growth)
- Recovery when files are corrupted (non-empty but invalid content)
- Deadline/response_due date format validation
- ON_HOLD reactivation to all active phases (partial coverage)

---

## 7. Strengths

- **Deterministic state machine** — well-defined transition graph with forward/backward/terminal edges
- **File-based truth** — resilient to chat context loss, fully resumable
- **Separation of concerns** — 3-layer split (routing / state / analysis) is clean
- **Decision audit trail** — `07_decisions.md` with sequential D-NNN IDs
- **Content gates** — forward transitions blocked without prerequisite content
- **CR integration** — cross-system visibility via best-effort decision log append
- **Phase recovery** — conservative reconstruction from file existence (QNA_GENERATION preferred over WAITING_CLIENT)
- **Engineering-first analysis** — hidden risk detection templates are well-designed
- **Robust YAML handling** — proper yaml package with backward-compatible phase_history format
- **Unified path semantics** — `workspace_path` consistently means project root across all actions
- **Presales lifecycle completeness** — terminal states (DECLINED/ON_HOLD/CANCELLED) + deadline tracking
- **Intelligent system detection** — weighted keyword scoring for accurate project type classification

---

## 8. Implementation Tracker

### Bug Fixes

| ID | Description | Severity | Status | Files Changed |
|----|-------------|----------|--------|---------------|
| BUG-1 | Hand-rolled YAML parser → `yaml` package | HIGH | **done** | `rfp-state-machine.ts` |
| BUG-2 | Normalize `workspace_path` (all actions accept project root) | MEDIUM | **done** | `rfp-workspace.ts` |
| BUG-3 | Recovery: QNA_GENERATION vs WAITING_CLIENT distinction | LOW | **done** | `rfp-state-machine.ts` |
| BUG-4 | Feature Seed extraction fuzzy heading + Japanese headers | MEDIUM | **done** | `rfp-state-machine.ts` |
| BUG-5 | Decision log entries get sequential D-NNN IDs | LOW | **done** | `rfp-state-machine.ts` |

### Improvements

| ID | Description | Priority | Status | Files Changed |
|----|-------------|----------|--------|---------------|
| P-3 | Terminal states: DECLINED, ON_HOLD, CANCELLED | HIGH | **done** | `documents.ts`, `rfp-state-machine.ts`, `rfp-workspace.ts` |
| P-4 | Deadline + response_due fields in status YAML | HIGH | **done** | `documents.ts`, `rfp-state-machine.ts`, `rfp-workspace.ts` |
| P-7 | Weighted system type scoring (30+ keywords) | MEDIUM | **done** | `rfp-state-machine.ts` |
