# MCP Tool Patterns Research Report

**Date:** 2026-02-24
**Scope:** Sekkei MCP server tool architecture for Change Request system design

---

## 1. Tool Registration Pattern (index.ts)

**Location:** `src/server.ts` (21 lines)

**Pattern:**
- `createServer()` factory creates McpServer instance
- Calls `registerAllTools()` and `registerAllResources()`
- Passes `templateDir` and `templateOverrideDir` to tools
- No direct tool instantiation in server.ts — delegation model

**Key Insight:** Tools registered via factory function in `tools/index.js`, allowing centralised tool management.

---

## 2. Action-Dispatch Pattern (rfp-workspace.ts)

**Location:** `src/tools/rfp-workspace.ts` (195 lines)

**Pattern:**
- Single tool handler dispatches via `action` enum (switch/case)
- Actions: `create`, `status`, `transition`, `write`, `read`, `history`, `back`, `generate-config`
- Zod schema validates all inputs with constraints:
  - `action: z.enum(RFP_ACTIONS)` — constrain to 8 valid actions
  - `workspace_path: z.string().refine((p) => !p.includes(".."))` — path containment
  - Optional fields for specific actions (project_name, phase, filename, content, reason, force)

**Error Handling:**
- Try/catch wrapper around switch statement
- `ok(text)` returns `{ content: [{ type: "text", text }] }`
- `err(text)` returns same structure with `isError: true`
- `SekkeiError` instances call `toClientMessage()` for safe output
- All errors logged via `logger.error()` to stderr

**State Machine Calls:**
- Invokes state machine functions from `rfp-state-machine.ts`:
  - `readStatus()`, `writeStatus()` — YAML frontmatter persistence
  - `validateTransition()`, `isBackwardTransition()` — phase validation
  - `appendDecision()` — audit logging to `07_decisions.md`

**Key Insight:** Action dispatch separates concerns — each action has distinct I/O contract and state mutations.

---

## 3. State Machine Pattern (rfp-state-machine.ts)

**Location:** `src/lib/rfp-state-machine.ts` (444 lines)

**Pattern:**
- **Transition Graph:** `ALLOWED_TRANSITIONS: Map<RfpPhase, RfpPhase[]>`
  - 8 phases: RFP_RECEIVED → ANALYZING → QNA_GENERATION → WAITING_CLIENT → DRAFTING / CLIENT_ANSWERED → PROPOSAL_UPDATE → SCOPE_FREEZE
  - Backward transitions flagged in `BACKWARD_TRANSITIONS` Set

- **File Write Rules:** `FILE_WRITE_RULES: Map<string, WriteMode>`
  - "append": `01_raw_rfp.md`, `07_decisions.md`
  - "rewrite": `02_analysis.md`, `03_questions.md`, `05_proposal.md`
  - "checklist": `06_scope_freeze.md` (merge mode)

- **Flow-to-Files Map:** `FLOW_FILE_MAP` defines read/write contracts per workflow

**YAML Persistence:**
- `readStatus(path): RfpStatus` — parses YAML frontmatter from `00_status.md`
- `writeStatus(path, status)` — serializes RfpStatus to YAML
- `serializeStatusYaml()` sanitizes newlines/pipes in scalar values
- `parseStatusYaml()` handles arrays (blocking_issues, assumptions, phase_history)

**Phase Recovery:**
- `recoverPhase(workspacePath)` — infers phase from file existence/size
- `getFileInventory()` — returns `{ files: Record<string, { exists, size }> }`

**Key Insight:** State persisted as YAML frontmatter, not database. Phase recoverable from file artifacts. All transitions validated before state mutation.

---

## 4. Type System (documents.ts)

**Location:** `src/types/documents.ts` (338 lines)

**Key Types:**
- **RfpPhase:** Union of 8 phase strings (const-based enum pattern)
- **RfpStatus:** Project name, phase, last_update (ISO date), next_action, blocking_issues[], assumptions[], qna_round, phase_history[]
- **PhaseEntry:** { phase, entered (ISO), reason? }
- **RfpFileInventory:** { files: Record<RfpFile, { exists, size }> }

**V-Model Chain:**
- **ProjectConfig:** Full project metadata (name, type, stack, team_size, language, keigo)
- **ChainEntry:** { status: "pending" | "in-progress" | "complete", input?, output? }
- **SplitChainEntry:** For basic-design, detail-design (system_output, features_output)

**Key Insight:** ProjectConfig interface defines all sekkei.config.yaml structure. RfpStatus focuses on presales workflow state (RFP→SCOPE_FREEZE). Phase enum prevents invalid state transitions.

---

## 5. Impact Analyzer Pattern (simulate-impact.ts)

**Location:** `src/tools/simulate-impact.ts` (114 lines)

**Pattern:**
- Takes `changed_ids[]` OR `upstream_old` + `upstream_new` (auto-extract via Python diff)
- Loads all chain docs: `loadChainDocs(config_path)`
- Finds affected sections: `findAffectedSections(changedIds, docs)`
- Builds impact report: `buildImpactReport(changedIds, entries)`
- Returns markdown table + Mermaid dependency graph

**Python Bridge Call:**
- Invokes `callPython("diff", {...})` to extract changed IDs from document diffs
- Python module: `python-bridge.ts` → `../python/cli.py`

**Output Structure:**
- Changed IDs list
- Impact summary (total_affected_sections)
- Affected sections table (doc_type, section, referenced_ids, severity)
- Dependency graph (Mermaid)
- Suggested actions (auto_draft mode)

**Key Insight:** Impact analysis decoupled from tool handler — uses cross-ref-linker and impact-analyzer libraries. Python bridge for complex text diffs.

---

## 6. Connection Map

**Tool Flow:**
```
Client
  → MCP Server (server.ts)
    → registerAllTools (tools/index.js)
      → registerRfpWorkspaceTool() [rfp-workspace.ts]
      → registerSimulateImpactTool() [simulate-impact.ts]
        ↓
    → handleRfpWorkspace(args)
      → switch(action) dispatch
        → readStatus() [rfp-state-machine.ts]
        → validateTransition() [rfp-state-machine.ts]
        → writeStatus() [rfp-state-machine.ts]
        → appendDecision() [rfp-state-machine.ts]
        ↓
    → YAML I/O (00_status.md)
    → File append/rewrite (workspace files)
```

---

## Key Patterns Summary

| Pattern | Location | LoC | Use Case |
|---------|----------|-----|----------|
| **Action Dispatch** | rfp-workspace.ts | 195 | Multi-action tool with Zod schema per action |
| **State Machine** | rfp-state-machine.ts | 444 | Deterministic phase transitions + file rules |
| **Zod Schemas** | All tools | - | Input validation with enum constraints & path safety |
| **YAML Persistence** | rfp-state-machine.ts | ~80 | Status storage without external DB |
| **Python Bridge** | simulate-impact.ts | ~15 | Complex NLP tasks (diff, export, glossary) |
| **Error Handling** | All tools | - | SekkeiError + toClientMessage() + stderr logging |
| **Type System** | documents.ts | 338 | RfpStatus, ProjectConfig, ChainEntry enums |

---

## Recommendations for Change Request System

1. **Inherit action-dispatch pattern** — use single `manage_change_request` tool with actions: `create`, `status`, `list`, `review`, `approve`, `impact`, `merge`
2. **Extend RfpStatus** — add `pending_changes: ChangeRequest[]` field for change tracking
3. **Parallel to state machine** — build `CHANGE_TRANSITIONS` Map (new → pending_review → approved → applied → closed)
4. **Reuse YAML persistence** — store changes in `08_change_requests.md` using append mode
5. **Leverage impact analyzer** — call existing `simulate_change_impact` for downstream analysis
6. **Type safety** — define ChangeRequest, ChangeEntry, ChangeReview types in documents.ts
7. **Error consistency** — use SekkeiError with new code `"CHANGE_REQUEST_ERROR"`

---

## Unresolved Questions

- Will change requests apply to RFP workspace only, or full sekkei.config.yaml chain?
- Should approved changes auto-commit to git, or require manual merge?
- How to handle concurrent change proposals (merge conflicts)?
