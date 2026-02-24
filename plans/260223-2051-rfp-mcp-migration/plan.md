---
title: "Hybrid MCP Migration for /sekkei:rfp"
description: "Move RFP state management into MCP tool, serve analysis prompts as MCP resources for cross-editor reusability"
status: complete
priority: P2
effort: 4h
branch: main
tags: [mcp, rfp, cross-editor, state-machine]
created: 2026-02-23
---

# Hybrid MCP Migration for /sekkei:rfp

## Context

- Brainstorm: [brainstorm-260223-2051-rfp-mcp-migration.md](../reports/brainstorm-260223-2051-rfp-mcp-migration.md)
- Current RFP: 3 markdown reference files (rfp-command.md, rfp-manager.md, rfp-loop.md) — Claude Code only
- Goal: Cross-editor reusability (Cursor, Copilot, Claude Code) via MCP tool + resources

## Architecture Decision

**Hybrid approach:** MCP handles state management (deterministic), MD serves analysis prompts (LLM-driven).

```
Before:  SKILL.md → rfp-command.md → rfp-manager.md → rfp-loop.md (all prompt-based)
After:   Adapter → manage_rfp_workspace (MCP tool) + rfp:// resources (MCP) → LLM analysis
```

## Phases

| Phase | Description | Status | Est. |
|-------|-------------|--------|------|
| [Phase 01](./phase-01-state-machine-library.md) | RFP state machine library | ✅ Complete | 1h |
| [Phase 02](./phase-02-mcp-tool.md) | manage_rfp_workspace MCP tool | ✅ Complete | 1h |
| [Phase 03](./phase-03-mcp-resources.md) | RFP instruction resources (rfp://) | ✅ Complete | 45m |
| [Phase 04](./phase-04-adapter-updates.md) | Adapter updates (SKILL.md, Cursor, Copilot) | ✅ Complete | 30m |
| [Phase 05](./phase-05-tests.md) | Unit tests | ✅ Complete | 45m |

## File Impact Summary

### New Files
- `src/lib/rfp-state-machine.ts` — State machine, phase transitions, file rules (~150 LOC)
- `src/tools/rfp-workspace.ts` — MCP tool handler (~120 LOC)
- `src/resources/rfp-instructions.ts` — Resource registration (~50 LOC)
- `templates/rfp/` — 7 instruction MD files (migrated from rfp-loop.md)
- `tests/unit/rfp-state-machine.test.ts` — State machine tests (~100 LOC)

### Modified Files
- `src/tools/index.ts` — Add rfp-workspace registration
- `src/resources/index.ts` — Add rfp-instructions registration
- `src/types/documents.ts` — Add RFP phase types
- `packages/skills/content/SKILL.md` — Simplify rfp section
- `packages/mcp-server/adapters/cursor/cursorrules.md` — Add rfp orchestration
- `packages/mcp-server/adapters/copilot/copilot-instructions.md` — Add rfp orchestration

### Preserved Files (no change)
- `packages/skills/content/references/rfp-loop.md` — Keep as backup/reference
- `packages/skills/content/references/rfp-manager.md` — Keep as backup/reference
- `packages/skills/content/references/rfp-command.md` — Keep as backup/reference

## Success Criteria
- [ ] `manage_rfp_workspace` tool passes all state transition tests
- [ ] `rfp://` resources return correct instruction content
- [ ] Cursor can orchestrate rfp workflow via MCP
- [ ] Existing Claude Code workflow backward compatible
- [ ] `npm run build` passes
- [ ] `npm test` passes
