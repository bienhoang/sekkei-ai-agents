# Change Request Architecture Analysis

> How CRs propagate through the V-model document chain, what gets logged, and where the gaps are.

## 1. CR Lifecycle (State Machine)

```
INITIATED → ANALYZING → IMPACT_ANALYZED → APPROVED → PROPAGATING → VALIDATED → COMPLETED
     ↘          ↘            ↘                ↘           ↘            ↘
      CANCELLED  CANCELLED    CANCELLED        CANCELLED   CANCELLED    (terminal)
                                                  ↑
                                              PROPAGATING (rollback re-approves)
```

**Key files:** `cr-state-machine.ts` (transitions, YAML persistence, RFP logging), `cr-actions.ts` (handlers), `cr-propagation-actions.ts` (analyze/propagate/validate/confirm/simulate)

### Actions (12 total)

| Action | Status Req | What Happens |
|--------|-----------|-------------|
| `create` | — | CR file created with ID `CR-YYMMDD-NNN`, changed_ids recorded |
| `simulate` | — | **Dry-run** impact analysis without creating a CR. Returns propagation plan + affected sections |
| `analyze` | INITIATED | Load chain docs, find affected sections, compute BFS propagation order. Supports `skip_docs` and `max_depth` |
| `approve` | IMPACT_ANALYZED | Conflict detection (advisory), RFP decision log appended |
| `propagate_next` | APPROVED/PROPAGATING | Git checkpoint (1st call), then return instruction for next step. Step marked `instructed` (not done) |
| `propagate_confirm` | PROPAGATING | Confirm step completion → mark `done`. For upstream steps, verifies doc was actually changed via content hash |
| `validate` | PROPAGATING | Full chain validation (orphaned/missing IDs) + staleness check |
| `complete` | VALIDATED | Global CHANGELOG entries with version fallback from changelog history |
| `status` | any | Return CR state + propagation progress stats (done/instructed/pending/skipped counts) |
| `list` | — | List all CRs with optional status filter |
| `cancel` | any | Mark as CANCELLED with reason |
| `rollback` | PROPAGATING | Safe rollback: stash uncommitted work, create branch from checkpoint (no `git reset --hard`) |

### Step Status Flow

```
pending → instructed (propagate_next) → done (propagate_confirm)
                                      → skipped (explicit skip)
```

## 2. V-Model Document Chain (48 Pairs)

```
                    ┌─────────────────────────────────────────┐
                    │              requirements                │
                    └──┬──────┬──────┬──────┬────────┬────────┘
                       │      │      │      │        │
                       ▼      ▼      ▼      ▼        ▼
                     nfr  func-list  proj   basic    security
                      │      │      plan   design    design
                      │      │             │    │       │
                      ▼      ▼             ▼    ▼       │
                   basic  basic        detail  security ◄┘
                   design design       design  design
                      │      │           │
                      ▼      ▼           ▼
                   test-plan          ut-spec
                   │ │ │ │
                   ▼ ▼ ▼ ▼
              ut  it  st  uat
              spec spec spec spec
```

**Supplementary:** operation-design, migration-design, crud-matrix, traceability-matrix, sitemap, screen-design, interface-spec

### ID Prefix → Origin Document

| Prefix | Origin | Prefix | Origin |
|--------|--------|--------|--------|
| REQ | requirements | SCR, TBL, API | basic-design |
| F | functions-list | CLS, DD | detail-design |
| NFR | nfr / requirements | SEC | security-design |
| PP | project-plan | UT/IT/ST/UAT | *-spec |
| TP, TS | test-plan | OP, MIG | operation/migration-design |

## 3. What Happens When You Create a CR at Each Document Level

### 3.1 CR from `requirements` (Top of chain)

**Impact radius: MAXIMUM — affects nearly all documents**

```
requirements (origin)
  ├─ upstream: (none — requirements is root)
  └─ downstream (BFS):
       nfr → functions-list → project-plan → basic-design → security-design
       → detail-design → test-plan → ut/it/st/uat-spec
       → operation-design → migration-design → crud-matrix
       → traceability-matrix → sitemap → screen-design → interface-spec
```

- Propagation steps: 0 upstream + ~15 downstream = ~15 total
- Changed IDs (REQ-xxx) referenced in almost every document
- **Risk:** Longest propagation chain, highest chance of conflicts with parallel CRs

### 3.2 CR from `functions-list` (Mid-level)

**Impact radius: HIGH — feeds design + test + supplementary docs**

```
functions-list (origin)
  ├─ upstream: requirements (suggest backfill if new F-xxx not in REQ)
  └─ downstream:
       project-plan → basic-design → detail-design → security-design
       → test-plan → st-spec → ut-spec → it-spec → uat-spec
       → crud-matrix → sitemap
```

- F-xxx IDs referenced in basic-design, detail-design, st-spec, crud-matrix, sitemap
- **Backfill:** If new F-012 added, system suggests adding matching REQ in requirements

### 3.3 CR from `basic-design` (Design phase)

**Impact radius: MEDIUM — affects detail design + all test specs + supplementary**

```
basic-design (origin)
  ├─ upstream: requirements, nfr, functions-list (suggestions only)
  └─ downstream:
       security-design → detail-design → test-plan
       → ut/it/st/uat-spec → migration-design
       → crud-matrix → traceability-matrix → screen-design → interface-spec
```

- SCR/TBL/API-xxx IDs flow down to detail-design and test specs
- **Backfill:** New SCR-xxx may need corresponding F-xxx in functions-list

### 3.4 CR from `detail-design` (Low-level design)

**Impact radius: LOW — only affects unit test specs**

```
detail-design (origin)
  ├─ upstream: basic-design, functions-list, requirements
  └─ downstream: ut-spec
```

- CLS/DD-xxx IDs only referenced in ut-spec
- Shortest propagation chain (3 upstream suggestions + 1 downstream regeneration)

### 3.5 CR from `test-plan`

**Impact radius: MEDIUM — affects all 4 test spec types**

```
test-plan (origin)
  ├─ upstream: requirements, nfr, basic-design, functions-list
  └─ downstream: ut-spec, it-spec, st-spec, uat-spec
```

### 3.6 CR from Test Specs (ut/it/st/uat-spec)

**Impact radius: NONE downstream — leaf nodes**

```
ut-spec (origin)
  ├─ upstream: test-plan, detail-design
  └─ downstream: (none)
```

- CR still creates history entry + changelog, but no propagation needed
- Upstream suggestions only (e.g., "update test-plan to reflect new UT-xxx")

## 4. Logging & Audit Trail

### 4.1 CR File (`workspace-docs/change-requests/CR-YYMMDD-NNN.md`)

Written at **every state transition**. Contains:
- YAML frontmatter (full CR state)
- Status table, Content table, Impact section
- Propagation progress table (✅ done / 🔄 instructed / ⏳ pending / ⏭️ skipped)
- Conflict warnings
- History table (all transitions with dates + reasons)

### 4.2 INDEX.md (`workspace-docs/change-requests/INDEX.md`)

Auto-rebuilt after every CR write. Markdown table listing all CRs with status, origin, description, dates.

### 4.3 RFP Decision Log (`workspace-docs/01-rfp/07_decisions.md`)

Appended at **every state transition** (via `transitionCR` → `appendCRToRFPDecisions`). Entry format:

```markdown
## 2026-02-25 — CR-260225-001: Update login requirements [APPROVED]
- **Origin**: requirements
- **Changed IDs**: REQ-003, REQ-005
- **Impact**: 5 affected sections across 3 documents
- **Propagation**: ↑ upstream: 0/0 done | ↓ downstream: 2/8 done
```

**Note:** Silently skipped if no RFP workspace exists.

### 4.4 Global CHANGELOG (`workspace-docs/CHANGELOG.md`)

Appended at **COMPLETED** status only. One row per affected document:

```markdown
| 日付 | 文書 | 版数 | 変更内容 | 変更者 | CR-ID |
|------|------|------|----------|--------|-------|
| 2026-02-25 | requirements | 1.1 | Update login requirements | | CR-260225-001 |
| 2026-02-25 | basic-design | 1.1 | Propagated from requirements: Update login requirements | | CR-260225-001 |
```

Version extracted from 改訂履歴 section (max version from all rows). Fallback: reads last version for the doc type from CHANGELOG.md history if extraction fails.

### 4.5 Git Checkpoint & Rollback

Created before first `propagate_next` call:
```bash
git add workspace-docs/
git commit -m "chore: pre-CR-260225-001 checkpoint"
```

Rollback flow (safe, non-destructive):
1. `git stash push -m "pre-rollback-{crId}"` — preserve uncommitted work
2. `git checkout -b rollback/{crId} {checkpoint-sha}` — create branch from checkpoint
3. Transition CR back to APPROVED (searches last 50 commits for checkpoint)

## 5. Propagation Algorithm Detail

### 5.1 Order Computation (Depth-Limited BFS)

```typescript
// cr-propagation.ts
computePropagationOrder(originDoc, options?: { maxDepth?, skipDocs? })
  1. BFS upstream with depth tracking (reversed — furthest first)
  2. BFS downstream with depth tracking (nearest first)
  3. Filter out skipDocs
  4. Return: upstream steps + downstream steps
```

Options:
- `maxDepth: N` — limit BFS to N hops from origin (e.g., `maxDepth: 1` = direct dependencies only)
- `skipDocs: ["crud-matrix", "sitemap"]` — exclude specific doc types from propagation

### 5.2 Two-Phase Step Execution

Each propagation step follows: `propagate_next` → user acts → `propagate_confirm`

| Phase | Action | What Happens |
|-------|--------|-------------|
| **Instruct** | `propagate_next` | Step marked `instructed`, instruction returned. For upstream: content hash captured |
| **Confirm** | `propagate_confirm` | Step marked `done`. For upstream: hash compared to verify actual change (`upstream_changed: true/false`) |

| Direction | Behavior | User Action Required |
|-----------|----------|---------------------|
| **upstream** | Suggest content snippets from origin doc containing changed IDs | Manual review + update, then `propagate_confirm` |
| **downstream** | Instruct to regenerate document | Run `generate_document`, then `propagate_confirm` |

### 5.3 Conflict Detection (at APPROVE)

```
For each active CR (APPROVED/PROPAGATING):
  1. changed_ids overlap → warning
  2. propagation doc_type overlap → warning
```

Non-blocking by design (C7). Warnings saved to `conflict_warnings[]`.

## 6. Impact Analysis Deep Dive

### 6.1 Affected Section Detection

```
For each changed_id:
  For each chain document:
    Scan all lines for ID occurrence
    Score severity:
      HIGH: ID in section heading (##, ###)
      MEDIUM: ID in table row (|...|)
      LOW: ID in body text
```

### 6.2 Backfill Suggestions

When origin doc references IDs that belong to upstream docs but don't exist there:

```
Example: basic-design references F-012
  → F prefix belongs to functions-list (upstream)
  → F-012 not found in functions-list
  → Suggestion: "Add F-012 to functions-list"
```

Deduped by `(id, target_doc)` pair. Only scans lines containing `changed_ids` (not full document) to reduce noise.

## 7. Document Impact Matrix

Origin doc change → which documents need update:

| Origin \ Affected → | req | nfr | func | proj | basic | sec | detail | test | ut | it | st | uat | ops | mig | crud | trace | site | screen | if-spec |
|---------------------|-----|-----|------|------|-------|-----|--------|------|----|----|----|----|-----|-----|------|-------|------|--------|---------|
| **requirements** | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | | | ✅ |
| **nfr** | ↑ | — | | | ✅ | ✅ | | ✅ | | | | ✅ | ✅ | | | | | | |
| **functions-list** | ↑ | | — | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | | ✅ | | ✅ | | |
| **basic-design** | ↑ | ↑ | ↑ | | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | | ✅ | ✅ |
| **detail-design** | ↑ | | ↑ | | ↑ | | — | | ✅ | | | | | | | | | | |
| **test-plan** | ↑ | ↑ | ↑ | | ↑ | | | — | ✅ | ✅ | ✅ | ✅ | | | | | | | |
| **ut-spec** | ↑ | | | | | | ↑ | ↑ | — | | | | | | | | | | |
| **it-spec** | | | | | ↑ | | | ↑ | | — | | | | | | | | | |
| **st-spec** | | | ↑ | | ↑ | | | ↑ | | | — | | | | | | | | |
| **uat-spec** | ↑ | ↑ | | | | | | ↑ | | | | — | | | | | | | |
| **security-design** | ↑ | ↑ | | | ↑ | — | | | | | | | | | | | | | |
| **operation-design** | ↑ | ↑ | | | | | | | | | | | — | ✅ | | | | | |
| **migration-design** | ↑ | | | | ↑ | | | | | | | | ↑ | — | | | | | |

Legend: ✅ = downstream (regenerate), ↑ = upstream (suggest only), — = self

## 8. Issues & Improvement Proposals

### 8.1 Bugs (All Fixed)

#### BUG-1: `propagate_next` marks step "done" BEFORE user acts — **FIXED**

`propagate_next` now sets status to `"instructed"` instead of `"done"`. New `propagate_confirm` action required to mark `"done"` after user completes the work. See IMP-1.

#### BUG-2: Rollback uses `git reset --hard` — **FIXED**

Replaced with safe rollback: `git stash` → `git checkout -b rollback/{crId} {sha}`. Uncommitted work preserved. Search range increased from 20 to 50 commits.

#### BUG-3: Auto-detect ID changes misses structural changes — **FIXED**

Changed from `.find()` (first match) to `.filter().sort()` (all matches). Now compares ALL lines containing each ID — detects changes when any line with the ID differs.

#### BUG-4: Version extraction assumes sorted revision history — **FIXED**

`extractVersionFromContent` now collects ALL versions via `matchAll`, sorts numerically, returns maximum. Handles unsorted tables and versions anywhere in table rows.

#### BUG-5: Analyze passes empty oldContent to backfill — **FIXED**

Now filters origin content to only lines containing `changed_ids` before passing to backfill. Eliminates false positives from pre-existing IDs.

### 8.2 Architectural Improvements (All Implemented)

#### IMP-1: Step confirmation flow — **IMPLEMENTED**

New two-phase propagation: `propagate_next` (instruction + mark `instructed`) → `propagate_confirm` (mark `done`). PropagationStep type now supports 4 statuses: `pending | instructed | done | skipped`.

#### IMP-2: Dry-run / simulation mode — **IMPLEMENTED**

New `simulate` action: returns impact analysis + propagation plan without creating a CR. Accepts same params as analyze (`origin_doc`, `changed_ids`, `config_path`, `skip_docs`, `max_depth`).

#### IMP-3: Selective propagation — **IMPLEMENTED**

`computePropagationOrder` now accepts `options: { maxDepth?, skipDocs? }`. BFS tracks depth per node. Both `analyze` and `simulate` pass through `skip_docs` and `max_depth` from tool args.

#### IMP-4: Changelog version conflict resolution — **IMPLEMENTED**

New `getLastChangelogVersion(workspacePath, docType)` function scans CHANGELOG.md in reverse for last version by doc type. Wired as fallback in `handleComplete` when `extractVersionFromContent` returns empty.

#### IMP-5: Propagation progress in status output — **IMPLEMENTED**

`status` action now returns `progress` object: `{ total_steps, done, instructed, pending, skipped, upstream_done, upstream_total, downstream_done, downstream_total }`.

#### IMP-6: Upstream propagation change tracking — **IMPLEMENTED**

`propagate_next` stores MD5 content hash (8-char) on upstream steps via `content_hash` field in PropagationStep. `propagate_confirm` compares hash → returns `upstream_changed: true/false` in response.

### 8.3 Missing Features

| Feature | Current State | Proposed |
|---------|--------------|----------|
| CR dependencies | Not supported | Allow CR-002 to declare dependency on CR-001 |
| Batch propagation | One step at a time | `propagate_all` for automated chains |
| Impact diff preview | Text description only | Show actual content diff per affected section |
| CR merge | Not supported | Merge 2 related CRs into one |
| Notification system | None | Alert when upstream doc changes affect in-progress CR |
| Audit export | Markdown only | Export CR history to Excel/PDF for compliance |

## 9. Data Flow Summary

```
User runs /sekkei:change
  │
  ├─(optional)─ SIMULATE ── dry-run impact + propagation plan (no CR created)
  │
  ▼
CREATE ─── cr-state-machine.ts ──→ CR file (YAML+MD) + INDEX.md
  │
  ▼
ANALYZE ── cr-propagation-actions.ts
  ├── cross-ref-linker.ts ──→ load all chain docs
  ├── impact-analyzer.ts ──→ affected sections + Mermaid graph
  ├── cr-propagation.ts ──→ depth-limited BFS with skip_docs filter
  └── cr-backfill.ts ──→ upstream backfill (filtered by changed_ids only)
  │
  ▼
APPROVE ── cr-actions.ts
  ├── cr-conflict-detector.ts ──→ parallel CR overlap warnings
  └── cr-state-machine.ts ──→ RFP decision log entry
  │
  ▼
PROPAGATE (two-phase loop) ── cr-propagation-actions.ts
  ├── git checkpoint (first call only)
  ├── propagate_next: instruction + mark "instructed" (+ hash upstream docs)
  └── propagate_confirm: mark "done" (+ verify upstream_changed via hash)
  │
  ▼
VALIDATE ── cr-propagation-actions.ts
  ├── cross-ref-linker.ts ──→ orphaned/missing ID check
  └── doc-staleness.ts ──→ timestamp comparison
  │
  ▼
COMPLETE ── cr-actions.ts
  └── changelog-manager.ts ──→ global CHANGELOG entries (version from doc or fallback)
```

## 10. Fix & Improvement Tracker

| ID | Type | Description | Status |
|----|------|-------------|--------|
| BUG-1 | Bug | `propagate_next` marks step "done" before user acts | ✅ fixed |
| BUG-2 | Bug | Rollback uses destructive `git reset --hard` | ✅ fixed |
| BUG-3 | Bug | Auto-detect ID changes misses structural changes | ✅ fixed |
| BUG-4 | Bug | Version extraction assumes sorted revision history | ✅ fixed |
| BUG-5 | Bug | Analyze passes empty oldContent to backfill | ✅ fixed |
| IMP-1 | Improvement | Add step confirmation flow (`propagate_confirm`) | ✅ done |
| IMP-2 | Improvement | Dry-run / simulation mode (`simulate` action) | ✅ done |
| IMP-3 | Improvement | Selective propagation (`skip_docs`, `max_depth`) | ✅ done |
| IMP-4 | Improvement | Changelog version conflict resolution | ✅ done |
| IMP-5 | Improvement | Propagation progress in status output | ✅ done |
| IMP-6 | Improvement | Upstream propagation change tracking (content hash) | ✅ done |

## Unresolved Questions

1. **Split doc handling** — For dual-mode docs (system_output + features_output), propagation treats them as one unit but regeneration may need to target specific files
2. **Partial validation semantics** — When `partial=true`, `instructed`/`pending` steps remain in place but CR transitions to VALIDATED. Should these be auto-skipped?
