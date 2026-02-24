# Phase 02: manage_rfp_workspace MCP Tool

## Context
- Parent: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-state-machine-library.md) (state machine library)
- Pattern: Follow `tools/glossary.ts` (action-based tool with Zod schema)

## Overview
- **Priority:** P1 (blocks Phase 04)
- **Status:** ✅ Complete
- **Description:** Create MCP tool handler that wraps state machine library for workspace CRUD

## Key Insights
- Follows glossary.ts pattern: single tool with `action` enum param
- 5 actions: create, status, transition, write, read
- Handler delegates to `rfp-state-machine.ts` — thin orchestration layer
- Must return `{ content: [{ type: "text", text }] }` format

## Requirements
- Zod-validated input schema with action enum
- Action-specific optional params (project_name, phase, filename, content)
- SekkeiError for invalid transitions, missing workspaces
- Structured JSON output for status action (parseable by AI agents)

## Architecture

```
rfp-workspace.ts (tool handler, ~120 LOC)
├── inputSchema (Zod)
│   ├── action: enum["create","status","transition","write","read"]
│   ├── workspace_path: string (path to rfp workspace dir)
│   ├── project_name?: string (for create action)
│   ├── phase?: RfpPhase enum (for transition action)
│   ├── filename?: string (for write/read actions)
│   └── content?: string (for write action)
├── handleRfpWorkspace(args) → MCP response
└── registerRfpWorkspaceTool(server) → void
```

## Related Code Files
- **Create:** `sekkei/packages/mcp-server/src/tools/rfp-workspace.ts`
- **Modify:** `sekkei/packages/mcp-server/src/tools/index.ts` — add registration

## Implementation Steps

1. Create `tools/rfp-workspace.ts` with Zod input schema:
   ```typescript
   const inputSchema = {
     action: z.enum(["create", "status", "transition", "write", "read"])
       .describe("Workspace action to perform"),
     workspace_path: z.string().max(500)
       .describe("Path to rfp workspace directory (e.g., ./sekkei-docs/rfp/my-project)"),
     project_name: z.string().max(100).optional()
       .describe("Project name for create action (kebab-case)"),
     phase: z.enum(RFP_PHASES).optional()
       .describe("Target phase for transition action"),
     filename: z.string().max(50).optional()
       .describe("File to read/write (e.g., 02_analysis.md)"),
     content: z.string().max(500_000).optional()
       .describe("Content to write"),
   };
   ```

2. Implement `handleRfpWorkspace(args)`:
   - Switch on `action`:
     - `create`: validate project_name, call `createWorkspace()`
     - `status`: call `readStatus()` + `getFileInventory()`, return JSON
     - `transition`: validate phase, call `validateTransition()` + `writeStatus()`
     - `write`: validate filename, call `writeFile()` with rule enforcement
     - `read`: validate filename, read and return file content

3. Implement `registerRfpWorkspaceTool(server)`:
   ```typescript
   server.tool(
     "manage_rfp_workspace",
     "Manage RFP presales workspace (create, status, transition, write, read)",
     inputSchema,
     async (args) => handleRfpWorkspace(args)
   );
   ```

4. Update `tools/index.ts`:
   - Import `registerRfpWorkspaceTool`
   - Add to `registerAllTools()` function

## Todo List
- [ ] Create rfp-workspace.ts with Zod schema
- [ ] Implement handleRfpWorkspace() with action switch
- [ ] Implement create action
- [ ] Implement status action (JSON output)
- [ ] Implement transition action (with validation)
- [ ] Implement write action (with file rule enforcement)
- [ ] Implement read action
- [ ] Register in tools/index.ts
- [ ] Verify `npm run build` passes

## Success Criteria
- All 5 actions work correctly
- Invalid transitions rejected with clear error
- File write rules enforced (append-only files can't be rewritten)
- Status returns parseable JSON with phase, next_action, file inventory
- Under 150 LOC

## Risk Assessment
- **Path traversal:** workspace_path validated via regex + containment check
- **Large content:** max 500KB via Zod `.max(500_000)`
- **Missing workspace:** clear error message, not silent failure

## Security Considerations
- `workspace_path` validated: no `..` traversal, must be relative or under project root
- `filename` validated: must match known workspace files (00-07)
- `project_name` validated: kebab-case only

## Next Steps
→ Phase 03 adds rfp:// resources for analysis instructions
