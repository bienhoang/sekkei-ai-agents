# Refactoring Analysis Report: sekkei/packages/skills

**Date:** 2026-02-23
**Target:** `sekkei/packages/skills/content/`
**Strategy:** Phase-based grouping

## Smell Analysis

| Severity | Smell | Category | Location | Lines |
|----------|-------|----------|----------|-------|
| Critical | God File | Bloater | SKILL.md | 732 |
| Major | Repeated Pattern | Dispensable | 12 doc-gen commands | ~360 |
| Major | Long Method | Bloater | basic-design, detail-design | 60+42 |
| Minor | Shotgun Surgery | Change Preventer | cmd list + workflow + chain + README | 4 places |
| Minor | Feature Envy | Coupler | Split mode logic inline | ~30 |

## Current Structure

```
content/
├── SKILL.md (732 lines — ALL workflows inline)
└── references/ (817 lines total)
    ├── doc-standards.md (102)
    ├── plan-orchestrator.md (193)
    ├── rfp-command.md (108)
    ├── rfp-loop.md (201)
    ├── rfp-manager.md (151)
    └── v-model-guide.md (62)
```

## Agreed Strategy

Extract command workflows from SKILL.md into 5 phase-based reference files:
- `phase-requirements.md` — functions-list, requirements, nfr, project-plan
- `phase-design.md` — basic-design, security-design, detail-design
- `phase-test.md` — test-plan, ut-spec, it-spec, st-spec, uat-spec
- `phase-supplementary.md` — matrix, sitemap, operation-design, migration-design
- `utilities.md` — validate, status, export, translate, glossary, update, diff-visual, preview, plan, implement, version, uninstall, rebuild

SKILL.md becomes a ~120-line routing index.

## Constraints

- Keep backward compat — all commands work identically
- Don't touch existing RFP files (rfp-command.md, rfp-manager.md, rfp-loop.md)
- Don't touch plan-orchestrator.md, doc-standards.md, v-model-guide.md

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Claude fails to load reference on command invocation | Low | Follow existing RFP pattern which works |
| Information lost during extraction | Low | Diff original vs extracted content |
| Command routing breaks | Low | Test each command entry in SKILL.md |

## Estimated File Sizes (Post-Refactoring)

| File | Est. Lines | Content |
|------|-----------|---------|
| SKILL.md | ~120 | Frontmatter + command index + routing + chain diagram + split mode |
| phase-requirements.md | ~130 | 4 commands (functions-list is longest at ~50 lines) |
| phase-design.md | ~150 | 3 commands (basic-design is longest at ~60 lines) |
| phase-test.md | ~120 | 5 commands (similar pattern, ~20-25 each) |
| phase-supplementary.md | ~100 | 4 commands |
| utilities.md | ~180 | 13 commands (many short, but glossary/export/translate are longer) |
