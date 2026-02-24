# Phase 3: Adapter Sync

**Parent:** [plan.md](./plan.md)
**Depends on:** Phase 2 (skill flow must be finalized first)

## Overview
- **Priority:** P2
- **Status:** complete
- **Description:** Mirror Phase 2 changes to adapter SKILL.md

## Related Code Files

| File | Action | Lines |
|------|--------|-------|
| `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md` | Edit security-design (L285-301) | Replace workflow |
| `sekkei/packages/mcp-server/adapters/claude-code/SKILL.md` | Edit test-plan (L322-338) | Replace workflow |

## Implementation Steps

### security-design (L285-301)

Mirror Phase 2 changes. Current:
- No prerequisite check
- 6 steps, cross-ref only API/SCR/TBL
- No validate step, no next steps

Update to:
- Add prerequisite check (basic-design must exist)
- Load requirements + nfr + basic-design as upstream
- Cross-ref: REQ-xxx, NFR-xxx, API-xxx, SCR-xxx, TBL-xxx
- Add validate step (step 7)
- Add next steps (step 8)

### test-plan (L322-338)

Mirror Phase 2 changes. Current:
- No prerequisite check
- 6 steps, cross-ref only REQ/NFR
- No validate step, no next steps

Update to:
- Add prerequisite check (requirements must be complete)
- Load requirements + nfr + basic-design as upstream
- Cross-ref: REQ-xxx, F-xxx, NFR-xxx
- Add validate step (step 7)
- Add next steps (step 8)

## Todo

- [ ] Update security-design section in adapter SKILL.md
- [ ] Update test-plan section in adapter SKILL.md
- [ ] Verify both adapter sections match skills/content/references/ versions

## Success Criteria
- Adapter SKILL.md security-design = phase-design.md security-design (same steps, same cross-refs)
- Adapter SKILL.md test-plan = phase-test.md test-plan (same steps, same cross-refs)
