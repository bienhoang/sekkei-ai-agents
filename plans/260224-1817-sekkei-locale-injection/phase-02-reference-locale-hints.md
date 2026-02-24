# Phase 2: Reference Docs Locale Hints

**Parent:** [plan.md](./plan.md)
**Status:** completed
**Priority:** P2
**Effort:** 20min
**Completed:** 2026-02-24

## Overview

Add locale reminder header to all 12 reference docs in `packages/skills/content/references/`.

## Key Insights

- 12 reference files, each starts with `# Title` then `Parent:` line
- These are instructions for Claude, not user-facing content
- Adding locale hint reinforces the SKILL.md directive when Claude reads reference docs mid-workflow

## Requirements

### Functional
- Add one-line locale hint at top of each reference file
- Hint must not interfere with existing content structure

### Non-functional
- Consistent format across all 12 files
- Minimal size impact (1 line per file)

## Related Code Files

### Modify (all 12 files)
- `packages/skills/content/references/doc-standards.md`
- `packages/skills/content/references/rfp-loop.md`
- `packages/skills/content/references/v-model-guide.md`
- `packages/skills/content/references/phase-requirements.md`
- `packages/skills/content/references/phase-supplementary.md`
- `packages/skills/content/references/phase-test.md`
- `packages/skills/content/references/phase-design.md`
- `packages/skills/content/references/change-request-command.md`
- `packages/skills/content/references/plan-orchestrator.md`
- `packages/skills/content/references/rfp-manager.md`
- `packages/skills/content/references/rfp-command.md`
- `packages/skills/content/references/utilities.md`

## Implementation Steps

### Step 1: Add Locale Hint to Each File

Insert as the FIRST line of each file (before the `# Title`):

```markdown
> 📌 All user-facing output must use `project.language` from `sekkei.config.yaml`. See SKILL.md §Output Language.

```

Note: blank line after the blockquote before the existing `# Title`.

### Step 2: Verify

- Each file starts with the locale hint line
- Original content unchanged below the hint
- No duplicate hints

## Todo

- [x] Add hint to `doc-standards.md`
- [x] Add hint to `rfp-loop.md`
- [x] Add hint to `v-model-guide.md`
- [x] Add hint to `phase-requirements.md`
- [x] Add hint to `phase-supplementary.md`
- [x] Add hint to `phase-test.md`
- [x] Add hint to `phase-design.md`
- [x] Add hint to `change-request-command.md`
- [x] Add hint to `plan-orchestrator.md`
- [x] Add hint to `rfp-manager.md`
- [x] Add hint to `rfp-command.md`
- [x] Add hint to `utilities.md`

## Success Criteria

- All 12 reference files have locale hint as first line
- No content modified below the hint
- Consistent format across all files

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hint parsed as doc content | Low | Blockquote clearly marked as directive |
| Skill loader strips first line | Low | Test after install with /sekkei:rebuild |

## Next Steps

→ Rebuild skill with `/sekkei:rebuild` and test locale behavior
