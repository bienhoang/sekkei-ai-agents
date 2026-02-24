---
phase: 1
name: Extract Phase Reference Files
type: extraction
status: pending
---

# Phase 1: Extract Phase Reference Files

## Smells Targeted

- God File (SKILL.md 732 lines)
- Repeated Pattern (12 doc-gen commands with identical structure)

## Overview

Create 5 new reference files by extracting workflow sections verbatim from SKILL.md. No content modifications — pure extraction.

## Files to Create

### 1. `references/phase-requirements.md`
Extract from SKILL.md lines 92-320:
- `/sekkei:functions-list @input` (lines 92-141)
- `/sekkei:requirements @input` (lines 142-161)
- `/sekkei:nfr @requirements` (lines 267-283)
- `/sekkei:project-plan @requirements` (lines 303-320)

### 2. `references/phase-design.md`
Extract from SKILL.md:
- `/sekkei:basic-design @input` (lines 162-222)
- `/sekkei:detail-design @input` (lines 224-265)
- `/sekkei:security-design @basic-design` (lines 285-301)

### 3. `references/phase-test.md`
Extract from SKILL.md:
- `/sekkei:test-plan @requirements` (lines 322-338)
- `/sekkei:ut-spec @detail-design` (lines 340-358)
- `/sekkei:it-spec @basic-design` (lines 360-376)
- `/sekkei:st-spec @basic-design` (lines 378-394)
- `/sekkei:uat-spec @requirements` (lines 396-412)

### 4. `references/phase-supplementary.md`
Extract from SKILL.md:
- `/sekkei:operation-design @input` (lines 414-431)
- `/sekkei:migration-design @input` (lines 433-450)
- `/sekkei:matrix` (lines 452-471)
- `/sekkei:sitemap` (lines 473-489)

### 5. `references/utilities.md`
Extract from SKILL.md:
- `/sekkei:validate @doc` (lines 491-507)
- `/sekkei:status` (lines 509-515)
- `/sekkei:export @doc` (lines 517-531)
- `/sekkei:translate @doc` (lines 533-560)
- `/sekkei:glossary` (lines 562-571)
- `/sekkei:update @doc` (lines 573-580)
- `/sekkei:diff-visual` (lines 582-593)
- `/sekkei:preview` (lines 595-616)
- `/sekkei:plan @doc-type` (lines 618-632)
- `/sekkei:implement @plan-path` (lines 634-651)
- `/sekkei:version` (lines 653-658)
- `/sekkei:uninstall` (lines 660-665)
- `/sekkei:rebuild` (lines 667-673)

## Transformation Sequence

1. Create each file with a brief header describing the phase
2. Copy workflow sections verbatim (preserve exact formatting)
3. Add a back-reference to SKILL.md at the top of each file

## Behavior Preservation

- Zero content changes — exact text extraction
- All MCP tool calls, ID formats, rules, save paths preserved
- Interview questions preserved verbatim

## Todo

- [ ] Create `references/phase-requirements.md`
- [ ] Create `references/phase-design.md`
- [ ] Create `references/phase-test.md`
- [ ] Create `references/phase-supplementary.md`
- [ ] Create `references/utilities.md`

## Success Criteria

- All 5 files created with correct content
- Combined line count of extracted content matches original SKILL.md workflow sections
