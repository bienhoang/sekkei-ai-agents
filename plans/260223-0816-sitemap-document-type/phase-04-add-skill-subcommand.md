# Phase 4: Add SKILL.md Sub-command

## Context

- [Plan](./plan.md)
- File: `sekkei/packages/skills/content/SKILL.md`
- Reference pattern: `/sekkei:matrix` sub-command (lines ~313-332)

## Overview

- **Priority**: Medium
- **Status**: pending
- **Description**: Add `/sekkei:sitemap` sub-command to SKILL.md following the same step-by-step workflow pattern as `/sekkei:matrix`.

## Key Insights

- Sub-commands follow pattern: Interview questions → Read upstream docs → Call MCP tool → Save output → Report
- `/sekkei:matrix` is closest reference — it's also an auxiliary doc with upstream dependencies
- Sitemap should ask about system type to tailor the output

## Requirements

### Functional
- Add `/sekkei:sitemap` section to SKILL.md
- Interview questions: system type (web/mobile/API/etc.), scope (full system or specific module)
- Steps: read functions-list if available → call `generate_document` with `doc_type: "sitemap"` → save to output dir → optionally export

### Non-functional
- Follow exact formatting pattern of existing sub-commands
- Keep concise (under 20 lines)

## Related Code Files

- **Modify**: `sekkei/packages/skills/content/SKILL.md`
  - Add after `/sekkei:matrix` section (around line 332)

## Implementation Steps

1. Open `SKILL.md`
2. Add `/sekkei:sitemap` section after `/sekkei:matrix`:

```markdown
### `/sekkei:sitemap`

**Interview questions (ask before generating):**
- System type? (web/mobile/API/internal system/SaaS)
- Scope? (full system or specific module/feature)
- Functions-list available? (for F-xxx cross-references)

1. If functions-list exists, read `functions-list.md` to extract F-xxx IDs
2. If source code available, analyze routes/pages structure for reference
3. Call MCP tool `generate_document` with `doc_type: "sitemap"`, include:
   - User's system description as `input_content`
   - Functions-list content as `upstream_content` (if available)
   - Code analysis results (if available)
4. AI generates: tree structure (hierarchical list) + page list table (PG-xxx IDs)
5. Save to `./sekkei-docs/sitemap.md`
6. Optionally call `export_document` with `doc_type: "sitemap"`, `format: "xlsx"` or `"pdf"`
7. Report: file path, total pages/screens count, hierarchy depth
```

## Todo List

- [ ] Add `/sekkei:sitemap` sub-command to SKILL.md
- [ ] Verify formatting matches other sub-commands

## Success Criteria

- Sub-command follows same pattern as `/sekkei:matrix`
- Interview questions cover key decisions (system type, scope)
- Steps are clear and actionable

## Risk Assessment

- **Low risk**: Additive change to skill definition file
- SKILL.md is a documentation file — no compile/runtime risk

## Next Steps

- Phase 5: Build & test
