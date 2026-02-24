# Research: Propagation, Chain Tools & Skill Patterns

## 1. analyze_update Tool (src/tools/update.ts)

**Key Functions:**
- `handleAnalyzeUpdate()` — main handler, calls Python via `callPython("diff", ...)`
- Input schema: `upstream_old`, `upstream_new`, `downstream_content`, `revision_mode`, `check_staleness`, `config_path`, `since`
- Two modes: (a) diff-based impact analysis, (b) staleness detection via git

**Data Flow:**
```
upstream_old + upstream_new + downstream_content
  → callPython("diff", {...})
    → Python CLI: python/cli.py diff action
      → diff_analyzer.py: section diffs, ID changes, impact mapping
  → Response: { changed_ids[], impacts[], total_impacted_sections, revision_history_row }
  → Output: Markdown table (Section | Referenced IDs)
```

**Revision Mode:**
- When `revision_mode: true` → includes `revision_history_row` (版数, 日付, 変更内容, 変更者)
- Formats as suggested 改訂履歴 row for user approval before commit

**Staleness Check:**
- Delegates to `staleness-detector.js` + `staleness-formatter.js` when `check_staleness: true`
- Requires `config_path` + optional `since` (git ref/relative date)

---

## 2. Cross-Ref Linker (src/lib/cross-ref-linker.ts)

**Chain Pair Definitions (CHAIN_PAIRS):**
```
Requirements phase (linear):
  requirements → nfr
  requirements → functions-list

Design phase (branching):
  requirements → basic-design
  basic-design → security-design
  basic-design → detail-design

Test phase (V-model symmetric):
  detail-design → ut-spec
  basic-design → it-spec
  basic-design → st-spec
  requirements → uat-spec

Supplementary:
  requirements → operation-design
  basic-design → migration-design
```

**ID Origin Map (ID_ORIGIN):**
- Prefix → document type (e.g., `F: "functions-list"`, `REQ: "requirements"`, `CLS: "detail-design"`)
- Used to validate ID provenance & traceability

**Graph Building (buildIdGraph):**
- Extracts all standard IDs (F-xxx, REQ-xxx, etc.) + custom IDs from each doc
- For each doc: `{ defined, referenced }` — both collect all IDs present
- Context (doc type) determines which IDs are "truly defined" vs "referenced"

**Traceability Matrix (buildTraceabilityMatrix):**
- For each ID originating from a doc, find downstream references
- Returns `TraceabilityEntry[]`: `{ id, doc_type, downstream_refs[] }`
- Sorted deterministically by ID

**Analysis (analyzeGraph):**
- For each chain pair: detect orphaned (defined but unreferenced) & missing (referenced but undefined) IDs
- Generates human-readable fix suggestions
- Returns full report: `{ links[], orphaned_ids[], missing_ids[], traceability_matrix, suggestions[] }`

---

## 3. Validate Chain Tool (src/tools/validate-chain.ts)

**Pattern:**
1. `handleValidateChain(args: { config_path })` → calls `validateChain(config_path)`
2. `validateChain()` → `loadChainDocs()` → `buildIdGraph()` → `analyzeGraph()`
3. Returns formatted report with chain links, orphaned/missing IDs, traceability table

**Output Format:**
- Markdown table: Chain Links (upstream → downstream [OK|ISSUES])
- Suggested fixes for orphaned/missing IDs
- Traceability matrix table (ID | Defined In | Referenced In)

**Integration:**
- Validates entire chain in single call — no partial validation
- Uses `config_path` to load all docs from config chain entries

---

## 4. Skill Command Structure (utilities.md & rfp-command.md)

**Pattern: Three-Layer Architecture**

| Layer | File | Role |
|-------|------|------|
| **Entrypoint** | `*.md` command (skill file) | Routing, UX, state handoff |
| **Manager** | Reference file (`*-manager.md`) | File ops, persistence, phase tracking |
| **Logic** | Reference file (`*-loop.md` or `*-design.md`) | Algorithm, analysis, delegation |

**Skill File Structure (utilities.md example):**

```markdown
## /sekkei:command @required [--flag=value]

1. Read/parse inputs
2. Determine state/context
3. Check for manifest (_index.yaml) — branching logic
4. **If split (manifest exists):**
   a. Load manifest
   b. Process per-file/per-feature
   c. Aggregate results
5. **If monolithic:**
   a. Read single file
   b. Process directly
6. Call MCP tool with prepared args
7. Format + display results
```

**Key Patterns:**

- **Branching on document type:** manifest check → split vs monolithic paths
- **State persistence:** files are truth (config.yaml, _index.yaml)
- **Delegation:** skill → manager (file ops) + logic layer (MCP calls)
- **Phase tracking:** FSM with navigation keywords (SHOW, BACK, SKIP_QNA, BUILD_NOW)
- **Resumability:** each phase saves state before proceeding

**Utility Commands Workflow (/sekkei:update example):**
```
Read upstream_old + upstream_new + downstream
  → Call MCP analyze_update tool
    → Display: changed sections, changed IDs, impacted downstream sections
    → Ask: regenerate affected sections? → if yes, delegate to generate
```

**Utility Commands Workflow (/sekkei:diff-visual example):**
```
Read before + after + downstream
  → Call MCP analyze_update with revision_mode: true
    → Get marked_document + revision_history_row
    → Call export_document with marked content
      → Excel: 【新規】→ red, 【変更】→ yellow, 【削除】→ strikethrough
    → Save to sekkei-docs/{doc-type}-revision.xlsx
```

---

## 5. RFP Command Architecture (rfp-command.md)

**3-Layer System:**
- **Entrypoint** (rfp-command.md): routing table, progress dashboard, UX
- **State Manager** (rfp-manager.md): workspace, files, phase FSM, resume
- **Analysis Loop** (rfp-loop.md): presales intelligence, Q&A flows, proposal drafting

**Routing via Phase FSM:**
```
RFP_RECEIVED → analyze_update (deep analysis)
           ↓
ANALYZING → generate Q&A
           ↓
QNA_GENERATION → (wait for answers or BUILD_NOW)
           ↓
WAITING_CLIENT ↔ CLIENT_ANSWERED
           ↓
DRAFTING → proposal generation
           ↓
PROPOSAL_UPDATE → proposal refinement
           ↓
SCOPE_FREEZE → handoff to sekkei:functions-list
```

**File-Based State:**
- Workspace: `sekkei-docs/01-rfp/<project-name>/`
- Files: `01_raw_rfp.md`, `02_analysis.md`, `03_questions.md`, `04_client_answers.md`, `05_proposal.md`, `06_scope_freeze.md`
- Progress dashboard shows file sizes + content markers (`[*]` = has content, `[ ]` = pending)

---

## Change Request System — Integration Points

### 1. **Propagation Chain (use cross-ref-linker + validate-chain)**
- Add CR document type to ID_ORIGIN map (e.g., `CR: "change-request"`)
- Add chain pairs linking upstream changes to CR (e.g., `basic-design → change-request`)
- Reuse `buildIdGraph()` & `analyzeGraph()` for CR traceability

### 2. **Diff Engine (use analyze_update pattern)**
- Leverage `callPython("diff")` for CR impact analysis
- Extend Python diff_analyzer.py to detect CR-specific impacts (feature scope, design risks)
- Support revision_mode for CR approval workflow

### 3. **Skill Command (follow utilities pattern)**
```
/sekkei:change-request @doc [--action=initiate|impact|approve]
  → Manager: load CR workspace, manage state
  → Call analyze_update for impact → Call validate_chain for traceability
  → Output: change summary, impacted components, approval checklist
```

### 4. **Phase FSM (adapt from rfp-command)**
- CR states: INITIATED → IMPACT_ANALYSIS → REVIEW → APPROVED/REJECTED → PROPAGATION
- Resume via phase tracking, file-based state
- Navigation keywords: SHOW, BACK, APPROVE, REJECT, PROPAGATE

---

## Unresolved Questions

1. Should CR document type be monolithic or split (per-feature)?
2. When does CR propagate automatically vs. require user approval?
3. Should CR maintain separate revision history or integrate with upstream revision tracking?
