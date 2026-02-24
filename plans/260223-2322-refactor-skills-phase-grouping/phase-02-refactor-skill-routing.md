---
phase: 2
name: Refactor SKILL.md to Routing Index
type: modification
status: pending
---

# Phase 2: Refactor SKILL.md to Routing Index

## Smells Targeted

- God File → reduced to ~120-line routing index
- Shotgun Surgery → command list and routing in one place

## Overview

Replace inline workflows in SKILL.md with reference pointers. Keep: frontmatter, command index, routing instructions, Document Chain diagram, Split Mode section, References section.

## Files to Modify

- `content/SKILL.md` — rewrite to routing index

## Transformation

### Keep (unchanged)
- YAML frontmatter (lines 1-4)
- Header + description (lines 6-8)
- Command list sections (lines 10-49) — already concise
- Document Chain diagram (lines 675-694)
- Split Mode section (lines 696-723)

### Replace (inline workflows → reference pointers)
Replace the `## Workflow Router` section (lines 51-673) with routing instructions:

```markdown
## Workflow Router

When the user invokes a sub-command, load the corresponding reference file and follow its workflow.

### Project Setup (prerequisite)
[keep existing content — lines 55-63]

### RFP
→ Read `references/rfp-command.md` (routing), `references/rfp-manager.md` (state), `references/rfp-loop.md` (analysis)

### Requirements Phase
→ Read `references/phase-requirements.md`
Commands: functions-list, requirements, nfr, project-plan

### Design Phase
→ Read `references/phase-design.md`
Commands: basic-design, security-design, detail-design

### Test Phase
→ Read `references/phase-test.md`
Commands: test-plan, ut-spec, it-spec, st-spec, uat-spec

### Supplementary
→ Read `references/phase-supplementary.md`
Commands: matrix, sitemap, operation-design, migration-design

### Utilities
→ Read `references/utilities.md`
Commands: validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild
```

### Update References section
Add new phase files to the References list at the bottom.

## Behavior Preservation

- Command invocation unchanged — user still types `/sekkei:requirements`
- Claude reads the reference file on demand (same pattern as RFP)
- All workflow logic preserved in reference files

## Todo

- [ ] Rewrite SKILL.md Workflow Router section
- [ ] Update References section
- [ ] Verify line count ~120

## Success Criteria

- SKILL.md under 150 lines
- All 30 commands have a routing entry
- Reference paths correct and consistent
