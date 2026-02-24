# Phase 03: RFP Instruction Resources (rfp://)

## Context
- Parent: [plan.md](./plan.md)
- Depends on: None (parallel with Phase 01-02)
- Pattern: Follow `resources/templates.ts` (ResourceTemplate with URI params)

## Overview
- **Priority:** P2
- **Status:** ✅ Complete
- **Description:** Register rfp:// MCP resources serving analysis prompts from template files

## Key Insights
- MCP resources are read-only — perfect for serving instruction prompts
- Content migrated from rfp-loop.md (6 flows) + rfp-command.md (routing table)
- ResourceTemplate pattern supports URI params: `rfp://instructions/{flow_name}`
- Each editor reads resources to get analysis instructions — no duplication

## Requirements
- 7 rfp:// resource URIs registered
- Content loaded from `templates/rfp/` directory
- List endpoint returns all available instruction resources
- Read endpoint returns markdown content for specific flow

## Architecture

```
resources/rfp-instructions.ts (~50 LOC)
├── registerRfpResources(server, templateDir)
│   ├── ResourceTemplate("rfp://instructions/{flow}")
│   │   ├── list() → 7 resources (analyze, questions, draft, impact, proposal, freeze, routing)
│   │   └── read(uri, params) → markdown content from templates/rfp/
│   └── server.resource("rfp-instructions", template, handler)

templates/rfp/ (7 files, migrated from rfp-loop.md)
├── flow-analyze.md       ← Flow 1 from rfp-loop.md
├── flow-questions.md     ← Flow 2
├── flow-draft.md         ← Flow 3
├── flow-impact.md        ← Flow 4
├── flow-proposal.md      ← Flow 5
├── flow-freeze.md        ← Flow 6
└── routing.md            ← Phase→flow mapping from rfp-command.md
```

## Related Code Files
- **Create:** `sekkei/packages/mcp-server/src/resources/rfp-instructions.ts`
- **Create:** `sekkei/packages/mcp-server/templates/rfp/` (7 MD files)
- **Modify:** `sekkei/packages/mcp-server/src/resources/index.ts` — add registration

## Implementation Steps

1. Create `templates/rfp/` directory with 7 files:
   - Extract Flow 1-6 content from `rfp-loop.md` into individual files
   - Extract routing table from `rfp-command.md` into `routing.md`
   - Each file is self-contained markdown with role, constraints, output format

2. Create `resources/rfp-instructions.ts`:
   ```typescript
   const RFP_FLOWS = ["analyze", "questions", "draft", "impact", "proposal", "freeze", "routing"] as const;

   const template = new ResourceTemplate("rfp://instructions/{flow}", {
     list: async () => ({
       resources: RFP_FLOWS.map(flow => ({
         uri: `rfp://instructions/${flow}`,
         name: `RFP ${flow} instructions`,
         description: `Analysis instructions for RFP ${flow} phase`,
         mimeType: "text/markdown",
       })),
     }),
   });
   ```

3. Implement resource read handler:
   - Validate `flow` param against `RFP_FLOWS` enum
   - Load file from `{templateDir}/rfp/flow-{flow}.md`
   - Return markdown content

4. Update `resources/index.ts`:
   - Import `registerRfpResources`
   - Add to `registerAllResources()` function

## Content Migration Guide

| Source (rfp-loop.md) | Target (templates/rfp/) |
|----------------------|------------------------|
| "## Flow 1: Deep Analysis" section | `flow-analyze.md` |
| "## Flow 2: Q&A Generation" section | `flow-questions.md` |
| "## Flow 3: Wait or Draft" section | `flow-draft.md` |
| "## Flow 4: Answer Impact" section | `flow-impact.md` |
| "## Flow 5: Proposal" section | `flow-proposal.md` |
| "## Flow 6: Scope Freeze" section | `flow-freeze.md` |
| rfp-command.md routing table | `routing.md` |

Each file preserves:
- Role declaration ("You are an elite presales analysis engine")
- Hard constraints
- Output format specifications
- Section structure requirements

## Todo List
- [ ] Create templates/rfp/ directory
- [ ] Migrate Flow 1 → flow-analyze.md
- [ ] Migrate Flow 2 → flow-questions.md
- [ ] Migrate Flow 3 → flow-draft.md
- [ ] Migrate Flow 4 → flow-impact.md
- [ ] Migrate Flow 5 → flow-proposal.md
- [ ] Migrate Flow 6 → flow-freeze.md
- [ ] Create routing.md from rfp-command.md
- [ ] Create rfp-instructions.ts resource handler
- [ ] Register in resources/index.ts
- [ ] Verify resources load correctly

## Success Criteria
- `rfp://instructions/analyze` returns Flow 1 content
- All 7 resources listed in resource discovery
- Content identical to original rfp-loop.md flows
- Under 50 LOC for registration code

## Risk Assessment
- **Template dir resolution:** Must handle both dev and installed paths (follow existing template-loader pattern)
- **Content drift:** Original rfp-loop.md kept as backup — can diff if needed

## Security Considerations
- Flow name validated against enum (no arbitrary file access)
- Template path uses containment check (same as existing template-resolver)

## Next Steps
→ Phase 04 updates adapter files to use tool + resources
