# Phase 04: Skill Documentation Update

## Context

- Parent: [plan.md](plan.md)
- Depends on: Phases 1-3 (documents behavior changes)
- Target file: `sekkei/packages/skills/content/references/utilities.md`

## Overview

- **Priority**: P3
- **Status**: completed
- **Description**: Update skill documentation to reflect new staleness detection, pre-generate advisory, and improved CHANGELOG logging behaviors.

## Key Insights

- `utilities.md` L6-31 documents `/sekkei:validate` -- needs staleness mention
- `utilities.md` L103-128 documents `/sekkei:update` -- already covers staleness mode; may reference new detection
- Skill docs are user-facing instructions for Claude Code agents executing commands
- Changes should be concise additions, not restructuring

## Requirements

### Functional
- FR1: `/sekkei:validate` docs mention staleness warnings when `config_path` available
- FR2: `/sekkei:validate` (chain mode) mentions chain-wide staleness report
- FR3: Document pre-generate advisory behavior (auto, no user action needed)
- FR4: Document improved CHANGELOG logging scope

### Non-Functional
- NFR1: Keep existing doc structure intact
- NFR2: Additions should be 2-5 lines per section

## Related Code Files

### Modify
- `sekkei/packages/skills/content/references/utilities.md` — L6-38 (validate section), add note after L128 (update section)

## Implementation Steps

1. **Update `/sekkei:validate @doc` section** (after step 7, before step 8)
   - Add step about staleness checking:
   ```markdown
   8. **If `config_path` available**: Check upstream staleness via git timestamps
      - Compare last-modified date of upstream vs downstream docs
      - Display WARNING for docs where upstream changed after downstream was last generated
      - Staleness is advisory only — does not affect validation result
   ```
   - Renumber existing step 8 to step 9

2. **Update `/sekkei:validate` chain mode** (after step 4)
   - Add:
   ```markdown
   5. Display staleness warnings: docs where upstream file is newer than downstream
   ```

3. **Add note to generate behavior** (optional, since it's auto)
   - Could add to utilities.md or to a separate generate reference
   - Simplest: add a brief note in the validate section mentioning the pre-generate guard

4. **Add note about CHANGELOG improvements**
   - Near `/sekkei:update` section or in a general notes area:
   ```markdown
   > **Note**: CR completion now logs ALL propagated documents to `sekkei-docs/CHANGELOG.md`
   > with version extracted from each doc's 改訂履歴 table. Regeneration via `generate_document`
   > also logs with the correct version.
   ```

## Todo

- [x] Update `/sekkei:validate @doc` section with staleness step
- [x] Update `/sekkei:validate` chain mode with staleness mention
- [x] Add CHANGELOG improvement note
- [x] Verify no broken formatting in utilities.md

## Success Criteria

- Skill docs accurately describe new behaviors
- Existing doc structure preserved
- Agent executing `/sekkei:validate` knows to expect staleness warnings

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Docs diverge from implementation | Low | Update docs after implementation verified |

## Security Considerations

- No security impact (documentation only)

## Next Steps

- After all phases complete, run full test suite and verify build
