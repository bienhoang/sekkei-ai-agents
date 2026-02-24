# Phase 2 — Analysis Quality Improvements

## Context Links

- Analysis spec: `sekkei/packages/skills/content/references/rfp-loop.md`
- Flow templates: `sekkei/packages/mcp-server/templates/rfp/flow-*.md`
- MCP resource: `sekkei/packages/mcp-server/src/resources/rfp-instructions.ts`

## Overview

- **Priority:** P2
- **Status:** complete
- **Description:** Enrich RFP analysis templates with structured scoring, effort estimation framework, industry-specific checklists, and better question formatting

## Key Insights

1. **Flow 1 (Analyze) lacks effort estimation.** Complexity Radar scores 7 dimensions 0-5 but never translates to rough person-days. Presales needs ballpark numbers.
2. **Flow 2 (Questions) has no priority ranking.** All 3 groups (Critical/Architecture/Operation) have equal weight. Client doesn't know which to answer first.
3. **Flow 5 (Proposal) misses cost breakdown structure.** Just "delivery phases" without linking to complexity scores.
4. **Flow 6 (Freeze) checklist is static.** Same 6 items regardless of system type. Should adapt: e-commerce needs payment, SaaS needs multi-tenant, etc.
5. **No industry glossary integration.** Sekkei has 15 industry glossaries but RFP analysis doesn't leverage them.
6. **Questions lack numbering.** Hard to reference in email threads without Q-xxx IDs.

## Requirements

### Functional

- FR1: Add effort estimation section to Flow 1 analysis (rough T-shirt sizing per complexity dimension)
- FR2: Add priority ranking (P1/P2/P3) and Q-xxx IDs to generated questions in Flow 2
- FR3: Add dynamic freeze checklist items based on system type classification from Flow 1
- FR4: Add "Technology Risk" section to Flow 1 — flag stack choices with known pitfalls
- FR5: Add cost breakdown skeleton to Flow 5 proposal (phases x effort = estimate)
- FR6: Integrate industry glossary loading hint in Flow 1 when project has `industry` config

### Non-Functional

- NF1: Template changes only — no TypeScript code changes needed (templates are markdown read by MCP resource)
- NF2: Keep templates under 60 lines each for token efficiency
- NF3: Backward-compatible: existing analysis output still valid

## Architecture

No architectural changes. All improvements are in `templates/rfp/flow-*.md` files consumed via `rfp://instructions/{flow}` MCP resource.

### Template Enhancement Strategy

```
flow-analyze.md:  +effort estimation, +tech risk, +industry hint
flow-questions.md: +Q-xxx IDs, +priority ranking, +answer format hint
flow-draft.md:     (no change)
flow-impact.md:    +delta effort impact column
flow-proposal.md:  +cost breakdown skeleton, +assumption risk table
flow-freeze.md:    +dynamic checklist by system type, +handoff readiness score
routing.md:        (no change)
```

## Related Code Files

| Action | File |
|--------|------|
| Modify | `templates/rfp/flow-analyze.md` — add effort estimation, tech risk, industry hint |
| Modify | `templates/rfp/flow-questions.md` — add Q-xxx IDs, priority, answer format |
| Modify | `templates/rfp/flow-impact.md` — add effort delta column |
| Modify | `templates/rfp/flow-proposal.md` — add cost breakdown skeleton |
| Modify | `templates/rfp/flow-freeze.md` — add dynamic checklist, handoff score |
| Modify | `skills/content/references/rfp-loop.md` — sync updated flow descriptions |

## Implementation Steps

1. **flow-analyze.md**: Add section 6 "Effort Estimation" — T-shirt size (S/M/L/XL) per complexity dimension, total range
2. **flow-analyze.md**: Add section 7 "Technology Risk" — flag known pitfalls for detected stack/patterns
3. **flow-analyze.md**: Add note: "If project config has `industry`, load corresponding glossary from `glossaries/{industry}.yaml`"
4. **flow-questions.md**: Add numbering instruction: "Each question gets ID: Q-001, Q-002, ..."
5. **flow-questions.md**: Add priority column to question groups: P1 (must-answer), P2 (should-answer), P3 (nice-to-know)
6. **flow-questions.md**: Add "Preferred answer format" hint per question (yes/no, choice list, free text, number)
7. **flow-impact.md**: Add "Effort Delta" column to Answer Impact table
8. **flow-proposal.md**: Add "Cost Breakdown" section skeleton with phase/effort/risk columns
9. **flow-freeze.md**: Add conditional checklist items based on system type (from analysis)
10. **flow-freeze.md**: Add "Handoff Readiness Score" (0-100) formula based on checklist completion
11. **rfp-loop.md**: Sync all changes to skill reference doc

## Todo List

- [x] Update flow-analyze.md with effort estimation and tech risk sections
- [x] Update flow-questions.md with Q-xxx IDs, priority, answer format
- [x] Update flow-impact.md with effort delta column
- [x] Update flow-proposal.md with cost breakdown skeleton
- [x] Update flow-freeze.md with dynamic checklist and handoff score
- [x] Sync rfp-loop.md skill reference
- [x] Verify templates stay under 60 lines each

## Success Criteria

- Analysis output includes effort T-shirt sizes
- Questions have Q-xxx IDs and P1/P2/P3 priorities
- Proposal includes cost breakdown skeleton
- Freeze checklist adapts to detected system type
- All templates remain concise (under 60 lines)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Templates too long, waste tokens | Medium | Strict 60-line limit; use terse instructions |
| Effort estimates set unrealistic expectations | Medium | Clearly label as "rough presales estimate, not commitment" |
| Dynamic checklist too complex for LLM | Low | Provide explicit mapping table, not open-ended logic |

## Security Considerations

- No security changes; templates are read-only markdown
- Industry glossary loading uses existing whitelisted paths

## Next Steps

- Phase 4 uses enriched analysis for better V-model handoff
- Effort estimates feed into project-plan generation downstream
