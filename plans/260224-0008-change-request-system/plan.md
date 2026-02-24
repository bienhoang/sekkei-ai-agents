---
title: "Change Request System for Sekkei"
description: "Bidirectional change propagation with CR entity tracking, MCP tool, and skill command"
status: complete
priority: P1
effort: "16h"
branch: main
tags: [change-request, mcp-tool, skill, state-machine, propagation]
created: 2026-02-24
---

# Change Request System — Overview

Adds a CR (Change Request) entity to Sekkei for tracking and propagating specification changes across the V-model document chain. File-based state, bidirectional propagation, conflict detection for parallel CRs.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [CR Types & State Machine](phase-01-cr-types-and-state-machine.md) | complete | 3h | 2 new + 1 edit |
| 2 | [Propagation Engine](phase-02-propagation-engine.md) | complete | 4h | 3 new |
| 3 | [MCP Tool Handler](phase-03-mcp-tool-handler.md) | complete | 3h | 2 new + 1 edit |
| 4 | [Skill Command](phase-04-skill-command.md) | complete | 2h | 1 new + 1 edit |
| 5 | [Tests](phase-05-tests.md) | complete | 3h | 5 new |
| 6 | [Integration & Docs](phase-06-integration-and-docs.md) | complete | 1h | 2 edits |

## Key Dependencies

- Phase 2 depends on Phase 1 (types + state machine)
- Phase 3 depends on Phase 1 + 2 (tool wires up engine)
- Phase 4 depends on Phase 3 (skill calls MCP tool)
- Phase 5 can start after Phase 2, covers Phases 1-3
- Phase 6 after all others pass

## Architecture

```
Skill (/sekkei:change)
  -> MCP Tool (manage_change_request)
    -> cr-state-machine.ts (YAML persistence, transitions)
    -> cr-propagation.ts (compute propagation order)
    -> cr-backfill.ts (upstream suggestions)
    -> cr-conflict-detector.ts (parallel CR overlap check)
    -> Existing: cross-ref-linker.ts, impact-analyzer.ts
```

## CR Lifecycle

```
INITIATED -> ANALYZING -> IMPACT_ANALYZED -> APPROVED
  -> PROPAGATING -> VALIDATED -> COMPLETED
  (any state -> CANCELLED)
```

## File Location

CR files stored at `sekkei-docs/change-requests/CR-YYMMDD-NNN.md` with YAML frontmatter.

## Constraints

- Max 200 LOC per file; split as needed
- ESM with .js imports; Zod schemas; SekkeiError; pino to stderr
- Reuse CHAIN_PAIRS, loadChainDocs, buildTraceabilityMatrix from cross-ref-linker
- Reuse findAffectedSections, buildImpactReport from impact-analyzer
- CR is metadata, NOT a V-model doc — no CR prefix in id-extractor.ts

## Validation Log

### Session 1 — 2026-02-24
**Trigger:** Initial plan creation validation
**Questions asked:** 7

#### Questions & Answers

1. **[Architecture]** Phase 1 plans manual YAML serialization (pipe-separated arrays). CR has complex nested data. Which approach for CR YAML persistence?
   - Options: Use yaml package | Manual parse/serialize | Hybrid
   - **Answer:** Use yaml package
   - **Rationale:** CR has nested PropagationStep[] and CRHistoryEntry[] — pipe-separated format is fragile for complex data. The `yaml` package is already a project dependency.

2. **[Scope]** What actually happens during downstream propagation? Does propagate_next auto-call generate_document or just return instruction?
   - Options: Instruction only | Auto-call generate_document | Return instruction + pre-built args
   - **Answer:** Instruction only
   - **Rationale:** Keeps tool simple, gives user full control over regeneration. Skill/AI agent decides whether to call generate_document.

3. **[Architecture]** Should we proactively split the tool handler (9 actions, 200 LOC risk)?
   - Options: Proactive split | Single file, split if needed
   - **Answer:** Proactive split
   - **Rationale:** change-request.ts (~100 LOC schema + dispatch) + cr-actions.ts (~150 LOC handlers). Prevents rework.

4. **[Scope]** How does user specify changed_ids for create action?
   - Options: Manual + optional auto-detect | Manual only | Auto-detect required
   - **Answer:** Manual IDs + optional auto-detect
   - **Rationale:** User can provide IDs directly OR provide old/new doc content for auto-extraction via diff. Flexible for both workflows.

5. **[Architecture]** Exporting CHAIN_PAIRS and ID_ORIGIN from cross-ref-linker.ts — acceptable public API surface?
   - Options: Export directly | Re-export via types file
   - **Answer:** Export directly
   - **Rationale:** V-model chain is stable. Tests catch breakage immediately if structure changes.

6. **[Risk]** No git backup strategy before propagation overwrites docs. Should system create safety net?
   - Options: Git commit before propagate | Copy backup files | No backup needed
   - **Answer:** Git commit before propagate
   - **Rationale:** Auto-create git commit checkpoint before first propagate_next. User can git revert if propagation goes wrong.

7. **[Scope]** How extensive should test fixtures be for analyze action tests?
   - Options: Minimal 3-doc chain | Full chain fixture | Mock chain loading
   - **Answer:** Minimal 3-doc chain
   - **Rationale:** requirements.md + functions-list.md + basic-design.md with 2-3 IDs each. Enough to test without maintenance burden.

#### Confirmed Decisions
- YAML persistence: use `yaml` package — safer for nested data
- propagate_next: instruction-only — no auto-regeneration
- Tool split: proactive — change-request.ts + cr-actions.ts
- Create action: manual IDs + optional auto-detect via diff
- CHAIN_PAIRS export: direct export from cross-ref-linker.ts
- Safety: git commit checkpoint before first propagation step
- Tests: minimal 3-doc chain fixtures

#### Action Items
- [ ] Phase 1: Switch from manual YAML to `yaml` package for CR persistence
- [ ] Phase 3: Split tool into change-request.ts (schema+dispatch) + cr-actions.ts (handlers)
- [ ] Phase 3: Add optional old_content/new_content params to create action for auto-detect
- [ ] Phase 3: Add git commit checkpoint logic in propagate_next (first call only)
- [ ] Phase 5: Create minimal 3-doc chain fixture (requirements + functions-list + basic-design)

#### Impact on Phases
- Phase 1: Use `yaml` package instead of manual parse/serialize. Simpler readCR/writeCR implementations.
- Phase 3: Split into 2 files (change-request.ts + cr-actions.ts). Add old_content/new_content to create schema. Add git checkpoint to propagate_next.
- Phase 5: Create tests/fixtures/cr-test/ with 3 minimal doc files + config.yaml.
