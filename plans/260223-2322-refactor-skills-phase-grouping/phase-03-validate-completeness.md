---
phase: 3
name: Validate Completeness
type: validation
status: pending
---

# Phase 3: Validate Completeness

## Smells Targeted

- Ensure no information lost during extraction

## Overview

Verify that every workflow section from the original SKILL.md exists in exactly one reference file, and that SKILL.md correctly routes to each.

## Verification Steps

1. **Content check**: Diff original SKILL.md (pre-refactor) against combined content of all new reference files — every workflow line must appear in exactly one reference
2. **Routing check**: For each of the 30 commands, verify SKILL.md has a routing entry pointing to the correct reference file
3. **Cross-reference check**: Verify all `references/` links in SKILL.md point to real files
4. **Command list check**: Ensure the command index in SKILL.md still lists all 30 commands

## Todo

- [ ] Save original SKILL.md as backup before Phase 2
- [ ] Verify all 30 command workflows exist in reference files
- [ ] Verify all routing entries in SKILL.md
- [ ] Verify no broken references
- [ ] Line count verification: new SKILL.md ~120 lines, total reference content ~600 lines

## Success Criteria

- Zero information loss
- All commands routable from SKILL.md to correct reference
- No broken cross-references
