---
status: complete
created: 2026-02-23
completed: 2026-02-23
slug: sekkei-rfp-unification
---

# Sekkei RFP Command Unification Plan

## Problem

3 spec files (`command.md`, `rfp-loop.md`, `manager.md`) describe the same `/sekkei:rfp` workflow with conflicting file names, phase names, and no clear execution model.

## Goal

Produce a unified, implementable `/sekkei:rfp` slash command spec with clear 3-layer architecture.

## Architecture

```
command.md  = ENTRYPOINT (router + UX + delegates)
manager.md  = STATE LAYER (workspace, files, persistence, resume)
rfp-loop.md = ANALYSIS LAYER (presales intelligence, risk, Q&A)
```

`command.md` calls `manager.md` for state ops, `rfp-loop.md` for analysis. No overlap.

## Decisions (locked)

1. **Workspace**: `sekkei-docs/rfp/<project-name>/`
2. **Mockups**: Dropped. `/sekkei:sitemap` handles screen flows.
3. **Structure**: 3 separate files, each under 200 lines.

## Phases

### Phase 1: Canonical Names — COMPLETE
- [x] Unified phase enum (8 phases)
- [x] Unified file scheme (00-07)
- [x] Flow-to-file mapping
- [x] Sekkei chain handoff rule
- See: `phase-01-canonical-names.md`

### Phase 2: Rewrite `manager.md` — COMPLETE
- [x] Align workspace path to `sekkei-docs/rfp/`
- [x] Align phase enum to canonical
- [x] Remove analysis/UX logic
- [x] Add flow-to-file mapping table
- [x] Add Sekkei chain handoff
- See: `phase-02-rewrite-manager.md`

### Phase 3: Rewrite `rfp-loop.md` — COMPLETE
- [x] Align flow names to canonical phases
- [x] Map each flow output to numbered file
- [x] Remove file management rules
- [x] Keep all analysis depth
- See: `phase-03-rewrite-rfp-loop.md`

### Phase 4: Rewrite `command.md` — COMPLETE
- [x] Trim to ~150 lines (router + UX only)
- [x] Reference manager for all file ops
- [x] Reference rfp-loop for all analysis
- [x] Define routing table + UX patterns
- [x] Define Sekkei chain handoff UX
- See: `phase-04-rewrite-command.md`

### Phase 5: Validate — COMPLETE
- [x] No duplicate rules across 3 files
- [x] All phases/files/flows aligned
- [x] Walkthrough: new RFP → SCOPE_FREEZE
- [x] Walkthrough: resume after interruption

## File Map

```
plans/260223-1825-sekkei-rfp-unification/
  plan.md                        ← this file
  phase-01-canonical-names.md    ← naming alignment
  phase-02-rewrite-manager.md    ← state layer spec
  phase-03-rewrite-rfp-loop.md   ← analysis layer spec
  phase-04-rewrite-command.md    ← entrypoint spec
```

## Target Files (to rewrite)

```
specs-skills-for-japan/plans/rfp-command/
  command.md    ← entrypoint (~150 lines)
  manager.md    ← state layer (~150 lines)
  rfp-loop.md   ← analysis layer (~180 lines)
```
