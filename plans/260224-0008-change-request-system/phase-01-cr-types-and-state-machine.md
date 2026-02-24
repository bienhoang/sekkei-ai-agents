# Phase 1: CR Types & State Machine

## Context Links

- Pattern: `src/lib/rfp-state-machine.ts` (444 LOC — YAML persistence, transitions, phase recovery)
- Pattern: `src/types/documents.ts` (RFP types block at line 217-248)
- Pattern: `src/lib/errors.ts` (SekkeiErrorCode union)

## Overview

- **Priority:** P1 (foundational — all other phases depend on this)
- **Status:** pending
- **Description:** Define CR data model and implement file-based state machine with YAML persistence

## Key Insights

- Follow rfp-state-machine.ts exactly: `readCR`/`writeCR` pair, YAML frontmatter in .md files, ALLOWED_TRANSITIONS Map, transition validation
- CR status file IS the CR file itself (unlike RFP where status is separate from workspace files)
- generateCRId must be date-prefixed with auto-increment: `CR-YYMMDD-NNN`
- CR files live at `{workspace}/sekkei-docs/change-requests/CR-YYMMDD-NNN.md`

## Requirements

### Functional
1. Define CRStatus enum: INITIATED, ANALYZING, IMPACT_ANALYZED, APPROVED, PROPAGATING, VALIDATED, COMPLETED, CANCELLED
2. Define ChangeRequest interface: id, status, origin_doc, changed_ids, description, created, updated, impact_summary, propagation_steps, conflict_warnings
3. State transitions: directed graph + CANCELLED from any state
4. YAML persistence: serialize/parse CR frontmatter in .md file
5. Auto-generate CR ID from date + sequential counter (scan existing CRs in dir)
6. Create CR directory if not exists

### Non-Functional
- Each file < 200 LOC
- Use `yaml` package (already a dependency) for CR YAML persistence — safer for nested arrays than manual parse/serialize
<!-- Updated: Validation Session 1 - Switched from manual YAML to yaml package -->

## Architecture

```
src/types/change-request.ts    — Type definitions only (~80 LOC)
src/lib/cr-state-machine.ts    — CRUD + transitions + YAML persistence (~180 LOC)
src/lib/errors.ts              — Add CHANGE_REQUEST_ERROR code (1 line edit)
```

### State Transition Graph

```
INITIATED -> ANALYZING -> IMPACT_ANALYZED -> APPROVED -> PROPAGATING -> VALIDATED -> COMPLETED
                                                                                       |
Any state ───────────────────────────────────── CANCELLED ◄────────────────────────────┘
```

### ChangeRequest Interface

```typescript
interface ChangeRequest {
  id: string;                      // CR-YYMMDD-NNN
  status: CRStatus;
  origin_doc: string;              // doc type where change originated (e.g. "requirements")
  description: string;             // human summary of what changed
  changed_ids: string[];           // e.g. ["REQ-003", "F-005"]
  impact_summary?: string;         // populated after ANALYZING
  propagation_steps: PropagationStep[];  // ordered list, populated after IMPACT_ANALYZED
  propagation_index: number;       // current step (0-based), advances during PROPAGATING
  conflict_warnings: string[];     // populated at APPROVED transition
  created: string;                 // ISO date
  updated: string;                 // ISO date
  history: CRHistoryEntry[];       // transition log
}
```

## Related Code Files

### Files to Create
- `sekkei/packages/mcp-server/src/types/change-request.ts`
- `sekkei/packages/mcp-server/src/lib/cr-state-machine.ts`

### Files to Edit
- `sekkei/packages/mcp-server/src/lib/errors.ts` — add `CHANGE_REQUEST_ERROR` to SekkeiErrorCode union

## Implementation Steps

### Step 1: Add error code (errors.ts)

Add `"CHANGE_REQUEST_ERROR"` to the `SekkeiErrorCode` union type. One-line edit.

### Step 2: Create types (change-request.ts)

```typescript
// Constants
export const CR_STATUSES = [
  "INITIATED", "ANALYZING", "IMPACT_ANALYZED", "APPROVED",
  "PROPAGATING", "VALIDATED", "COMPLETED", "CANCELLED",
] as const;
export type CRStatus = (typeof CR_STATUSES)[number];

export const PROPAGATION_DIRECTIONS = ["upstream", "downstream"] as const;
export type PropagationDirection = (typeof PROPAGATION_DIRECTIONS)[number];

// Interfaces
export interface PropagationStep {
  doc_type: string;
  direction: PropagationDirection;
  status: "pending" | "done" | "skipped";
  note?: string;
}

export interface CRHistoryEntry {
  status: CRStatus;
  entered: string;  // ISO date
  reason?: string;
}

export interface ChangeRequest {
  id: string;
  status: CRStatus;
  origin_doc: string;
  description: string;
  changed_ids: string[];
  impact_summary?: string;
  propagation_steps: PropagationStep[];
  propagation_index: number;
  conflict_warnings: string[];
  created: string;
  updated: string;
  history: CRHistoryEntry[];
}
```

### Step 3: Create state machine (cr-state-machine.ts)

Exports:

| Function | Signature | Notes |
|----------|-----------|-------|
| `ALLOWED_TRANSITIONS` | `ReadonlyMap<CRStatus, readonly CRStatus[]>` | + CANCELLED from all |
| `validateTransition` | `(from, to) => boolean` | Check map |
| `generateCRId` | `(crDir: string) => Promise<string>` | Scan dir, find max NNN for today, increment |
| `createCR` | `(basePath, originDoc, description, changedIds) => Promise<ChangeRequest>` | mkdir + write |
| `readCR` | `(crFilePath) => Promise<ChangeRequest>` | Parse YAML frontmatter |
| `writeCR` | `(crFilePath, cr) => Promise<void>` | Serialize YAML frontmatter |
| `transitionCR` | `(crFilePath, toStatus, reason?) => Promise<ChangeRequest>` | Validate + update + log history |
| `listCRs` | `(basePath) => Promise<ChangeRequest[]>` | Read all CR-*.md in dir |
| `getCRDir` | `(basePath) => string` | Returns `join(basePath, "sekkei-docs", "change-requests")` |

YAML format for CR file:

```yaml
---
id: CR-260224-001
status: INITIATED
origin_doc: requirements
description: Added payment gateway requirement
changed_ids:
  - REQ-003
  - F-005
impact_summary: ""
propagation_steps: []
propagation_index: 0
conflict_warnings: []
created: 2026-02-24
updated: 2026-02-24
history:
  - INITIATED|2026-02-24|Initial creation
---

# Change Request: Added payment gateway requirement

## Changed IDs
- REQ-003
- F-005

## Notes
(user/agent appends notes here)
```

Key implementation details:
- Use `import { parse, stringify } from "yaml"` for YAML frontmatter persistence (safer for nested arrays than manual approach)
- `propagation_steps` stored as proper YAML arrays (not pipe-separated — yaml package handles nested objects natively)
- `generateCRId`: read dir entries matching `CR-YYMMDD-*.md`, extract max NNN, return NNN+1 padded to 3 digits
- CANCELLED transition allowed from any status except COMPLETED
<!-- Updated: Validation Session 1 - yaml package for persistence -->

## Todo List

- [ ] Add CHANGE_REQUEST_ERROR to errors.ts
- [ ] Create src/types/change-request.ts with all type definitions
- [ ] Implement ALLOWED_TRANSITIONS map
- [ ] Implement generateCRId with date-prefix + auto-increment
- [ ] Implement createCR (mkdir + initial YAML write)
- [ ] Implement readCR (parse YAML frontmatter)
- [ ] Implement writeCR (serialize YAML frontmatter)
- [ ] Implement transitionCR (validate + update + history)
- [ ] Implement listCRs (scan directory)
- [ ] Implement getCRDir helper

## Success Criteria

- All CR CRUD operations work with file-based persistence
- State transitions validated against ALLOWED_TRANSITIONS
- CANCELLED reachable from any non-COMPLETED state
- generateCRId produces unique IDs per date
- YAML round-trips correctly (read -> write -> read = identical)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| YAML parse edge cases (special chars in description) | Medium | sanitizeYamlScalar (reuse from rfp-state-machine) |
| Race condition in generateCRId | Low | Single-user MCP context; sequential calls |
| CR dir not existing on first use | Low | mkdir recursive in createCR |

## Security Considerations

- Path containment: CR dir always under `sekkei-docs/change-requests/` — validate no `..` in basePath
- CR file path must match `CR-\d{6}-\d{3}\.md` pattern

## Next Steps

Phase 2 uses these types + state machine for propagation engine.
