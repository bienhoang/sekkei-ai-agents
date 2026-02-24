# Phase 04: Adapter Updates

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 02](./phase-02-mcp-tool.md) (tool exists), [Phase 03](./phase-03-mcp-resources.md) (resources exist)
- Adapters: `packages/mcp-server/adapters/` (claude-code, cursor, copilot)

## Overview
- **Priority:** P2
- **Status:** ✅ Complete
- **Description:** Update all 3 editor adapters with thin RFP orchestration layer

## Key Insights
- Each adapter needs same orchestration pattern: call tool for state, read resources for instructions
- SKILL.md (Claude Code) simplifies — removes rfp-manager.md delegation, uses MCP tool instead
- Cursor/Copilot adapters currently have NO rfp support — this adds it
- Orchestration is ~20-30 lines per adapter (routing + tool call pattern)

## Requirements
- Claude Code SKILL.md: simplify rfp section to use MCP tool + resources
- Cursor cursorrules.md: add rfp orchestration section
- Copilot copilot-instructions.md: add rfp orchestration section
- All 3 adapters produce identical workflow behavior

## Architecture

Each adapter gets this orchestration pattern:
```
1. User invokes rfp command
2. Call manage_rfp_workspace(action: "status") → get current phase
3. Read rfp://routing → get phase→flow mapping
4. Read rfp://instructions/{flow} → get analysis instructions
5. Execute analysis (LLM reasoning)
6. Call manage_rfp_workspace(action: "write") → save output
7. Call manage_rfp_workspace(action: "transition") → advance phase
```

## Related Code Files
- **Modify:** `sekkei/packages/skills/content/SKILL.md` — simplify rfp section
- **Modify:** `sekkei/packages/mcp-server/adapters/cursor/cursorrules.md` — add rfp
- **Modify:** `sekkei/packages/mcp-server/adapters/copilot/copilot-instructions.md` — add rfp

## Implementation Steps

1. Update SKILL.md rfp section:
   - Replace current 3-layer delegation (rfp-command → rfp-manager → rfp-loop)
   - New pattern: "Call `manage_rfp_workspace` for state, read `rfp://instructions/{flow}` for analysis"
   - Keep high-level description of 6 flows and 8 phases
   - Remove references to rfp-manager.md for state management (tool handles it now)
   - Keep references to rfp-loop.md as supplementary context (backward compat)

2. Add rfp section to `cursorrules.md`:
   - RFP workflow overview (8 phases, 6 flows)
   - Tool call patterns for each action
   - Resource reading pattern
   - Phase→flow routing table (or reference rfp://routing)

3. Add rfp section to `copilot-instructions.md`:
   - Same content as Cursor adapter
   - Adapted to Copilot instruction format

4. Test each adapter conceptually:
   - Verify tool names match registered MCP tool
   - Verify resource URIs match registered resources
   - Verify phase names match RFP_PHASES enum

## Todo List
- [ ] Read current SKILL.md rfp section
- [ ] Simplify SKILL.md to use MCP tool + resources
- [ ] Add rfp section to cursorrules.md
- [ ] Add rfp section to copilot-instructions.md
- [ ] Cross-verify tool/resource names across all adapters
- [ ] Verify `sekkei update` copies updated SKILL.md correctly

## Success Criteria
- All 3 adapters reference same tool name (`manage_rfp_workspace`)
- All 3 adapters reference same resource URIs (`rfp://instructions/*`)
- SKILL.md no longer delegates to rfp-manager.md for state
- Cursor/Copilot adapters have complete rfp workflow instructions
- Each adapter under 30 lines for rfp section

## Risk Assessment
- **SKILL.md backward compat:** Keep rfp-loop.md reference files — Claude Code can use both MCP + MD
- **Adapter format differences:** Cursor uses cursorrules, Copilot uses markdown instructions — different formatting needed
- **Tool discovery:** Some editors may not auto-discover MCP tools — adapter must explicitly name the tool

## Security Considerations
- No credentials in adapter files
- Tool names and resource URIs are public (by design)

## Next Steps
→ Phase 05 adds unit tests for the full stack
